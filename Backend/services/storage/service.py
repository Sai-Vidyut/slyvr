"""Facade routing storage operations to the configured provider."""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from services.storage.azure_provider import AzureBlobStorageProvider
from services.storage.object_keys import is_valid_object_key
from services.storage.protocol import StorageProvider
from services.storage.types import StoragePurpose, StoredObjectRef


def _validate_library_id(library_id: int) -> int:
    if not isinstance(library_id, int) or library_id < 1:
        raise ValueError("library_id must be a positive integer")
    return library_id


def _validate_object_ref(ref: StoredObjectRef) -> StoredObjectRef:
    if not ref.provider:
        raise ValueError("storage reference missing provider")
    if not ref.bucket:
        raise ValueError("storage reference missing bucket")
    if not is_valid_object_key(ref.object_key):
        raise ValueError("storage reference has invalid object key")
    return ref


class StorageService:
    def __init__(self, provider: Optional[StorageProvider] = None) -> None:
        self._provider: StorageProvider = provider or AzureBlobStorageProvider()

    @property
    def provider(self) -> StorageProvider:
        return self._provider

    def upload_file(
        self,
        local_path: str,
        *,
        library_id: int,
        purpose: StoragePurpose,
    ) -> StoredObjectRef:
        """Upload a local file; return a provider-neutral stored object reference."""
        lib_id = _validate_library_id(library_id)
        stored = self._provider.put_file(
            local_path,
            library_id=lib_id,
            purpose=purpose,
        )
        return _validate_object_ref(stored)

    def delete_object(self, ref: StoredObjectRef, *, library_id: int) -> None:
        lib_id = _validate_library_id(library_id)
        self._provider.delete_object(_validate_object_ref(ref), library_id=lib_id)

    def delete_by_url(self, read_url: str, *, library_id: int) -> None:
        lib_id = _validate_library_id(library_id)
        if not read_url:
            return
        self._provider.delete_by_url(read_url, library_id=lib_id)

    def get_read_url(self, read_url: str, *, library_id: int) -> str:
        lib_id = _validate_library_id(library_id)
        if not read_url:
            return read_url
        return self._provider.get_read_url(read_url, library_id=lib_id)


@lru_cache
def get_storage_service() -> StorageService:
    return StorageService()
