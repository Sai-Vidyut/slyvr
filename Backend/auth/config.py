"""Application configuration for auth, CORS, and legacy access."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import List, Optional


def _split_origins(raw: Optional[str]) -> List[str]:
    if not raw or not raw.strip():
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
            "https://buildwsai.com",
            "https://www.buildwsai.com",
        ]
    return [part.strip() for part in raw.split(",") if part.strip()]


class Settings:
    def __init__(self) -> None:
        self.supabase_url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
        self.supabase_jwt_secret = os.getenv("SUPABASE_JWT_SECRET") or os.getenv(
            "SLYVR_JWT_SECRET", ""
        )
        self.supabase_jwt_audience = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")
        self.join_code_pepper = (
            os.getenv("SLYVR_JOIN_CODE_PEPPER")
            or self.supabase_jwt_secret
            or "dev-pepper"
        )
        self.legacy_library_access = (
            os.getenv("SLYVR_LEGACY_LIBRARY_ACCESS", "").strip().lower()
            in {"1", "true", "yes", "on"}
        )
        self.cors_origins = _split_origins(os.getenv("CORS_ORIGINS"))
        self.auth_test_mode = (
            os.getenv("SLYVR_AUTH_TEST_MODE", "").strip().lower()
            in {"1", "true", "yes", "on"}
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
