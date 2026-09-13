"""Object storage abstraction for Slyvr media and thumbnails."""

from services.storage.service import StorageService, get_storage_service
from services.storage.types import StoragePurpose, StoredObject

__all__ = [
    "StoragePurpose",
    "StoredObject",
    "StorageService",
    "get_storage_service",
]
