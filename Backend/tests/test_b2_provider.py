"""B2 StorageProvider unit tests (mocked boto3, no live B2)."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from services.storage.b2_provider import B2StorageProvider  # noqa: E402
from services.storage.types import PROVIDER_B2, StoragePurpose, StoredObjectRef  # noqa: E402

_MEDIA_KEY = "11111111-2222-3333-4444-555555555555.mp4"
_THUMB_KEY = "22222222-3333-4444-5555-666666666666.jpg"
_MEDIA_BUCKET = "slyvr-clips-dev"
_THUMB_BUCKET = "slyvr-thumbs-dev"
_ENDPOINT = "https://s3.us-west-004.backblazeb2.com"


@pytest.fixture
def b2_env(monkeypatch):
    from services.storage import b2_config

    monkeypatch.setattr(b2_config, "B2_ENDPOINT", _ENDPOINT)
    monkeypatch.setattr(b2_config, "B2_ACCESS_KEY_ID", "test-key-id")
    monkeypatch.setattr(b2_config, "B2_SECRET_ACCESS_KEY", "test-secret-key")
    monkeypatch.setattr(b2_config, "B2_BUCKET_NAME", _MEDIA_BUCKET)
    monkeypatch.setattr(b2_config, "B2_THUMBNAIL_BUCKET_NAME", _THUMB_BUCKET)
    b2_config.configured_b2_buckets.cache_clear()


@pytest.fixture
def mock_s3():
    client = MagicMock()
    client.generate_presigned_url.return_value = (
        f"{_ENDPOINT}/{_MEDIA_BUCKET}/{_MEDIA_KEY}?X-Amz-Signature=fake"
    )
    return client


def test_b2_upload_media_bucket_and_ref(tmp_path, b2_env, mock_s3):
    media = tmp_path / "clip.mp4"
    media.write_bytes(b"video")

    provider = B2StorageProvider(s3_client=mock_s3)
    with patch(
        "services.storage.b2_provider._generate_object_key",
        return_value=_MEDIA_KEY,
    ):
        ref = provider.put_file(str(media), library_id=1, purpose=StoragePurpose.MEDIA)

    mock_s3.put_object.assert_called_once()
    kwargs = mock_s3.put_object.call_args.kwargs
    assert kwargs["Bucket"] == _MEDIA_BUCKET
    assert kwargs["Key"] == _MEDIA_KEY
    assert kwargs["ContentType"] == "video/mp4"

    assert ref.provider == PROVIDER_B2
    assert ref.bucket == _MEDIA_BUCKET
    assert ref.object_key == _MEDIA_KEY
    assert ref.read_url == f"{_ENDPOINT}/{_MEDIA_BUCKET}/{_MEDIA_KEY}"
    assert "X-Amz" not in ref.read_url
    assert "test-secret" not in ref.read_url


def test_b2_upload_thumbnail_bucket(tmp_path, b2_env, mock_s3):
    thumb = tmp_path / "t.jpg"
    thumb.write_bytes(b"img")

    provider = B2StorageProvider(s3_client=mock_s3)
    with patch(
        "services.storage.b2_provider._generate_object_key",
        return_value=_THUMB_KEY,
    ):
        ref = provider.put_file(str(thumb), library_id=1, purpose=StoragePurpose.THUMBNAIL)

    assert mock_s3.put_object.call_args.kwargs["Bucket"] == _THUMB_BUCKET
    assert ref.bucket == _THUMB_BUCKET
    assert mock_s3.put_object.call_args.kwargs["ContentType"] == "image/jpeg"


def test_b2_delete_object(b2_env, mock_s3):
    provider = B2StorageProvider(s3_client=mock_s3)
    ref = StoredObjectRef(
        provider=PROVIDER_B2,
        bucket=_MEDIA_BUCKET,
        object_key=_MEDIA_KEY,
        read_url=f"{_ENDPOINT}/{_MEDIA_BUCKET}/{_MEDIA_KEY}",
    )
    provider.delete_object(ref, library_id=1)
    mock_s3.delete_object.assert_called_once_with(Bucket=_MEDIA_BUCKET, Key=_MEDIA_KEY)


def test_b2_delete_rejects_wrong_provider(b2_env, mock_s3):
    provider = B2StorageProvider(s3_client=mock_s3)
    ref = StoredObjectRef(
        provider="azure",
        bucket=_MEDIA_BUCKET,
        object_key=_MEDIA_KEY,
        read_url="x",
    )
    with pytest.raises(ValueError, match="Provider mismatch"):
        provider.delete_object(ref, library_id=1)


def test_b2_delete_rejects_invalid_bucket(b2_env, mock_s3):
    provider = B2StorageProvider(s3_client=mock_s3)
    ref = StoredObjectRef(
        provider=PROVIDER_B2,
        bucket="other-bucket",
        object_key=_MEDIA_KEY,
        read_url="x",
    )
    with pytest.raises(ValueError, match="Invalid bucket"):
        provider.delete_object(ref, library_id=1)


def test_b2_delete_rejects_invalid_object_key(b2_env, mock_s3):
    provider = B2StorageProvider(s3_client=mock_s3)
    ref = StoredObjectRef(
        provider=PROVIDER_B2,
        bucket=_MEDIA_BUCKET,
        object_key="bad/key",
        read_url="x",
    )
    with pytest.raises(ValueError, match="Invalid object key"):
        provider.delete_object(ref, library_id=1)


def test_b2_issue_read_url_presigned_get(b2_env, mock_s3):
    provider = B2StorageProvider(s3_client=mock_s3)
    ref = StoredObjectRef(
        provider=PROVIDER_B2,
        bucket=_MEDIA_BUCKET,
        object_key=_MEDIA_KEY,
        read_url=f"{_ENDPOINT}/{_MEDIA_BUCKET}/{_MEDIA_KEY}",
    )
    access = provider.issue_read_url(ref, library_id=1, ttl_seconds=600)

    mock_s3.generate_presigned_url.assert_called_once_with(
        ClientMethod="get_object",
        Params={"Bucket": _MEDIA_BUCKET, "Key": _MEDIA_KEY},
        ExpiresIn=600,
    )
    assert access.url.startswith(_ENDPOINT)
    assert "test-secret" not in access.url
    assert access.expires_at.tzinfo is not None


def test_b2_issue_read_url_rejects_wrong_provider(b2_env, mock_s3):
    provider = B2StorageProvider(s3_client=mock_s3)
    ref = StoredObjectRef(
        provider="azure",
        bucket=_MEDIA_BUCKET,
        object_key=_MEDIA_KEY,
        read_url="x",
    )
    with pytest.raises(ValueError, match="Provider mismatch"):
        provider.issue_read_url(ref, library_id=1, ttl_seconds=300)


def test_b2_delete_by_url_not_supported(b2_env, mock_s3):
    provider = B2StorageProvider(s3_client=mock_s3)
    with pytest.raises(ValueError, match="not supported"):
        provider.delete_by_url("https://example/x", library_id=1)
