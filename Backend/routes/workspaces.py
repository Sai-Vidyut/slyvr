from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth.deps import (
    ROLE_OWNER,
    ActiveLibraryContext,
    get_active_library_context,
    get_current_user,
    get_db,
)
from models import User
from schemas.clip_schema import (
    CreateWorkspaceRequest,
    CreateWorkspaceResponse,
    JoinCodeResponse,
    JoinWorkspaceRequest,
    WorkspaceMemberResponse,
    WorkspaceResponse,
)
from services import workspace_service as ws

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _workspace_payload(
    workspace,
    library_id: int,
    role: str,
    *,
    join_code: str | None = None,
) -> dict:
    active = bool(workspace.join_code_hash) and workspace.join_code_revoked_at is None
    payload = {
        "id": workspace.id,
        "name": workspace.name,
        "slug": workspace.slug,
        "library_id": library_id,
        "role": role,
        "join_code_prefix": workspace.join_code_prefix if active else None,
        "join_code_active": active,
    }
    if join_code is not None:
        payload["join_code"] = join_code
    return payload


@router.post("", response_model=CreateWorkspaceResponse)
def create_workspace(
    data: CreateWorkspaceRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace, library, raw_code = ws.create_workspace(db, user=user, name=data.name)
    return _workspace_payload(workspace, library.id, ROLE_OWNER, join_code=raw_code)


@router.post("/join", response_model=WorkspaceResponse)
def join_workspace(
    data: JoinWorkspaceRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace, library = ws.join_workspace_with_code(db, user=user, raw_code=data.code)
    membership = next(
        (m for m in workspace.members if m.user_id == user.id),
        None,
    )
    role = membership.role if membership else "member"
    # Reload members if relationship wasn't loaded
    if membership is None:
        from models import WorkspaceMember

        row = (
            db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == workspace.id,
                WorkspaceMember.user_id == user.id,
            )
            .first()
        )
        role = row.role if row else "member"
    return _workspace_payload(workspace, library.id, role)


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberResponse])
def members(
    workspace_id: int,
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    if ctx.workspace_id != workspace_id:
        raise HTTPException(status_code=403, detail="Not authorized for this workspace")
    return ws.list_members(db, workspace_id)


@router.post("/{workspace_id}/join-code/regenerate", response_model=JoinCodeResponse)
def regenerate_join_code(
    workspace_id: int,
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    if ctx.workspace_id != workspace_id:
        raise HTTPException(status_code=403, detail="Not authorized for this workspace")
    workspace = ws.get_workspace_for_library(db, workspace_id)
    raw = ws.regenerate_join_code(db, workspace=workspace, actor_role=ctx.role)
    return JoinCodeResponse(
        join_code=raw,
        join_code_prefix=workspace.join_code_prefix,
        join_code_active=True,
    )


@router.post("/{workspace_id}/join-code/revoke", response_model=JoinCodeResponse)
def revoke_join_code(
    workspace_id: int,
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    if ctx.workspace_id != workspace_id:
        raise HTTPException(status_code=403, detail="Not authorized for this workspace")
    workspace = ws.get_workspace_for_library(db, workspace_id)
    ws.revoke_join_code(db, workspace=workspace, actor_role=ctx.role)
    return JoinCodeResponse(
        join_code=None,
        join_code_prefix=None,
        join_code_active=False,
    )


@router.delete("/{workspace_id}")
def delete_workspace(
    workspace_id: int,
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    if ctx.workspace_id != workspace_id:
        raise HTTPException(status_code=403, detail="Not authorized for this workspace")
    workspace = ws.get_workspace_for_library(db, workspace_id)
    ws.delete_workspace(db, workspace=workspace, actor_role=ctx.role)
    return {"detail": "Workspace deleted"}
