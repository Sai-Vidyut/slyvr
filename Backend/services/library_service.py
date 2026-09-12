from __future__ import annotations

from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from auth.config import get_settings
from models import Library, User, Workspace, WorkspaceMember


def list_libraries_for_user(db: Session, user: User) -> List[dict]:
    """Libraries visible in the switcher. Legacy never included unless env-gated."""
    results: List[dict] = []

    personal = (
        db.query(Library)
        .filter(Library.type == "personal", Library.owner_user_id == user.id)
        .first()
    )
    if personal:
        results.append(
            {
                "id": personal.id,
                "type": personal.type,
                "name": personal.name,
                "workspace_id": None,
                "role": "owner",
            }
        )

    memberships = (
        db.query(WorkspaceMember)
        .options(joinedload(WorkspaceMember.workspace).joinedload(Workspace.library))
        .filter(WorkspaceMember.user_id == user.id)
        .all()
    )
    for membership in memberships:
        workspace = membership.workspace
        library = workspace.library if workspace else None
        if not library:
            continue
        results.append(
            {
                "id": library.id,
                "type": library.type,
                "name": workspace.name,
                "workspace_id": workspace.id,
                "role": membership.role,
            }
        )

    if get_settings().legacy_library_access:
        legacy = db.query(Library).filter(Library.type == "legacy").first()
        if legacy:
            results.append(
                {
                    "id": legacy.id,
                    "type": legacy.type,
                    "name": legacy.name,
                    "workspace_id": None,
                    "role": "dev",
                }
            )

    return results


def get_library_by_id(db: Session, library_id: int) -> Optional[Library]:
    return db.query(Library).filter(Library.id == library_id).first()
