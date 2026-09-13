"""Phase 3: clip read access resolution and SAS signing (unit tests)."""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi import HTTPException

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from models import Clip  # noqa: E402
from services.clip_read_access import issue_clip_read_access  # noqa: E402
from services.clip_storage_refs import resolve_stored_object_ref_for_read  # noqa: E402
from services.storage.types import ReadAccess, StoragePurpose  # noqa: E402
from services.storage.service import StorageService  # noqa: E402
from tests.test_storage_service import FakeStorageProvider  # noqa: E402

_MEDIA_KEY = "11111111-2222-3333-4444-555555555555.mp4"
_THUMB_KEY = "22222222-3333-4444-5555-666666666666.jpg"
_AZURE_MEDIA_URL = f"https://foreign.example.net/clips/{_MEDIA_KEY}"
_AZURE_THUMB_URL = f"https://foreign.example.net/thumbnails/{_THUMB_KEY}"


def test_resolve_ref_from_structured_fields():
    clip = Clip(
        library_id=1,
        title="t",
        storage_provider="azure",
        media_object_key=_MEDIA_KEY,
        blob_url=_AZURE_MEDIA_URL,
    )
    ref = resolve_stored_object_ref_for_read(clip, StoragePurpose.MEDIA)
    assert ref is not None
    assert ref.object_key == _MEDIA_KEY
    assert ref.bucket == "clips"


def test_resolve_ref_from_foreign_host_url_does_not_sign():
    clip = Clip(
        library_id=1,
        title="t",
        blob_url=_AZURE_MEDIA_URL,
    )
    conn = (
        "DefaultEndpointsProtocol=https;AccountName=realacct;"
        "AccountKey=keykeykeykeykeykeykeykeykeykeykeykeykey==;EndpointSuffix=core.windows.net"
    )
    from services.storage.object_keys import configured_azure_blob_netlocs

    configured_azure_blob_netlocs.cache_clear()
    with patch("services.azure_service.AZURE_CONNECTION_STRING", conn):
        configured_azure_blob_netlocs.cache_clear()
        ref = resolve_stored_object_ref_for_read(clip, StoragePurpose.MEDIA)
    assert ref is None


def test_resolve_ref_from_configured_host_url():
    host = "realacct.blob.core.windows.net"
    url = f"https://{host}/clips/{_MEDIA_KEY}"
    clip = Clip(library_id=1, title="t", blob_url=url)
    conn = (
        "DefaultEndpointsProtocol=https;AccountName=realacct;"
        "AccountKey=keykeykeykeykeykeykeykeykeykeykeykeykey==;EndpointSuffix=core.windows.net"
    )
    from services.storage.object_keys import configured_azure_blob_netlocs

    configured_azure_blob_netlocs.cache_clear()
    with patch("services.azure_service.AZURE_CONNECTION_STRING", conn):
        configured_azure_blob_netlocs.cache_clear()
        ref = resolve_stored_object_ref_for_read(clip, StoragePurpose.MEDIA)
    assert ref is not None
    assert ref.object_key == _MEDIA_KEY


def test_foreign_host_legacy_url_passthrough_on_read():
    clip = Clip(library_id=1, title="t", blob_url=_AZURE_MEDIA_URL)
    conn = (
        "DefaultEndpointsProtocol=https;AccountName=realacct;"
        "AccountKey=keykeykeykeykeykeykeykeykeykeykeykeykey==;EndpointSuffix=core.windows.net"
    )
    from services.storage.object_keys import configured_azure_blob_netlocs

    configured_azure_blob_netlocs.cache_clear()
    with patch("services.azure_service.AZURE_CONNECTION_STRING", conn):
        configured_azure_blob_netlocs.cache_clear()
        with patch(
            "services.storage.azure_provider.azure_service.generate_blob_read_sas_url"
        ) as mock_sas:
            access = issue_clip_read_access(clip, library_id=1, purpose=StoragePurpose.MEDIA)
    assert access.url == _AZURE_MEDIA_URL
    mock_sas.assert_not_called()


def test_resolve_ref_external_url_returns_none():
    clip = Clip(
        library_id=1,
        title="t",
        blob_url="https://example.test/video.mp4",
    )
    assert resolve_stored_object_ref_for_read(clip, StoragePurpose.MEDIA) is None


def test_issue_read_access_ref_backed():
    clip = Clip(
        library_id=1,
        title="t",
        storage_provider="azure",
        media_object_key=_MEDIA_KEY,
        blob_url=_AZURE_MEDIA_URL,
    )
    fake = FakeStorageProvider()
    with patch("services.clip_read_access.get_storage_service", return_value=StorageService(provider=fake)):
        access = issue_clip_read_access(clip, library_id=1, purpose=StoragePurpose.MEDIA)
    assert fake.issue_read_calls
    assert "signed.test" in access.url


