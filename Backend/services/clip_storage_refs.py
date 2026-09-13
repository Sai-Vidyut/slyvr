"""Server-side Clip → storage reference resolution (shared by delete and read)."""

from __future__ import annotations

from typing import Optional

from models import Clip
from services.storage.object_keys import parse_slyvr_azure_blob_url_for_signing
from services.storage.types import PROVIDER_AZURE, StoragePurpose, StoredObjectRef


def clip_media_ref(clip: Clip) -> Optional[StoredObjectRef]:
    if clip.storage_provider != PROVIDER_AZURE or not clip.media_object_key:
        return None
    return StoredObjectRef(
        provider=clip.storage_provider,
        bucket=StoragePurpose.MEDIA.value,
        object_key=clip.media_object_key,
        read_url=clip.blob_url or "",
    )


def clip_thumbnail_ref(clip: Clip) -> Optional[StoredObjectRef]:
    if clip.storage_provider != PROVIDER_AZURE or not clip.thumbnail_object_key:
        return None
    return StoredObjectRef(
        provider=clip.storage_provider,
        bucket=StoragePurpose.THUMBNAIL.value,
        object_key=clip.thumbnail_object_key,
        read_url=clip.thumbnail_url or "",
    )


def stored_url_for_purpose(clip: Clip, purpose: StoragePurpose) -> Optional[str]:
    if purpose == StoragePurpose.MEDIA:
        return clip.blob_url or None
    return clip.thumbnail_url or None


def structured_ref_for_purpose(clip: Clip, purpose: StoragePurpose) -> Optional[StoredObjectRef]:
    if purpose == StoragePurpose.MEDIA:
        return clip_media_ref(clip)
    return clip_thumbnail_ref(clip)


def ref_from_parseable_slyvr_url(
    url: str, *, expected_container: str
) -> Optional[StoredObjectRef]:
    parsed = parse_slyvr_azure_blob_url_for_signing(url)
    if not parsed or parsed.container_name != expected_container:
        return None
    return StoredObjectRef(
        provider=PROVIDER_AZURE,
        bucket=parsed.container_name,
        object_key=parsed.object_key,
        read_url=url,
    )


def resolve_stored_object_ref_for_read(
    clip: Clip, purpose: StoragePurpose
) -> Optional[StoredObjectRef]:
    """
    Resolve a StoredObjectRef for read signing.

    Order: structured DB refs → parse stored URL when host matches configured Azure account.
    Returns None when only a non-Azure external URL is available.
    """
    structured = structured_ref_for_purpose(clip, purpose)
    if structured:
        return structured

    url = stored_url_for_purpose(clip, purpose)
    if not url:
        return None

    return ref_from_parseable_slyvr_url(
        url, expected_container=purpose.value
    )
