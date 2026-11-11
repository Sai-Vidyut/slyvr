"""Azure Blob Storage adapter (wraps existing azure_service)."""

from __future__ import annotations

from services import azure_service
from services.storage.object_keys import is_valid_object_key
from services.storage.types import PROVIDER_AZURE, ReadAccess, StoragePurpose, StoredObjectRef


class AzureBlobStorageProvider:
    """StorageProvider backed by Azure Blob Storage."""

    def put_file(
        self,
        local_path: str,
        *,
        library_id: int,
        purpose: StoragePurpose,
    ) -> StoredObjectRef:
        _ = library_id
        uploaded = azure_service.upload_file_to_azure(local_path, purpose.value)
        if not is_valid_object_key(uploaded.blob_name):
            raise ValueError("Invalid object key produced by storage upload")
        return StoredObjectRef(
            provider=PROVIDER_AZURE,
            bucket=uploaded.container_name,
            object_key=uploaded.blob_name,
            read_url=uploaded.read_url,
        )

    def delete_object(self, ref: StoredObjectRef, *, library_id: int) -> None:
        _ = library_id
        if ref.provider != PROVIDER_AZURE:
            raise ValueError("Provider mismatch for Azure delete")
        if not is_valid_object_key(ref.object_key):
            raise ValueError("Invalid object key for delete")
        if ref.bucket not in {StoragePurpose.MEDIA.value, StoragePurpose.THUMBNAIL.value}:
            raise ValueError("Invalid container for delete")
        azure_service.delete_blob_from_azure_by_key(ref.bucket, ref.object_key)

    def delete_by_url(self, read_url: str, *, library_id: int) -> None:
        _ = library_id
        azure_service.delete_blob_from_azure(read_url)

    def issue_read_url(
        self,
        ref: StoredObjectRef,
        *,
        library_id: int,
        ttl_seconds: int,
    ) -> ReadAccess:
        _ = library_id
        if ref.provider != PROVIDER_AZURE:
            raise ValueError("Provider mismatch for Azure read")
        if not is_valid_object_key(ref.object_key):
            raise ValueError("Invalid object key for read")
        if ref.bucket not in {StoragePurpose.MEDIA.value, StoragePurpose.THUMBNAIL.value}:
            raise ValueError("Invalid container for read")
        url, expires_at = azure_service.generate_blob_read_sas_url(
            ref.bucket,
            ref.object_key,
            ttl_seconds=ttl_seconds,
        )
        return ReadAccess(url=url, expires_at=expires_at)

    def get_read_url(self, read_url: str, *, library_id: int) -> str:
        _ = library_id
        return read_url
