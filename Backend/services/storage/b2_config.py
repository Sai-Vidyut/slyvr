"""Backblaze B2 configuration (S3-compatible API). Server-side env only."""

from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

from services.storage.types import StoragePurpose

load_dotenv()

B2_ENDPOINT = (os.getenv("B2_ENDPOINT") or "").strip().rstrip("/")
B2_ACCESS_KEY_ID = (os.getenv("B2_ACCESS_KEY_ID") or "").strip()
B2_SECRET_ACCESS_KEY = (os.getenv("B2_SECRET_ACCESS_KEY") or "").strip()
B2_THUMBNAIL_ACCESS_KEY_ID = (os.getenv("B2_THUMBNAIL_ACCESS_KEY_ID") or "").strip()
B2_THUMBNAIL_SECRET_ACCESS_KEY = (
    os.getenv("B2_THUMBNAIL_SECRET_ACCESS_KEY") or ""
).strip()
B2_BUCKET_NAME = (os.getenv("B2_BUCKET_NAME") or "").strip()
B2_THUMBNAIL_BUCKET_NAME = (os.getenv("B2_THUMBNAIL_BUCKET_NAME") or "").strip()


def credentials_for_bucket(bucket: str) -> tuple[str, str]:
    """Return S3 credentials scoped to the configured bucket (supports per-bucket app keys)."""
    if bucket == B2_THUMBNAIL_BUCKET_NAME:
        key_id = B2_THUMBNAIL_ACCESS_KEY_ID or B2_ACCESS_KEY_ID
        secret = B2_THUMBNAIL_SECRET_ACCESS_KEY or B2_SECRET_ACCESS_KEY
    elif bucket == B2_BUCKET_NAME:
        key_id = B2_ACCESS_KEY_ID
        secret = B2_SECRET_ACCESS_KEY
    else:
        raise ValueError("Invalid bucket for B2 credentials")
    if not key_id or not secret:
        raise ValueError("B2 credentials not configured for bucket")
    return key_id, secret


def is_b2_configured() -> bool:
    if not B2_ENDPOINT or not B2_BUCKET_NAME or not B2_THUMBNAIL_BUCKET_NAME:
        return False
    if not B2_ACCESS_KEY_ID or not B2_SECRET_ACCESS_KEY:
        return False
    thumb_id = B2_THUMBNAIL_ACCESS_KEY_ID or B2_ACCESS_KEY_ID
    thumb_secret = B2_THUMBNAIL_SECRET_ACCESS_KEY or B2_SECRET_ACCESS_KEY
    return bool(thumb_id and thumb_secret)


def require_b2_config() -> None:
    if not is_b2_configured():
        raise ValueError(
            "Backblaze B2 is not fully configured "
            "(B2_ENDPOINT, B2_ACCESS_KEY_ID, B2_SECRET_ACCESS_KEY, "
            "B2_BUCKET_NAME, B2_THUMBNAIL_BUCKET_NAME)"
        )


def bucket_for_purpose(purpose: StoragePurpose) -> str:
    """Map logical purpose to the configured B2 bucket name."""
    if purpose == StoragePurpose.MEDIA:
        if not B2_BUCKET_NAME:
            raise ValueError("B2_BUCKET_NAME environment variable not set")
        return B2_BUCKET_NAME
    if purpose == StoragePurpose.THUMBNAIL:
        if not B2_THUMBNAIL_BUCKET_NAME:
            raise ValueError("B2_THUMBNAIL_BUCKET_NAME environment variable not set")
        return B2_THUMBNAIL_BUCKET_NAME
    raise ValueError(f"Unsupported storage purpose: {purpose}")


@lru_cache
def configured_b2_buckets() -> frozenset[str]:
    buckets: set[str] = set()
    if B2_BUCKET_NAME:
        buckets.add(B2_BUCKET_NAME)
    if B2_THUMBNAIL_BUCKET_NAME:
        buckets.add(B2_THUMBNAIL_BUCKET_NAME)
    return frozenset(buckets)


def unsigned_object_locator(bucket: str, object_key: str) -> str:
    """Construct an unsigned HTTPS locator for a private B2 object (not presigned)."""
    return f"{B2_ENDPOINT}/{bucket}/{object_key}"
