"""Provider-neutral storage value types."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

PROVIDER_AZURE = "azure"


class StoragePurpose(str, Enum):
    """Logical object role in Slyvr (maps to backend container/prefix per provider)."""

    MEDIA = "clips"
    THUMBNAIL = "thumbnails"


@dataclass(frozen=True)
class StoredObjectRef:
    """Canonical provider-neutral reference to a stored object."""

    provider: str
    bucket: str
    object_key: str
    read_url: str


# Backward alias for Phase 1 imports/tests gradual migration
StoredObject = StoredObjectRef
