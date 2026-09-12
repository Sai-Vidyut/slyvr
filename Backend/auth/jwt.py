from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import jwt
from fastapi import HTTPException, status

from auth.config import get_settings


@dataclass(frozen=True)
class VerifiedToken:
    user_id: str
    email: Optional[str]
    claims: dict[str, Any]


def verify_supabase_jwt(token: str) -> VerifiedToken:
    """Verify a Supabase (or test) JWT and extract the authenticated user id."""
    settings = get_settings()
    secret = settings.supabase_jwt_secret
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        )

    try:
        options = {"require": ["exp", "sub"]}
        claims = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience=settings.supabase_jwt_audience,
            options=options,
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        ) from exc
    except jwt.InvalidAudienceError:
        # Some local/test tokens omit aud; retry without audience when in test mode
        if not settings.auth_test_mode:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token audience",
            )
        try:
            claims = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"require": ["exp", "sub"], "verify_aud": False},
            )
        except jwt.PyJWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            ) from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from exc

    user_id = claims.get("sub")
    if not user_id or not isinstance(user_id, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )

    email = claims.get("email")
    if isinstance(email, str):
        email_value: Optional[str] = email
    else:
        email_value = None

    return VerifiedToken(user_id=user_id, email=email_value, claims=claims)
