"""Backfill provider-neutral storage fields on legacy Clip rows."""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.engine import Connection

from services.storage.object_keys import parse_slyvr_azure_blob_url
from services.storage.types import PROVIDER_AZURE

logger = logging.getLogger(__name__)


def backfill_clip_storage_refs(conn: Connection) -> None:
    """
    Populate storage_provider / object keys from existing blob URLs where safe.

    Idempotent: rows with media_object_key already set are skipped for media backfill.
    Does not contact Azure or modify blobs.
    """
    rows = conn.execute(
        text(
            """
            SELECT id, blob_url, thumbnail_url, storage_provider,
                   media_object_key, thumbnail_object_key
            FROM clips
            """
        )
    ).fetchall()

    for row in rows:
        clip_id = row[0]
        blob_url = row[1]
        thumbnail_url = row[2]
        storage_provider = row[3]
        media_object_key = row[4]
        thumbnail_object_key = row[5]

        new_provider = storage_provider
        new_media_key = media_object_key
        new_thumb_key = thumbnail_object_key

        if not media_object_key and blob_url:
            parsed = parse_slyvr_azure_blob_url(blob_url)
            if parsed and parsed.container_name == "clips":
                new_media_key = parsed.object_key
                new_provider = PROVIDER_AZURE
            elif blob_url:
                logger.warning(
                    "clip id=%s: could not backfill media storage ref from blob_url",
                    clip_id,
                )

        if not thumbnail_object_key and thumbnail_url:
            parsed_thumb = parse_slyvr_azure_blob_url(thumbnail_url)
            if parsed_thumb and parsed_thumb.container_name == "thumbnails":
                new_thumb_key = parsed_thumb.object_key
            elif thumbnail_url:
                logger.warning(
                    "clip id=%s: could not backfill thumbnail storage ref from thumbnail_url",
                    clip_id,
                )

        if (
            new_provider == storage_provider
            and new_media_key == media_object_key
            and new_thumb_key == thumbnail_object_key
        ):
            continue

        conn.execute(
            text(
                """
                UPDATE clips
                SET storage_provider = :storage_provider,
                    media_object_key = :media_object_key,
                    thumbnail_object_key = :thumbnail_object_key
                WHERE id = :clip_id
                """
            ),
            {
                "clip_id": clip_id,
                "storage_provider": new_provider,
                "media_object_key": new_media_key,
                "thumbnail_object_key": new_thumb_key,
            },
        )
