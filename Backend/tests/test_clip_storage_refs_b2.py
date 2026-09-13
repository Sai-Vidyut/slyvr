"""Clip storage ref resolution for B2 structured refs."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from models import Clip  # noqa: E402
from services.clip_read_access import issue_clip_read_access  # noqa: E402
from services.clip_storage_refs import (  # noqa: E402
    clip_media_ref,
    clip_thumbnail_ref,
    resolve_stored_object_ref_for_read,
)
from services.storage.types import PROVIDER_AZURE, PROVIDER_B2, StoragePurpose  # noqa: E402
from fastapi import HTTPException  # noqa: E402

_MEDIA_KEY = "11111111-2222-3333-4444-555555555555.mp4"
_MEDIA_BUCKET = "slyvr-clips-dev"
_THUMB_BUCKET = "slyvr-thumbs-dev"


@pytest.fixture
def b2_env(monkeypatch):
    from services.storage import b2_config

    monkeypatch.setattr(b2_config, "B2_ENDPOINT", "https://s3.us-west-004.backblazeb2.com")
    monkeypatch.setattr(b2_config, "B2_ACCESS_KEY_ID", "kid")
    monkeypatch.setattr(b2_config, "B2_SECRET_ACCESS_KEY", "sec")
    monkeypatch.setattr(b2_config, "B2_BUCKET_NAME", _MEDIA_BUCKET)
    monkeypatch.setattr(b2_config, "B2_THUMBNAIL_BUCKET_NAME", _THUMB_BUCKET)
    b2_config.configured_b2_buckets.cache_clear()


def test_azure_structured_ref_unchanged():
    clip = Clip(
        library_id=1,
        title="t",
        storage_provider=PROVIDER_AZURE,
        media_object_key=_MEDIA_KEY,
        blob_url="https://x/clips/x",
    )
    ref = clip_media_ref(clip)
    assert ref is not None
    assert ref.provider == PROVIDER_AZURE
    assert ref.bucket == "clips"


def test_b2_structured_media_ref(b2_env):
    locator = f"https://s3.us-west-004.backblazeb2.com/{_MEDIA_BUCKET}/{_MEDIA_KEY}"
    clip = Clip(
        library_id=1,
        title="t",
        storage_provider=PROVIDER_B2,
        media_object_key=_MEDIA_KEY,
        blob_url=locator,
    )
    ref = clip_media_ref(clip)
    assert ref is not None
    assert ref.provider == PROVIDER_B2
    assert ref.bucket == _MEDIA_BUCKET
    assert ref.object_key == _MEDIA_KEY


def test_b2_missing_object_key_no_ref(b2_env):
    clip = Clip(
        library_id=1,
        title="t",
        storage_provider=PROVIDER_B2,
        media_object_key=None,
        blob_url=f"https://s3.us-west-004.backblazeb2.com/{_MEDIA_BUCKET}/{_MEDIA_KEY}",
    )
    assert clip_media_ref(clip) is None


def test_b2_does_not_fall_through_to_unsigned_passthrough(b2_env):
    locator = f"https://s3.us-west-004.backblazeb2.com/{_MEDIA_BUCKET}/{_MEDIA_KEY}"
    clip = Clip(
        library_id=1,
        title="t",
        storage_provider=PROVIDER_B2,
        media_object_key=None,
        blob_url=locator,
    )
    assert resolve_stored_object_ref_for_read(clip, StoragePurpose.MEDIA) is None


def test_b2_thumbnail_ref_uses_thumb_bucket(b2_env):
    key = "22222222-3333-4444-5555-666666666666.jpg"
    clip = Clip(
        library_id=1,
        title="t",
        storage_provider=PROVIDER_B2,
        thumbnail_object_key=key,
        blob_url="x",
        thumbnail_url=f"https://s3.us-west-004.backblazeb2.com/{_THUMB_BUCKET}/{key}",
    )
    ref = clip_thumbnail_ref(clip)
    assert ref is not None
    assert ref.bucket == _THUMB_BUCKET


@pytest.fixture
def b2_unconfigured(monkeypatch):
    from services.storage import b2_config

    monkeypatch.setattr(b2_config, "B2_ENDPOINT", "")
    monkeypatch.setattr(b2_config, "B2_ACCESS_KEY_ID", "")
    monkeypatch.setattr(b2_config, "B2_SECRET_ACCESS_KEY", "")
    monkeypatch.setattr(b2_config, "B2_BUCKET_NAME", "")
    monkeypatch.setattr(b2_config, "B2_THUMBNAIL_BUCKET_NAME", "")
    b2_config.configured_b2_buckets.cache_clear()


def test_b2_structured_key_missing_config_fails_resolve(b2_unconfigured):
    locator = f"https://s3.us-west-004.backblazeb2.com/{_MEDIA_BUCKET}/{_MEDIA_KEY}"
    clip = Clip(
        library_id=1,
        title="t",
        storage_provider=PROVIDER_B2,
        media_object_key=_MEDIA_KEY,
        blob_url=locator,
    )
    with pytest.raises(ValueError, match="not fully configured"):
        resolve_stored_object_ref_for_read(clip, StoragePurpose.MEDIA)


def test_b2_incomplete_config_does_not_passthrough_unsigned_locator(b2_unconfigured):
    locator = f"https://s3.us-west-004.backblazeb2.com/{_MEDIA_BUCKET}/{_MEDIA_KEY}"
    clip = Clip(
        library_id=1,
        title="t",
        storage_provider=PROVIDER_B2,
        media_object_key=_MEDIA_KEY,
        blob_url=locator,
    )
    with pytest.raises(HTTPException) as exc:
        issue_clip_read_access(clip, library_id=1, purpose=StoragePurpose.MEDIA)
    assert exc.value.status_code == 503
