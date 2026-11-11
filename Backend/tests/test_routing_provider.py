"""RoutingStorageProvider tests."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from services.storage.routing_provider import RoutingStorageProvider  # noqa: E402
from services.storage.types import PROVIDER_AZURE, PROVIDER_B2, StoragePurpose, StoredObjectRef  # noqa: E402
from tests.test_storage_service import FakeStorageProvider  # noqa: E402

_VALID_KEY = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.mp4"


class AzureFake(FakeStorageProvider):
    pass


class B2Fake(FakeStorageProvider):
    def put_file(self, local_path, *, library_id, purpose):
        self.put_calls.append((local_path, library_id, purpose))
        return StoredObjectRef(
            provider=PROVIDER_B2,
            bucket="real-b2-media-bucket",
            object_key=_VALID_KEY,
            read_url=f"https://b2.test/real-b2-media-bucket/{_VALID_KEY}",
        )


def test_routing_upload_uses_configured_write_provider():
    azure = AzureFake()
    b2 = B2Fake()
    router = RoutingStorageProvider(write_provider_name=PROVIDER_B2, azure=azure, b2=b2)

    ref = router.put_file("/tmp/x.mp4", library_id=1, purpose=StoragePurpose.MEDIA)

    assert ref.provider == PROVIDER_B2
    assert len(b2.put_calls) == 1
    assert azure.put_calls == []


def test_routing_delete_object_routes_azure():
    azure = AzureFake()
    b2 = B2Fake()
    router = RoutingStorageProvider(write_provider_name=PROVIDER_B2, azure=azure, b2=b2)
    ref = StoredObjectRef(
        provider=PROVIDER_AZURE,
        bucket="clips",
        object_key=_VALID_KEY,
        read_url="https://azure.test/clips/x",
    )
    router.delete_object(ref, library_id=1)
    assert len(azure.delete_object_calls) == 1
    assert b2.delete_object_calls == []


def test_routing_delete_object_routes_b2():
    azure = AzureFake()
    b2 = B2Fake()
    router = RoutingStorageProvider(write_provider_name=PROVIDER_AZURE, azure=azure, b2=b2)
    ref = StoredObjectRef(
        provider=PROVIDER_B2,
        bucket="real-b2-media-bucket",
        object_key=_VALID_KEY,
        read_url="https://b2.test/x",
    )
    router.delete_object(ref, library_id=1)
    assert len(b2.delete_object_calls) == 1
    assert azure.delete_object_calls == []


def test_routing_issue_read_url_routes_by_provider():
    azure = AzureFake()
    b2 = B2Fake()
    router = RoutingStorageProvider(write_provider_name=PROVIDER_AZURE, azure=azure, b2=b2)

    azure_ref = StoredObjectRef(
        provider=PROVIDER_AZURE,
        bucket="clips",
        object_key=_VALID_KEY,
        read_url="x",
    )
    b2_ref = StoredObjectRef(
        provider=PROVIDER_B2,
        bucket="real-b2-media-bucket",
        object_key=_VALID_KEY,
        read_url="y",
    )

    router.issue_read_url(azure_ref, library_id=1, ttl_seconds=300)
    router.issue_read_url(b2_ref, library_id=1, ttl_seconds=300)

    assert len(azure.issue_read_calls) == 1
    assert len(b2.issue_read_calls) == 1


def test_routing_rejects_unknown_provider():
    azure = AzureFake()
    b2 = B2Fake()
    router = RoutingStorageProvider(write_provider_name=PROVIDER_AZURE, azure=azure, b2=b2)
    ref = StoredObjectRef(
        provider="wasabi",
        bucket="clips",
        object_key=_VALID_KEY,
        read_url="x",
    )
    with pytest.raises(ValueError, match="Unsupported storage provider"):
        router.delete_object(ref, library_id=1)


def test_routing_delete_by_url_delegates_to_azure_only():
    azure = AzureFake()
    b2 = B2Fake()
    router = RoutingStorageProvider(write_provider_name=PROVIDER_B2, azure=azure, b2=b2)
    router.delete_by_url("https://azure.test/clips/legacy", library_id=1)
    assert azure.delete_calls == [("https://azure.test/clips/legacy", 1)]
    assert b2.delete_calls == []


def test_factory_defaults_to_azure_when_connection_string_set():
    from services.storage.factory import resolve_write_provider_name

    with patch(
        "services.azure_service.AZURE_CONNECTION_STRING",
        "DefaultEndpointsProtocol=https;AccountName=x;AccountKey=y==",
    ):
        with patch.dict("os.environ", {"SLYVR_STORAGE_PROVIDER": ""}, clear=False):
            assert resolve_write_provider_name() == PROVIDER_AZURE


def test_factory_explicit_b2():
    from services.storage.factory import resolve_write_provider_name

    with patch.dict("os.environ", {"SLYVR_STORAGE_PROVIDER": "b2"}, clear=False):
        assert resolve_write_provider_name() == PROVIDER_B2


def test_factory_fails_without_config():
    from services.storage.factory import resolve_write_provider_name

    with patch("services.azure_service.AZURE_CONNECTION_STRING", None):
        with patch.dict("os.environ", {"SLYVR_STORAGE_PROVIDER": ""}, clear=False):
            with pytest.raises(ValueError, match="No storage write provider"):
                resolve_write_provider_name()