def test_issue_read_access_external_passthrough():
    external = "https://cdn.example.test/a.mp4"
    clip = Clip(library_id=1, title="t", blob_url=external)
    with patch(
        "services.storage.azure_provider.azure_service.generate_blob_read_sas_url"
    ) as mock_sas:
        access = issue_clip_read_access(clip, library_id=1, purpose=StoragePurpose.MEDIA)
    assert access.url == external
    mock_sas.assert_not_called()


def test_issue_read_access_missing_thumbnail_404():
    clip = Clip(library_id=1, title="t", blob_url=_AZURE_MEDIA_URL, thumbnail_url=None)
    with pytest.raises(HTTPException) as exc:
        issue_clip_read_access(clip, library_id=1, purpose=StoragePurpose.THUMBNAIL)
    assert exc.value.status_code == 404


def test_partial_thumb_key_without_provider_uses_url_parse():
    host = "realacct.blob.core.windows.net"
    thumb_url = f"https://{host}/thumbnails/{_THUMB_KEY}"
    clip = Clip(
        library_id=1,
        title="t",
        thumbnail_object_key=_THUMB_KEY,
        thumbnail_url=thumb_url,
        blob_url=f"https://{host}/clips/{_MEDIA_KEY}",
        storage_provider=None,
    )
    conn = (
        "DefaultEndpointsProtocol=https;AccountName=realacct;"
        "AccountKey=keykeykeykeykeykeykeykeykeykeykeykeykey==;EndpointSuffix=core.windows.net"
    )
    from services.storage.object_keys import configured_azure_blob_netlocs

    configured_azure_blob_netlocs.cache_clear()
    with patch("services.azure_service.AZURE_CONNECTION_STRING", conn):
        configured_azure_blob_netlocs.cache_clear()
        ref = resolve_stored_object_ref_for_read(clip, StoragePurpose.THUMBNAIL)
    assert ref is not None
    assert ref.object_key == _THUMB_KEY


def test_sas_generation_read_only_permission():
    from azure.storage.blob import BlobSasPermissions

    conn = (
        "DefaultEndpointsProtocol=https;AccountName=acct;AccountKey=keykeykeykeykeykeykeykeykeykeykeykeykey==;EndpointSuffix=core.windows.net"
    )
    with patch("services.azure_service.AZURE_CONNECTION_STRING", conn):
        with patch(
            "services.azure_service.BlobServiceClient.from_connection_string"
        ) as mock_client:
            instance = mock_client.return_value
            instance.account_name = "acct"
            instance.credential.account_key = "keykeykeykeykeykeykeykeykeykeykeykeykey=="
            with patch(
                "services.azure_service.generate_blob_sas", return_value="tok"
            ) as mock_gen:
                from services import azure_service

                azure_service.generate_blob_read_sas_url(
                    "clips", _MEDIA_KEY, ttl_seconds=600
                )
    mock_gen.assert_called_once()
    perm = mock_gen.call_args.kwargs["permission"]
    assert isinstance(perm, BlobSasPermissions)
    assert perm.read is True
    assert perm.write is False
    assert perm.delete is False
    assert perm.add is False
    assert perm.create is False


def test_azure_provider_issue_read_url_invokes_signer_with_read_only():
    from services.storage.azure_provider import AzureBlobStorageProvider
    from services.storage.types import StoredObjectRef

    provider = AzureBlobStorageProvider()
    ref = StoredObjectRef(
        provider="azure",
        bucket="clips",
        object_key=_MEDIA_KEY,
        read_url=f"https://x/clips/{_MEDIA_KEY}",
    )
    expires = datetime(2030, 1, 1, tzinfo=timezone.utc)
    with patch(
        "services.storage.azure_provider.azure_service.generate_blob_read_sas_url",
        return_value=("https://signed.test/x?sig=y", expires),
    ) as mock_sas:
        out = provider.issue_read_url(ref, library_id=1, ttl_seconds=600)
    mock_sas.assert_called_once_with("clips", _MEDIA_KEY, ttl_seconds=600)
    assert out.url.startswith("https://signed.test/")


def test_storage_service_issue_read_url_validates_ref():
    service = StorageService(provider=FakeStorageProvider())
    from services.storage.types import StoredObjectRef

    bad = StoredObjectRef(provider="azure", bucket="clips", object_key="bad/key", read_url="x")
    with pytest.raises(ValueError, match="object key"):
        service.issue_read_url(bad, library_id=1, ttl_seconds=300)
