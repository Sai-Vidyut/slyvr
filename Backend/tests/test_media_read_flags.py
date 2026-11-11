"""Feature-flag safety for Phase 3 media read configuration."""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from auth.config import get_settings  # noqa: E402
from models import Clip  # noqa: E402
from services.clip_serializer import serialize_clip  # noqa: E402


def test_signed_reads_alone_does_not_hide_blob_urls(monkeypatch):
    monkeypatch.setenv("SLYVR_SIGNED_MEDIA_READS", "1")
    monkeypatch.delenv("SLYVR_HIDE_DIRECT_MEDIA_URLS", raising=False)
    get_settings.cache_clear()

    clip = Clip(
        library_id=1,
        title="t",
        blob_url="https://example.test/a.mp4",
        thumbnail_url="https://example.test/t.jpg",
    )
    data = serialize_clip(clip)
    assert data["blob_url"] == "https://example.test/a.mp4"
    assert data["thumbnail_url"] == "https://example.test/t.jpg"
    get_settings.cache_clear()


def test_hide_direct_urls_omits_blob_urls(monkeypatch):
    monkeypatch.setenv("SLYVR_HIDE_DIRECT_MEDIA_URLS", "1")
    monkeypatch.setenv("SLYVR_SIGNED_MEDIA_READS", "0")
    get_settings.cache_clear()

    clip = Clip(
        library_id=1,
        title="t",
        blob_url="https://example.test/a.mp4",
        thumbnail_url="https://example.test/t.jpg",
    )
    data = serialize_clip(clip)
    assert data["blob_url"] is None
    assert data["thumbnail_url"] is None
    get_settings.cache_clear()
