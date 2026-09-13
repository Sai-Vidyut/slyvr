"""Object storage abstraction for Slyvr media and thumbnails."""

from services.storage.service import StorageService, get_storage_service
from services.storage.types import (
    PROVIDER_AZURE,
    PROVIDER_B2,
    ReadAccess,
    StoragePurpose,
    StoredObject,
    StoredObjectRef,
)

__all__ = [
    "PROVIDER_AZURE",
    "PROVIDER_B2",
    "ReadAccess",
    "StoragePurpose",
    "StoredObject",
    "StoredObjectRef",
    "StorageService",
    "get_storage_service",
]
