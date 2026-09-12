from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import jwt
from fastapi import HTTPException, status
from jwt import PyJWKClient

from auth.config import get_settings

_jwks_client: Optional[PyJWKClient] = None


@dataclass(frozen=True)
class VerifiedToken:
    user_id: str
    email: Optional[str]
    claims: dict[str, Any]


def _unauthorized(detail: str, exc: Exception | None = None) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
    )


def _get_jwks_client(supabase_url: str) -> PyJWKClient:
    """Cached JWKS client for asymmetric Supabase signing keys (ES256/RS256)."""
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


def _decode_hs256(token: str, secret: str, audience: str, *, auth_test_mode: bool) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience=audience,
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise _unauthorized("Token expired", exc) from exc
    except jwt.InvalidAudienceError:
        # Some local/test tokens omit aud; retry without audience when in test mode
        if not auth_test_mode:
            raise _unauthorized("Invalid token audience")
        try:
            return jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"require": ["exp", "sub"], "verify_aud": False},
            )
        except jwt.PyJWTError as exc:
            raise _unauthorized("Invalid token", exc) from exc
    except jwt.PyJWTError as exc:
        raise _unauthorized("Invalid token", exc) from exc


def _decode_asymmetric(token: str, supabase_url: str, audience: str) -> dict[str, Any]:
    if not supabase_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        )
    try:
        signing_key = _get_jwks_client(supabase_url).get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience=audience,
            issuer=f"{supabase_url.rstrip('/')}/auth/v1",
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise _unauthorized("Token expired", exc) from exc
    except jwt.PyJWTError as exc:
        raise _unauthorized("Invalid token", exc) from exc
    except Exception as exc:  # JWKS fetch / network
        raise _unauthorized("Invalid token", exc) from exc


def verify_supabase_jwt(token: str) -> VerifiedToken:
    """Verify a Supabase (or test) JWT and extract the authenticated user id.

    Supports:
    - ES256/RS256 access tokens via project JWKS (current Supabase signing keys)
    - HS256 tokens via SUPABASE_JWT_SECRET (legacy secret + local tests)
    """
    settings = get_settings()
    secret = settings.supabase_jwt_secret
    if not secret and not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        )

    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as exc:
        raise _unauthorized("Invalid token", exc) from exc

    alg = str(header.get("alg") or "")
    if alg in {"ES256", "RS256"}:
        claims = _decode_asymmetric(token, settings.supabase_url, settings.supabase_jwt_audience)
    elif alg == "HS256":
        if not secret:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication is not configured",
            )
        claims = _decode_hs256(
            token,
            secret,
            settings.supabase_jwt_audience,
            auth_test_mode=settings.auth_test_mode,
        )
    else:
        raise _unauthorized("Invalid token")

    user_id = claims.get("sub")
    if not user_id or not isinstance(user_id, str):
        raise _unauthorized("Invalid token subject")

    email = claims.get("email")
    email_value: Optional[str] = email if isinstance(email, str) else None

    return VerifiedToken(user_id=user_id, email=email_value, claims=claims)
