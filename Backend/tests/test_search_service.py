"""Search ranking, facet filters, and metadata facet buckets."""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

import models  # noqa: F401,E402
from database import Base  # noqa: E402
from models import Category, Clip, Library, Person  # noqa: E402
from services.search_service import (  # noqa: E402
    _apply_facet_filters,
    _build_facets,
    _effective_has_gps,
    _effective_media_kind,
    search_clips_ranked,
)


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def library(db_session):
    lib = Library(type="legacy", name="Search Test Library")
    db_session.add(lib)
    db_session.commit()
    db_session.refresh(lib)
    return lib


def _add_clip(db_session, library_id: int, **kwargs) -> Clip:
    clip = Clip(
        library_id=library_id,
        title=kwargs.pop("title", "Clip"),
        blob_url=kwargs.pop("blob_url", "https://example.test/media"),
        uploaded_at=kwargs.pop("uploaded_at", datetime(2024, 6, 1, tzinfo=timezone.utc)),
        **kwargs,
    )
    db_session.add(clip)
    db_session.commit()
    db_session.refresh(clip)
    return clip


def test_effective_media_kind_column_and_mime_inference():
    photo_col = Clip(title="p", blob_url="https://x", media_kind="photo")
    assert _effective_media_kind(photo_col) == "photo"

    legacy_image = Clip(title="p", blob_url="https://x", mime_type="image/jpeg")
    assert _effective_media_kind(legacy_image) == "photo"

    legacy_video = Clip(title="v", blob_url="https://x", mime_type="video/mp4")
    assert _effective_media_kind(legacy_video) == "video"

    video_col = Clip(title="v", blob_url="https://x", media_kind="video")
    assert _effective_media_kind(video_col) == "video"


def test_effective_has_gps_column_and_coordinates():
    assert _effective_has_gps(Clip(title="a", blob_url="https://x", has_gps=1)) is True
    assert (
        _effective_has_gps(
            Clip(title="b", blob_url="https://x", latitude=1.0, longitude=2.0)
        )
        is True
    )
    assert _effective_has_gps(Clip(title="c", blob_url="https://x", latitude=1.0)) is False
    assert _effective_has_gps(Clip(title="d", blob_url="https://x", has_gps=0)) is False


def test_media_kind_video_filter_normalized_and_mime_inference(db_session, library):
    _add_clip(
        db_session,
        library.id,
        title="Normalized video",
        media_kind="video",
        mime_type="video/mp4",
    )
    _add_clip(
        db_session,
        library.id,
        title="Legacy mime video",
        mime_type="video/quicktime",
    )
    _add_clip(
        db_session,
        library.id,
        title="Photo",
        media_kind="photo",
        mime_type="image/jpeg",
    )

    clips, _ = search_clips_ranked(
        db_session,
        "",
        library_id=library.id,
        media_kind="video",
    )
    titles = {c.title for c in clips}
    assert titles == {"Normalized video", "Legacy mime video"}


def test_media_kind_photo_filter(db_session, library):
    _add_clip(
        db_session,
        library.id,
        title="Photo normalized",
        media_kind="photo",
    )
    _add_clip(
        db_session,
        library.id,
        title="Photo from mime",
        mime_type="image/png",
    )
    _add_clip(
        db_session,
        library.id,
        title="Video",
        media_kind="video",
    )

    clips, facets = search_clips_ranked(
        db_session,
        "",
        library_id=library.id,
        media_kind="photo",
    )
    assert {c.title for c in clips} == {"Photo normalized", "Photo from mime"}
    assert "Photo" in facets.get("media_kinds", [])


def test_has_gps_true_includes_column_and_legacy_coordinates(db_session, library):
    _add_clip(
        db_session,
        library.id,
        title="Flagged GPS",
        has_gps=1,
    )
    _add_clip(
        db_session,
        library.id,
        title="Legacy coords",
        latitude=12.9716,
        longitude=77.5946,
    )
    _add_clip(
        db_session,
        library.id,
        title="No location",
    )

    clips, facets = search_clips_ranked(
        db_session,
        "",
        library_id=library.id,
        has_gps=True,
    )
    assert {c.title for c in clips} == {"Flagged GPS", "Legacy coords"}
    assert facets.get("has_gps") == ["With location data"]


def test_has_gps_excludes_clips_without_location_data(db_session, library):
    _add_clip(db_session, library.id, title="No GPS")
    _add_clip(
        db_session,
        library.id,
        title="Has GPS",
        latitude=10.0,
        longitude=20.0,
    )

    clips, _ = search_clips_ranked(
        db_session,
        "",
        library_id=library.id,
        has_gps=True,
    )
    assert [c.title for c in clips] == ["Has GPS"]


