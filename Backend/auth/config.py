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
            "https://buildwsai.online",
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
        raw_max = (os.getenv("SLYVR_MAX_UPLOAD_BYTES") or "").strip()
        if raw_max.isdigit():
            self.max_upload_bytes = max(1, int(raw_max))
        else:
            self.max_upload_bytes = 2 * 1024 * 1024 * 1024
        self.signed_media_reads = (
            os.getenv("SLYVR_SIGNED_MEDIA_READS", "").strip().lower()
            in {"1", "true", "yes", "on"}
        )
        # Omit raw blob URLs from API responses — set only with coordinated frontend
        # (VITE_SIGNED_MEDIA_READS=1). Independent of SLYVR_SIGNED_MEDIA_READS so the
        # backend signing flag alone cannot break legacy clients.
        self.hide_direct_media_urls = (
            os.getenv("SLYVR_HIDE_DIRECT_MEDIA_URLS", "").strip().lower()
            in {"1", "true", "yes", "on"}
        )
        raw_ttl = (os.getenv("SLYVR_MEDIA_READ_SAS_TTL_SECONDS") or "").strip()
        if raw_ttl.isdigit():
            ttl = int(raw_ttl)
        else:
            ttl = 3600
        # Bounded TTL: 5 minutes .. 24 hours
        self.media_read_sas_ttl_seconds = max(300, min(ttl, 86400))


@lru_cache
def get_settings() -> Settings:
    return Settings()
