"""Authorized short-lived read access for clip media and thumbnails."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException

from auth.config import get_settings
from models import Clip
from services.clip_storage_refs import (
    resolve_stored_object_ref_for_read,
    stored_url_for_purpose,
)
from services.storage import get_storage_service
from services.storage.types import ReadAccess, StoragePurpose


def issue_clip_read_access(clip: Clip, *, library_id: int, purpose: StoragePurpose) -> ReadAccess:
    """
    Issue read access for a clip object in the active library.

    Policy:
    A) Ref-backed Azure → SAS via StorageService.issue_read_url.
    B) Legacy URL with parseable Slyvr Azure path → SAS (host not trusted).
    C) External/non-Azure URL → passthrough stored URL (no server fetch, no Azure sign).
    D) Partial refs → URL/parser fallback as in B/C.
    E) Missing URL and no resolvable ref → 404.
    """
    settings = get_settings()
    storage = get_storage_service()
    ref = resolve_stored_object_ref_for_read(clip, purpose)

    if ref is not None:
        return storage.issue_read_url(
            ref,
            library_id=library_id,
            ttl_seconds=settings.media_read_sas_ttl_seconds,
        )

    url = stored_url_for_purpose(clip, purpose)
    if not url:
        raise HTTPException(status_code=404, detail="Clip media not found")

    # External or otherwise non-signable URL — return as-is for browser compatibility.
    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=settings.media_read_sas_ttl_seconds
    )
    return ReadAccess(url=url, expires_at=expires_at)
