"""Validation and parsing helpers for storage object keys and known blob URLs."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional, Set
from urllib.parse import urlparse

from services.storage.types import StoragePurpose

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


def _connection_string_parts(connection_string: str) -> dict[str, str]:
    parts: dict[str, str] = {}
    for segment in connection_string.split(";"):
        if "=" not in segment:
            continue
        key, value = segment.split("=", 1)
        parts[key.strip()] = value.strip()
    return parts


@lru_cache
def configured_azure_blob_netlocs() -> frozenset[str]:
    """
    Netloc values for blob URLs on the configured Azure account (from env credentials).

    Derived from AccountName and optional BlobEndpoint in AZURE_CONNECTION_STRING.
    Empty when Azure is not configured — URL-based signing must not proceed.
    """
    from services import azure_service

    connection_string = azure_service.AZURE_CONNECTION_STRING
    if not connection_string:
        return frozenset()

    netlocs: Set[str] = set()
    parts = _connection_string_parts(connection_string)
    account_name = parts.get("AccountName")
    if account_name:
        netlocs.add(f"{account_name.lower()}.blob.core.windows.net")

    for endpoint_key in ("BlobEndpoint", "BlobStorageEndpoint"):
        endpoint = parts.get(endpoint_key)
        if not endpoint:
            continue
        parsed = urlparse(endpoint)
        if parsed.netloc:
            netlocs.add(parsed.netloc.lower())

    if not netlocs:
        try:
            from azure.storage.blob import BlobServiceClient

            client = BlobServiceClient.from_connection_string(connection_string)
            if client.account_name:
                netlocs.add(f"{client.account_name.lower()}.blob.core.windows.net")
        except Exception:
            logger.warning("Could not derive Azure blob netloc from connection string")

    return frozenset(netlocs)


def blob_url_netloc_matches_configured_account(url: str) -> bool:
    """True when the URL host matches the configured Azure blob endpoint(s)."""
    if not url:
        return False
    parsed = urlparse(url.strip())
    netloc = (parsed.netloc or "").lower()
    if not netloc:
        return False
    allowed = configured_azure_blob_netlocs()
    if not allowed:
        return False
    return netloc in allowed


def parse_slyvr_azure_blob_url_for_signing(url: str) -> Optional[ParsedAzureBlobUrl]:
    """
    Parse a legacy blob URL only when path shape and configured Azure host match.

    Used for read signing — does not trust foreign hosts. Does not fetch URLs.
    """
    if not blob_url_netloc_matches_configured_account(url):
        return None
    return parse_slyvr_azure_blob_url(url)
