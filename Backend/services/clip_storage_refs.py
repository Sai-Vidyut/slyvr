"""Server-side Clip → storage reference resolution (shared by delete and read)."""

from __future__ import annotations

from typing import Optional

from models import Clip
from services.storage import b2_config
from services.storage.object_keys import parse_slyvr_azure_blob_url_for_signing
from services.storage.types import (
    PROVIDER_AZURE,
    PROVIDER_B2,
    STRUCTURED_STORAGE_PROVIDERS,
    StoragePurpose,
    StoredObjectRef,
)


def _bucket_for_structured_ref(provider: str, purpose: StoragePurpose) -> Optional[str]:
    if provider == PROVIDER_AZURE:
        return purpose.value
    if provider == PROVIDER_B2:
        if not b2_config.is_b2_configured():
            return None
        return b2_config.bucket_for_purpose(purpose)
    return None


def clip_media_ref(clip: Clip) -> Optional[StoredObjectRef]:
    if clip.storage_provider not in STRUCTURED_STORAGE_PROVIDERS or not clip.media_object_key:
        return None
    bucket = _bucket_for_structured_ref(clip.storage_provider, StoragePurpose.MEDIA)
    if not bucket:
        return None
    return StoredObjectRef(
        provider=clip.storage_provider,
        bucket=bucket,
        object_key=clip.media_object_key,
        read_url=clip.blob_url or "",
    )


def clip_thumbnail_ref(clip: Clip) -> Optional[StoredObjectRef]:
    if (
        clip.storage_provider not in STRUCTURED_STORAGE_PROVIDERS
        or not clip.thumbnail_object_key
    ):
        return None
    bucket = _bucket_for_structured_ref(clip.storage_provider, StoragePurpose.THUMBNAIL)
    if not bucket:
        return None
    return StoredObjectRef(
        provider=clip.storage_provider,
        bucket=bucket,
        object_key=clip.thumbnail_object_key,
        read_url=clip.thumbnail_url or "",
    )


def clip_has_b2_structured_key(clip: Clip, purpose: StoragePurpose) -> bool:
    """True when the clip row declares a B2 structured object key for the purpose."""
    if clip.storage_provider != PROVIDER_B2:
        return False
    if purpose == StoragePurpose.MEDIA:
        return bool(clip.media_object_key)
    return bool(clip.thumbnail_object_key)


def b2_structured_storage_unconfigured(clip: Clip, purpose: StoragePurpose) -> bool:
    """B2 structured object present in DB but server B2 credentials/buckets are missing."""
    return clip_has_b2_structured_key(clip, purpose) and not b2_config.is_b2_configured()


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

    if b2_structured_storage_unconfigured(clip, purpose):
        raise ValueError(
            "Backblaze B2 is not fully configured for structured clip media reads"
        )

    if clip.storage_provider == PROVIDER_B2:
        return None

    url = stored_url_for_purpose(clip, purpose)
    if not url:
        return None

    return ref_from_parseable_slyvr_url(
        url, expected_container=purpose.value
    )