def test_lens_model_case_insensitive(db_session, library):
    _add_clip(
        db_session,
        library.id,
        title="Lens hit",
        lens_model="RF 24-70mm F2.8",
    )
    _add_clip(
        db_session,
        library.id,
        title="Other lens",
        lens_model="Wide",
    )

    clips, _ = search_clips_ranked(
        db_session,
        "",
        library_id=library.id,
        lens_model="rf 24-70mm f2.8",
    )
    assert [c.title for c in clips] == ["Lens hit"]


def test_video_codec_filter(db_session, library):
    _add_clip(
        db_session,
        library.id,
        title="HEVC clip",
        video_codec="hevc",
    )
    _add_clip(
        db_session,
        library.id,
        title="H264 clip",
        video_codec="h264",
    )

    clips, facets = search_clips_ranked(
        db_session,
        "",
        library_id=library.id,
        video_codec="HEVC",
    )
    assert [c.title for c in clips] == ["HEVC clip"]
    assert "hevc" in facets.get("video_codecs", [])


def test_build_facets_omits_empty_dimensions(db_session, library):
    clip = _add_clip(
        db_session,
        library.id,
        title="Plain",
        mime_type="application/octet-stream",
    )
    facets = _build_facets([clip])
    assert "people" not in facets
    assert "media_kinds" not in facets
    assert "lens_models" not in facets
    assert "video_codecs" not in facets
    assert "has_gps" not in facets


def test_build_facets_includes_new_buckets(db_session, library):
    clip = _add_clip(
        db_session,
        library.id,
        title="Rich",
        media_kind="video",
        lens_model="DJI Lens",
        video_codec="hevc",
        latitude=1.0,
        longitude=2.0,
    )
    facets = _build_facets([clip])
    assert facets["media_kinds"] == ["Video"]
    assert facets["lens_models"] == ["DJI Lens"]
    assert facets["video_codecs"] == ["hevc"]
    assert facets["has_gps"] == ["With location data"]


def test_empty_query_without_facets_returns_empty(db_session, library):
    _add_clip(db_session, library.id, title="Any")
    clips, facets = search_clips_ranked(db_session, "", library_id=library.id)
    assert clips == []
    assert facets == {}


def test_facet_only_search_returns_results(db_session, library):
    _add_clip(
        db_session,
        library.id,
        title="Only facet",
        media_kind="video",
    )
    clips, facets = search_clips_ranked(
        db_session,
        "",
        library_id=library.id,
        media_kind="video",
    )
    assert len(clips) == 1
    assert facets.get("media_kinds") == ["Video"]


def test_existing_category_facet_filter_unchanged(db_session, library):
    cat = Category(library_id=library.id, name="Travel")
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)

    in_cat = _add_clip(
        db_session,
        library.id,
        title="In category",
        category_id=cat.id,
    )
    db_session.refresh(in_cat)
    _add_clip(db_session, library.id, title="Uncategorized")

    clips, facets = search_clips_ranked(
        db_session,
        "",
        library_id=library.id,
        category="Travel",
    )
    assert [c.title for c in clips] == ["In category"]
    assert "Travel" in facets.get("categories", [])


def test_existing_location_facet_label_first_and_coordinate_fallback(db_session, library):
    labeled = _add_clip(
        db_session,
        library.id,
        title="Labeled",
        location_label="Bangalore",
    )
    coords = _add_clip(
        db_session,
        library.id,
        title="Coords only",
        latitude=12.9716,
        longitude=77.5946,
    )

    facets = _build_facets([labeled, coords])
    assert "Bangalore" in facets["locations"]
    assert "12.9716, 77.5946" in facets["locations"]

    filtered = _apply_facet_filters(
        [labeled, coords],
        location="12.9716",
    )
    assert [c.title for c in filtered] == ["Coords only"]

    filtered_label = _apply_facet_filters(
        [labeled, coords],
        location="bang",
    )
    assert [c.title for c in filtered_label] == ["Labeled"]


def test_existing_device_and_file_type_filters(db_session, library):
    clip = _add_clip(
        db_session,
        library.id,
        title="Device clip",
        camera_model="iPhone 15",
        mime_type="image/jpeg",
        original_filename="photo.jpg",
    )

    by_device = _apply_facet_filters([clip], device="iphone")
    assert len(by_device) == 1

    by_type = _apply_facet_filters([clip], file_type="jpeg")
    assert len(by_type) == 1


def test_text_search_with_metadata_facet_still_ranks(db_session, library):
    _add_clip(
        db_session,
        library.id,
        title="Summer drone reel",
        media_kind="video",
        video_codec="hevc",
    )
    _add_clip(
        db_session,
        library.id,
        title="Winter photos",
        media_kind="photo",
    )

    clips, _ = search_clips_ranked(
        db_session,
        "summer",
        library_id=library.id,
        media_kind="video",
    )
    assert [c.title for c in clips] == ["Summer drone reel"]
