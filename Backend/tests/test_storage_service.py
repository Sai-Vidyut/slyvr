"""Storage facade and provider contract tests (no live cloud calls)."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from services.clip_service import delete_clip
from services.storage.service import StorageService
from datetime import datetime, timezone

from services.storage.types import PROVIDER_AZURE, ReadAccess, StoragePurpose, StoredObject

_VALID_KEY = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.mp4"


class FakeStorageProvider:
    def __init__(self) -> None:
        self.put_calls: list[tuple[str, int, StoragePurpose]] = []
        self.delete_calls: list[tuple[str, int]] = []
        self.delete_object_calls: list[tuple[StoredObject, int]] = []
        self.get_read_calls: list[tuple[str, int]] = []
        self.issue_read_calls: list[tuple[StoredObject, int, int]] = []
        self.put_should_fail = False

    def put_file(
        self,
        local_path: str,
        *,
        library_id: int,
        purpose: StoragePurpose,
    ) -> StoredObject:
        self.put_calls.append((local_path, library_id, purpose))
        if self.put_should_fail:
            raise RuntimeError("upload failed")
        return StoredObject(
            provider=PROVIDER_AZURE,
            bucket=purpose.value,
            object_key=_VALID_KEY,
            read_url=f"https://fake.test/{library_id}/{purpose.value}/{_VALID_KEY}",
        )

    def delete_object(self, ref: StoredObject, *, library_id: int) -> None:
        self.delete_object_calls.append((ref, library_id))
        if ref.read_url.endswith("/fail"):
            raise RuntimeError("delete failed")

    def delete_by_url(self, read_url: str, *, library_id: int) -> None:
        self.delete_calls.append((read_url, library_id))
        if read_url.endswith("/fail"):
            raise RuntimeError("delete failed")

    def issue_read_url(
        self,
        ref: StoredObject,
        *,
        library_id: int,
        ttl_seconds: int,
    ) -> ReadAccess:
        self.issue_read_calls.append((ref, library_id, ttl_seconds))
        return ReadAccess(
            url=f"https://signed.test/{library_id}/{ref.bucket}/{ref.object_key}?sig=fake",
            expires_at=datetime.now(timezone.utc),
        )

    def get_read_url(self, read_url: str, *, library_id: int) -> str:
        self.get_read_calls.append((read_url, library_id))
        return read_url


def test_facade_upload_delegates_with_library_id():
    fake = FakeStorageProvider()
    service = StorageService(provider=fake)

    stored = service.upload_file(
        "/tmp/video.mp4",
        library_id=42,
        purpose=StoragePurpose.MEDIA,
    )

    assert stored.read_url == f"https://fake.test/42/clips/{_VALID_KEY}"
    assert stored.provider == PROVIDER_AZURE
    assert stored.object_key == _VALID_KEY
    assert fake.put_calls == [("/tmp/video.mp4", 42, StoragePurpose.MEDIA)]


def test_facade_delete_delegates_with_library_id():
    fake = FakeStorageProvider()
    service = StorageService(provider=fake)

    service.delete_by_url("https://fake.test/obj", library_id=7)

    assert fake.delete_calls == [("https://fake.test/obj", 7)]


def test_facade_issue_read_url_delegates():
    fake = FakeStorageProvider()
    service = StorageService(provider=fake)
    ref = StoredObject(
        provider=PROVIDER_AZURE,
        bucket="clips",
        object_key=_VALID_KEY,
        read_url="https://fake.test/x",
    )
    access = service.issue_read_url(ref, library_id=3, ttl_seconds=900)
    assert fake.issue_read_calls
    assert access.url.startswith("https://signed.test/")


def test_facade_get_read_url_delegates():
    fake = FakeStorageProvider()
    service = StorageService(provider=fake)

    assert (
        service.get_read_url("https://fake.test/obj", library_id=3)
        == "https://fake.test/obj"
    )
    assert fake.get_read_calls == [("https://fake.test/obj", 3)]


def test_facade_rejects_invalid_library_id():
    service = StorageService(provider=FakeStorageProvider())

    with pytest.raises(ValueError, match="library_id"):
        service.upload_file("/tmp/x", library_id=0, purpose=StoragePurpose.MEDIA)


def test_default_provider_is_routing_adapter():
    from services.storage.routing_provider import RoutingStorageProvider

    with patch(
        "services.azure_service.AZURE_CONNECTION_STRING",
        "DefaultEndpointsProtocol=https;AccountName=x;AccountKey=y==",
    ):
        service = StorageService()

    assert isinstance(service.provider, RoutingStorageProvider)
    assert service.provider.write_provider_name == PROVIDER_AZURE


def test_azure_provider_put_delegates_to_azure_service():
    from services.storage.azure_provider import AzureBlobStorageProvider

    provider = AzureBlobStorageProvider()
    from services.azure_service import AzureBlobUploadResult

    blob_key = "11111111-2222-3333-4444-555555555555.mp4"
    with patch(
        "services.storage.azure_provider.azure_service.upload_file_to_azure",
        return_value=AzureBlobUploadResult(
            read_url=f"https://azure.test/clips/{blob_key}",
            container_name="clips",
            blob_name=blob_key,
        ),
    ) as mock_upload:
        result = provider.put_file(
            "/tmp/a.mp4",
            library_id=1,
            purpose=StoragePurpose.MEDIA,
        )

    mock_upload.assert_called_once_with("/tmp/a.mp4", "clips")
    assert result.read_url == f"https://azure.test/clips/{blob_key}"
    assert result.object_key == blob_key
    assert result.provider == PROVIDER_AZURE


def test_azure_provider_delete_object_delegates_by_key():
    from services.storage.azure_provider import AzureBlobStorageProvider

    provider = AzureBlobStorageProvider()
    blob_key = "11111111-2222-3333-4444-555555555555.mp4"
    ref = StoredObject(
        provider=PROVIDER_AZURE,
        bucket="clips",
        object_key=blob_key,
        read_url=f"https://azure.test/clips/{blob_key}",
    )
    with patch(
        "services.storage.azure_provider.azure_service.delete_blob_from_azure_by_key"
    ) as mock_delete:
        provider.delete_object(ref, library_id=1)

    mock_delete.assert_called_once_with("clips", blob_key)


def test_delete_clip_with_refs_uses_delete_object(sqlite_session):
    from models import Clip, Library

    db = sqlite_session
    library = Library(type="personal", owner_user_id="user-1", name="Personal")
    db.add(library)
    db.commit()
    db.refresh(library)

    blob_key = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.mp4"
    clip = Clip(
        library_id=library.id,
        title="t",
        storage_provider=PROVIDER_AZURE,
        media_object_key=blob_key,
        thumbnail_object_key=blob_key,
        blob_url=f"https://fake.test/clips/{blob_key}",
        thumbnail_url=f"https://fake.test/thumbnails/{blob_key}",
    )
    db.add(clip)
    db.commit()
    db.refresh(clip)

    fake = FakeStorageProvider()
    with patch(
        "services.clip_service.get_storage_service",
        return_value=StorageService(provider=fake),
    ):
        delete_clip(db, clip.id, library.id)

    assert len(fake.delete_object_calls) == 2
    assert fake.delete_calls == []


def test_azure_provider_delete_delegates_to_azure_service():
    from services.storage.azure_provider import AzureBlobStorageProvider

    provider = AzureBlobStorageProvider()
    with patch(
        "services.storage.azure_provider.azure_service.delete_blob_from_azure"
    ) as mock_delete:
        provider.delete_by_url("https://azure.test/clips/x", library_id=5)

    mock_delete.assert_called_once_with("https://azure.test/clips/x")


def test_upload_order_before_db_commit_pattern():
    """Both storage puts must succeed before a clip row exists (main.py ordering)."""
    fake = FakeStorageProvider()
    service = StorageService(provider=fake)

    media_stored = service.upload_file(
        "/tmp/media.mp4", library_id=10, purpose=StoragePurpose.MEDIA
    )
    thumb_stored = service.upload_file(
        "/tmp/thumb.jpg", library_id=10, purpose=StoragePurpose.THUMBNAIL
    )

    assert media_stored.bucket == "clips"
    assert thumb_stored.bucket == "thumbnails"
    assert len(fake.put_calls) == 2

    fake.put_should_fail = True
    with pytest.raises(RuntimeError, match="upload failed"):
        service.upload_file("/tmp/late.mp4", library_id=10, purpose=StoragePurpose.MEDIA)


def test_delete_clip_best_effort_on_storage_failure(sqlite_session):
    """Clip row is removed even when storage delete raises (matches prior behavior)."""
    from models import Clip, Library

    db = sqlite_session
    library = Library(type="personal", owner_user_id="user-1", name="Personal")
    db.add(library)
    db.commit()
    db.refresh(library)

    clip = Clip(
        library_id=library.id,
        title="t",
        blob_url="https://fake.test/fail",
        thumbnail_url="https://fake.test/fail",
    )
    db.add(clip)
    db.commit()
    db.refresh(clip)

    fake = FakeStorageProvider()
    with patch(
        "services.clip_service.get_storage_service",
        return_value=StorageService(provider=fake),
    ):
        delete_clip(db, clip.id, library.id)

    assert db.query(Clip).filter(Clip.id == clip.id).first() is None
    assert len(fake.delete_calls) == 2


@pytest.fixture
def sqlite_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool

    from database import Base
    import models  # noqa: F401

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        yield db
    finally:
        db.close()
