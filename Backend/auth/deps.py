from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from auth.config import get_settings
from auth.jwt import verify_supabase_jwt
from database import SessionLocal
from models import Library, User, WorkspaceMember
from services.user_service import ensure_user_and_personal_library

security = HTTPBearer(auto_error=False)

ROLE_OWNER = "owner"
ROLE_ADMIN = "admin"
ROLE_MEMBER = "member"

ROLE_RANK = {
    ROLE_MEMBER: 1,
    ROLE_ADMIN: 2,
    ROLE_OWNER: 3,
}


@dataclass(frozen=True)
class ActiveLibraryContext:
    user: User
    library: Library
    workspace_id: Optional[int]
    role: str  # owner for personal; membership role for workspace; "dev" for legacy


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _extract_bearer(
    credentials: Optional[HTTPAuthorizationCredentials],
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


def get_current_user(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Depends(security)
    ] = None,
    db: Session = Depends(get_db),
) -> User:
    token = _extract_bearer(credentials)
    verified = verify_supabase_jwt(token)
    meta = verified.claims.get("user_metadata")
    display_name = None
    if isinstance(meta, dict):
        display_name = meta.get("display_name") or meta.get("full_name")
    user, _library = ensure_user_and_personal_library(
        db,
        user_id=verified.user_id,
        email=verified.email,
        display_name=display_name if isinstance(display_name, str) else None,
    )
    return user


def _authorize_library(db: Session, user: User, library: Library) -> ActiveLibraryContext:
    if library.type == "personal":
        if library.owner_user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized for this library",
            )
        return ActiveLibraryContext(
            user=user,
            library=library,
            workspace_id=None,
            role=ROLE_OWNER,
        )

    if library.type == "workspace":
        if library.workspace_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized for this library",
            )
        membership = (
            db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == library.workspace_id,
                WorkspaceMember.user_id == user.id,
            )
            .first()
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized for this library",
            )
        return ActiveLibraryContext(
            user=user,
            library=library,
            workspace_id=library.workspace_id,
            role=membership.role,
        )

    if library.type == "legacy":
        if not get_settings().legacy_library_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized for this library",
            )
        return ActiveLibraryContext(
            user=user,
            library=library,
            workspace_id=None,
            role="dev",
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized for this library",
    )


def get_active_library_context(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_library_id: Annotated[Optional[str], Header(alias="X-Library-Id")] = None,
) -> ActiveLibraryContext:
    """
    Resolve active library from X-Library-Id (optional).

    - Missing header → caller's personal library
    - Present but unauthorized / unknown → 403 (never silent fallback)
    """
    if x_library_id is None or str(x_library_id).strip() == "":
        personal = (
            db.query(Library)
            .filter(Library.type == "personal", Library.owner_user_id == user.id)
            .first()
        )
        if not personal:
            _, personal = ensure_user_and_personal_library(
                db,
                user_id=user.id,
                email=user.email,
                display_name=user.display_name,
            )
        return ActiveLibraryContext(
            user=user,
            library=personal,
            workspace_id=None,
            role=ROLE_OWNER,
        )

    try:
        library_id = int(str(x_library_id).strip())
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for this library",
        ) from exc

    library = db.query(Library).filter(Library.id == library_id).first()
    if not library:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for this library",
        )

    return _authorize_library(db, user, library)


def require_workspace_role(*allowed_roles: str):
    """Dependency factory: require workspace context with one of the given roles."""

    def _dependency(
        ctx: ActiveLibraryContext = Depends(get_active_library_context),
    ) -> ActiveLibraryContext:
        if ctx.workspace_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Workspace context required",
            )
        if ctx.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient workspace role",
            )
        return ctx

    return _dependency


def assert_min_role(role: str, minimum: str) -> None:
    if ROLE_RANK.get(role, 0) < ROLE_RANK.get(minimum, 99):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient workspace role",
        )
