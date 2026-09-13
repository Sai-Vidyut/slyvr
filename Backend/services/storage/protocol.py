"""Storage provider contract (provider-neutral)."""

from __future__ import annotations

from typing import Protocol

from services.storage.types import StoragePurpose, StoredObjectRef


class StorageProvider(Protocol):
    def put_file(
        self,
        local_path: str,
        *,
        library_id: int,
        purpose: StoragePurpose,
    ) -> StoredObjectRef:
        """Upload bytes from a local path and return a stored object reference."""

    def delete_object(self, ref: StoredObjectRef, *, library_id: int) -> None:
        """Remove an object using a structured reference."""

    def delete_by_url(self, read_url: str, *, library_id: int) -> None:
        """Remove the object identified by a previously issued read URL (legacy)."""

    def get_read_url(self, read_url: str, *, library_id: int) -> str:
        """Return a URL clients may use to read the object (may be the stored URL)."""
