"""Azure Blob Storage adapter (wraps existing azure_service)."""

from __future__ import annotations

from services import azure_service
from services.storage.types import StoragePurpose, StoredObject


class AzureBlobStorageProvider:
    """StorageProvider backed by Azure Blob Storage."""

    def put_file(
        self,
        local_path: str,
        *,
        library_id: int,
        purpose: StoragePurpose,
    ) -> StoredObject:
        # library_id reserved for future per-library routing; global Azure config today.
        _ = library_id
        url = azure_service.upload_file_to_azure(local_path, purpose.value)
        return StoredObject(read_url=url)

    def delete_by_url(self, read_url: str, *, library_id: int) -> None:
        _ = library_id
        azure_service.delete_blob_from_azure(read_url)

    def get_read_url(self, read_url: str, *, library_id: int) -> str:
        _ = library_id
        return read_url
