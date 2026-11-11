from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth.deps import ActiveLibraryContext, get_active_library_context, get_current_user, get_db
from models import User
from schemas.clip_schema import LibrarySummary, MeResponse, UserResponse
from services.library_service import list_libraries_for_user

router = APIRouter(prefix="/me", tags=["me"])


def _library_summary(item: dict) -> LibrarySummary:
    return LibrarySummary(**item)


@router.get("", response_model=MeResponse)
def read_me(
    user: User = Depends(get_current_user),
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    libraries = list_libraries_for_user(db, user)
    active = {
        "id": ctx.library.id,
        "type": ctx.library.type,
        "name": ctx.library.name
        if ctx.library.type != "workspace"
        else next(
            (lib["name"] for lib in libraries if lib["id"] == ctx.library.id),
            ctx.library.name,
        ),
        "workspace_id": ctx.workspace_id,
        "role": ctx.role,
    }
    return MeResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
        ),
        libraries=[_library_summary(item) for item in libraries],
        active_library=_library_summary(active),
    )


@router.get("/libraries", response_model=List[LibrarySummary])
def read_libraries(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [_library_summary(item) for item in list_libraries_for_user(db, user)]
