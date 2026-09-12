from __future__ import annotations

import re
from datetime import datetime
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from auth.deps import ROLE_ADMIN, ROLE_MEMBER, ROLE_OWNER, assert_min_role
from auth.join_codes import generate_join_code, verify_join_code
from models import Library, User, Workspace, WorkspaceMember

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(name: str) -> str:
    base = _SLUG_RE.sub("-", name.strip().lower()).strip("-") or "workspace"
    return base[:80]


def _unique_slug(db: Session, name: str) -> str:
    base = _slugify(name)
    candidate = base
    n = 2
    while db.query(Workspace).filter(Workspace.slug == candidate).first():
        candidate = f"{base}-{n}"
        n += 1
    return candidate


def create_workspace(
    db: Session,
    *,
    user: User,
    name: str,
) -> Tuple[Workspace, Library, str]:
    """
    Atomically create workspace + owner membership + library + join code.
    Returns (workspace, library, raw_join_code).
    """
    clean_name = (name or "").strip()
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace name is required",
        )

    code = generate_join_code()
    workspace = Workspace(
        name=clean_name,
        slug=_unique_slug(db, clean_name),
        created_by_user_id=user.id,
        join_code_hash=code.code_hash,
        join_code_prefix=code.prefix,
        join_code_created_at=code.created_at,
        join_code_revoked_at=None,
    )
    db.add(workspace)
    db.flush()

    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        role=ROLE_OWNER,
    )
    db.add(member)

    library = Library(
        type="workspace",
        owner_user_id=None,
        workspace_id=workspace.id,
        name=clean_name,
    )
    db.add(library)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create workspace",
        ) from exc

    db.refresh(workspace)
    db.refresh(library)
    return workspace, library, code.raw_code


def join_workspace_with_code(
    db: Session,
    *,
    user: User,
    raw_code: str,
) -> Tuple[Workspace, Library]:
    code = (raw_code or "").strip()
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Join code is required",
        )

    # Scan workspaces with an active (non-revoked, non-null) hash.
    # Membership size is small; verify with hmac.compare_digest per candidate.
    candidates = (
        db.query(Workspace)
        .filter(
            Workspace.join_code_hash.isnot(None),
            Workspace.join_code_revoked_at.is_(None),
        )
        .all()
    )

    workspace: Optional[Workspace] = None
    for candidate in candidates:
        if verify_join_code(code, candidate.join_code_hash):
            workspace = candidate
            break

    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or revoked join code",
        )

    existing = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == user.id,
        )
        .first()
    )
    if existing is None:
        db.add(
            WorkspaceMember(
                workspace_id=workspace.id,
                user_id=user.id,
                role=ROLE_MEMBER,
            )
        )
        db.commit()

    library = (
        db.query(Library)
        .filter(Library.type == "workspace", Library.workspace_id == workspace.id)
        .first()
    )
    if library is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Workspace library missing",
        )

    db.refresh(workspace)
    return workspace, library


def get_workspace_for_library(
    db: Session,
    workspace_id: int,
) -> Workspace:
    workspace = (
        db.query(Workspace)
        .options(joinedload(Workspace.members), joinedload(Workspace.library))
        .filter(Workspace.id == workspace_id)
        .first()
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


def regenerate_join_code(
    db: Session,
    *,
    workspace: Workspace,
    actor_role: str,
) -> str:
    assert_min_role(actor_role, ROLE_ADMIN)
    code = generate_join_code()
    workspace.join_code_hash = code.code_hash
    workspace.join_code_prefix = code.prefix
    workspace.join_code_created_at = code.created_at
    workspace.join_code_revoked_at = None
    db.commit()
    db.refresh(workspace)
    return code.raw_code


def revoke_join_code(
    db: Session,
    *,
    workspace: Workspace,
    actor_role: str,
) -> None:
    assert_min_role(actor_role, ROLE_ADMIN)
    workspace.join_code_hash = None
    workspace.join_code_prefix = None
    workspace.join_code_revoked_at = datetime.utcnow()
    db.commit()


def delete_workspace(
    db: Session,
    *,
    workspace: Workspace,
    actor_role: str,
) -> None:
    assert_min_role(actor_role, ROLE_OWNER)
    # Clips remain until explicit media cleanup; for MVP delete membership+workspace+library meta
    # Prefer fail-safe: refuse if library still has clips
    library = workspace.library
    if library is not None:
        from models import Clip

        clip_count = db.query(Clip).filter(Clip.library_id == library.id).count()
        if clip_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workspace still contains media; remove clips before deleting",
            )
        db.delete(library)
    db.delete(workspace)
    db.commit()


def list_members(db: Session, workspace_id: int) -> list[dict]:
    rows = (
        db.query(WorkspaceMember)
        .options(joinedload(WorkspaceMember.user))
        .filter(WorkspaceMember.workspace_id == workspace_id)
        .all()
    )
    return [
        {
            "user_id": row.user_id,
            "email": row.user.email if row.user else None,
            "display_name": row.user.display_name if row.user else None,
            "role": row.role,
            "joined_at": row.joined_at,
        }
        for row in rows
    ]
