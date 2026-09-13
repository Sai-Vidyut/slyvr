"""Routes storage operations to Azure or B2 by provider and write configuration."""

from __future__ import annotations

from services.storage.azure_provider import AzureBlobStorageProvider
from services.storage.b2_provider import B2StorageProvider
from services.storage.types import (
    PROVIDER_AZURE,
    PROVIDER_B2,
    ReadAccess,
    StoragePurpose,
    StoredObjectRef,
)


class RoutingStorageProvider:
    """
    Single StorageProvider facade: writes go to the configured provider;
    structured delete/read route by ref.provider; legacy URL ops stay on Azure.
    """

    def __init__(
        self,
        *,
        write_provider_name: str,
        azure: AzureBlobStorageProvider | None = None,
        b2: B2StorageProvider | None = None,
    ) -> None:
        self._write_provider_name = write_provider_name
        self._azure = azure or AzureBlobStorageProvider()
        self._b2 = b2 or B2StorageProvider()

    @property
    def write_provider_name(self) -> str:
        return self._write_provider_name

    def _write_provider(self):
        if self._write_provider_name == PROVIDER_AZURE:
            return self._azure
        if self._write_provider_name == PROVIDER_B2:
            return self._b2
        raise ValueError(f"Unsupported write storage provider: {self._write_provider_name}")

    def _provider_for_ref(self, ref: StoredObjectRef):
        if ref.provider == PROVIDER_AZURE:
            return self._azure
        if ref.provider == PROVIDER_B2:
            return self._b2
        raise ValueError(f"Unsupported storage provider: {ref.provider}")

    def put_file(
        self,
        local_path: str,
        *,
        library_id: int,
        purpose: StoragePurpose,
    ) -> StoredObjectRef:
        return self._write_provider().put_file(
            local_path,
            library_id=library_id,
            purpose=purpose,
        )

    def delete_object(self, ref: StoredObjectRef, *, library_id: int) -> None:
        self._provider_for_ref(ref).delete_object(ref, library_id=library_id)

    def delete_by_url(self, read_url: str, *, library_id: int) -> None:
        self._azure.delete_by_url(read_url, library_id=library_id)

    def issue_read_url(
        self,
        ref: StoredObjectRef,
        *,
        library_id: int,
        ttl_seconds: int,
    ) -> ReadAccess:
        return self._provider_for_ref(ref).issue_read_url(
            ref,
            library_id=library_id,
            ttl_seconds=ttl_seconds,
        )

    def get_read_url(self, read_url: str, *, library_id: int) -> str:
        return self._azure.get_read_url(read_url, library_id=library_id)
