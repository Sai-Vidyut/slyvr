from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from auth.config import get_settings


JOIN_CODE_BYTES = 18  # ~24 url-safe chars


@dataclass(frozen=True)
class GeneratedJoinCode:
    raw_code: str
    code_hash: str
    prefix: str
    created_at: datetime


def _pepper() -> bytes:
    return get_settings().join_code_pepper.encode("utf-8")


def hash_join_code(raw_code: str) -> str:
    normalized = raw_code.strip()
    digest = hashlib.sha256(_pepper() + normalized.encode("utf-8")).hexdigest()
    return digest


def generate_join_code() -> GeneratedJoinCode:
    raw = secrets.token_urlsafe(JOIN_CODE_BYTES)
    created = datetime.utcnow()
    return GeneratedJoinCode(
        raw_code=raw,
        code_hash=hash_join_code(raw),
        prefix=raw[:4],
        created_at=created,
    )


def verify_join_code(raw_code: str, stored_hash: Optional[str]) -> bool:
    if not stored_hash or not raw_code:
        return False
    candidate = hash_join_code(raw_code.strip())
    return hmac.compare_digest(candidate, stored_hash)
