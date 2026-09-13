"""Provider-neutral storage value types."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum

PROVIDER_AZURE = "azure"
PROVIDER_B2 = "b2"

STRUCTURED_STORAGE_PROVIDERS = frozenset({PROVIDER_AZURE, PROVIDER_B2})


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


@dataclass(frozen=True)
class ReadAccess:
    """Time-bounded read URL for a single stored object (or passthrough external URL)."""

    url: str
    expires_at: datetime


# Backward alias for Phase 1 imports/tests gradual migration
StoredObject = StoredObjectRef
