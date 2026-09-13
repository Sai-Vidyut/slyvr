"""Provider-neutral storage value types."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class StoragePurpose(str, Enum):
    """Logical object role in Slyvr (maps to backend container/prefix per provider)."""

    MEDIA = "clips"
    THUMBNAIL = "thumbnails"


@dataclass(frozen=True)
class StoredObject:
    """Result of a successful put/upload."""

    read_url: str
