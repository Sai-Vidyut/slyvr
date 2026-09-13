"""Validation and parsing helpers for storage object keys and known blob URLs."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

from services.storage.types import PROVIDER_AZURE, StoragePurpose

logger = logging.getLogger(__name__)

_AZURE_MEDIA_CONTAINER = StoragePurpose.MEDIA.value
_AZURE_THUMB_CONTAINER = StoragePurpose.THUMBNAIL.value
_ALLOWED_AZURE_CONTAINERS = frozenset({_AZURE_MEDIA_CONTAINER, _AZURE_THUMB_CONTAINER})

# Blob names produced by azure_service: uuid + extension
_BLOB_KEY_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.][A-Za-z0-9._-]+$",
    re.IGNORECASE,
)


def is_valid_object_key(object_key: str) -> bool:
    if not object_key or not isinstance(object_key, str):
        return False
    if object_key.startswith("/") or object_key.endswith("/"):
        return False
    if ".." in object_key or "\\" in object_key:
        return False
    if "/" in object_key:
        return False
    return bool(_BLOB_KEY_PATTERN.match(object_key))


@dataclass(frozen=True)
class ParsedAzureBlobUrl:
    container_name: str
    object_key: str


def parse_slyvr_azure_blob_url(url: str) -> Optional[ParsedAzureBlobUrl]:
    """
    Parse an Azure blob URL in the shape produced by Slyvr's azure_service.

    Returns None when the URL is missing, malformed, or not a recognized Slyvr container/blob.
    """
    if not url or not isinstance(url, str):
        return None
    parsed = urlparse(url.strip())
    if parsed.scheme not in {"https", "http"}:
        return None
    if not parsed.netloc:
        return None
    # Typical: {account}.blob.core.windows.net — allow other hosts for emulators but require blob path shape.
    path = (parsed.path or "").lstrip("/")
    if not path or ".." in path:
        return None
    parts = path.split("/")
    if len(parts) < 2:
        return None
    container_name = parts[0]
    if container_name not in _ALLOWED_AZURE_CONTAINERS:
        return None
    object_key = "/".join(parts[1:])
    if not is_valid_object_key(object_key):
        return None
    return ParsedAzureBlobUrl(container_name=container_name, object_key=object_key)
