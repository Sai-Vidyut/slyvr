from __future__ import annotations

from typing import Optional, Tuple

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models import Library, User


def ensure_user_and_personal_library(
    db: Session,
    *,
    user_id: str,
    email: Optional[str],
    display_name: Optional[str] = None,
) -> Tuple[User, Library]:
    """
    Idempotent: upsert local user from Supabase identity and ensure one personal library.
    """
    resolved_email = (email or "").strip() or f"{user_id}@users.slyvr.local"

    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            user = User(
                id=user_id,
                email=resolved_email,
                display_name=display_name or resolved_email.split("@")[0],
            )
            db.add(user)
            db.flush()
        else:
            if email and user.email != resolved_email:
                user.email = resolved_email
            if display_name and not user.display_name:
                user.display_name = display_name
            db.flush()

        library = (
            db.query(Library)
            .filter(Library.type == "personal", Library.owner_user_id == user.id)
            .first()
        )
        if library is None:
            library = Library(
                type="personal",
                owner_user_id=user.id,
                workspace_id=None,
                name="Personal",
            )
            db.add(library)
            db.flush()

        db.commit()
        db.refresh(user)
        db.refresh(library)
        return user, library
    except IntegrityError:
        db.rollback()
        user = db.query(User).filter(User.id == user_id).first()
        library = (
            db.query(Library)
            .filter(Library.type == "personal", Library.owner_user_id == user_id)
            .first()
        )
        if user is None or library is None:
            raise
        return user, library
