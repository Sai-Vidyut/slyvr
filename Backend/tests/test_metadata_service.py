"""Metadata extraction, schema v2, persistence, and API serialization."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from models import Clip  # noqa: E402
from services.clip_serializer import serialize_clip  # noqa: E402
from services.metadata_service import (  # noqa: E402
    METADATA_SCHEMA_VERSION,
    build_metadata_v2,
    extract_media_metadata,
    flat_fields_from_metadata,
    merge_upload_provenance,
)
from services.clip_serializer import _metadata_for_client as serializer_metadata_for_client  # noqa: E402


PHOTO_EXIF = {
    "Make": "Apple",
    "Model": "iPhone 15 Pro",
    "LensModel": "iPhone 15 Pro back triple camera 6.765mm f/1.78",
    "DateTimeOriginal": "2024:06:10 14:22:01",
    "CreateDate": "2024:06:10 14:22:02",
    "ModifyDate": "2024:06:10 14:22:03",
    "OffsetTimeOriginal": "+05:30",
    "FocalLength": 6.765,
    "FocalLengthIn35mmFormat": 24,
    "FNumber": 1.78,
    "ExposureTime": 0.002,
    "ISO": 64,
    "ExposureCompensation": 0,
    "Flash": "Off, Did not fire",
    "WhiteBalance": "Auto",
    "Orientation": 1,
    "ColorSpace": "sRGB",
    "Software": "17.5.1",
    "GPSLatitude": 12.9716,
    "GPSLongitude": 77.5946,
    "GPSAltitude": 920.5,
    "GPSHPositioningError": 12.3,
    "ImageWidth": 4032,
    "ImageHeight": 3024,
}

PHOTO_PROBE = {"format": {}, "streams": []}

VIDEO_EXIF = {
    "Make": "DJI",
    "Model": "FC7303",
    "MediaCreateDate": "2023:11:02 09:15:00",
    "GPSLatitude": 28.6139,
    "GPSLongitude": 77.209,
}

VIDEO_PROBE = {
    "format": {
        "duration": "125.5",
        "bit_rate": "8500000",
        "format_name": "mov,mp4,m4a,3gp,3g2,mj2",
        "tags": {"creation_time": "2023-11-02T09:15:00.000000Z", "encoder": "Lavf58.76.100"},
    },
    "streams": [
        {
            "codec_type": "video",
            "codec_name": "hevc",
            "profile": "Main",
            "level": 120,
            "width": 3840,
            "height": 2160,
            "avg_frame_rate": "30000/1001",
            "pix_fmt": "yuv420p",
            "bit_rate": "8000000",
            "tags": {"rotate": "90"},
        },
        {
            "codec_type": "audio",
            "codec_name": "aac",
            "channels": 2,
            "sample_rate": "48000",
            "bit_rate": "128000",
        },
    ],
}


def test_build_metadata_v2_schema_version():
    meta = build_metadata_v2(
        exif=PHOTO_EXIF,
        probe=PHOTO_PROBE,
        file_path="/tmp/sample.jpg",
        file_size=12345,
    )
    assert meta["schema_version"] == METADATA_SCHEMA_VERSION
    assert meta["file"]["media_kind"] == "photo"
    assert meta["device"]["make"] == "Apple"
    assert meta["lens_exposure"]["iso"] == 64
    assert meta["location"]["horizontal_accuracy_m"] == 12.3
    assert meta["capture"]["captured_at_source"] == "exif_original"
    assert meta["capture"]["timezone_offset"] == "+05:30"


def test_video_metadata_extraction_fields():
    meta = build_metadata_v2(
        exif=VIDEO_EXIF,
        probe=VIDEO_PROBE,
        file_path="/tmp/flight.mp4",
        file_size=999,
    )
    assert meta["file"]["media_kind"] == "video"
    assert meta["video"]["stream"]["codec"] == "hevc"
    assert meta["video"]["stream"]["pixel_format"] == "yuv420p"
    assert meta["video"]["stream"]["profile"] == "Main"
    assert meta["video"]["rotation_degrees"] == 90
    assert meta["audio"]["stream"]["codec"] == "aac"
    assert meta["audio"]["stream"]["channels"] == 2
    assert meta["provenance"]["file_history"]["encoder"] == "Lavf58.76.100"


def test_missing_metadata_empty_exif():
    meta = build_metadata_v2(exif={}, probe={}, file_path="/tmp/unknown.bin", file_size=10)
    assert meta["schema_version"] == METADATA_SCHEMA_VERSION
    assert meta["device"]["make"] is None
    assert meta["location"]["latitude"] is None
    flat = flat_fields_from_metadata(meta)
    assert flat["has_gps"] is False
    assert flat["media_kind"] == "photo"


def test_missing_gps():
    exif = {k: v for k, v in PHOTO_EXIF.items() if not k.startswith("GPS")}
    meta = build_metadata_v2(exif=exif, probe=PHOTO_PROBE, file_path="/tmp/x.jpg", file_size=1)
    assert meta["location"]["latitude"] is None
    assert flat_fields_from_metadata(meta)["has_gps"] is False


def test_timestamp_source_precedence_ffprobe_when_no_exif_dates():
    probe = {
        "format": {"tags": {"creation_time": "2022-01-01T12:00:00.000000Z"}},
        "streams": [],
    }
    meta = build_metadata_v2(
        exif={},
        probe=probe,
        file_path="/tmp/v.mp4",
        file_size=1,
    )
    assert meta["capture"]["captured_at_source"] == "ffprobe_creation"


def test_flat_fields_from_metadata():
    meta = build_metadata_v2(
        exif=PHOTO_EXIF, probe=PHOTO_PROBE, file_path="/tmp/a.jpg", file_size=100
    )
    flat = flat_fields_from_metadata(meta)
    assert flat["camera_make"] == "Apple"
    assert flat["lens_model"] == PHOTO_EXIF["LensModel"]
    assert flat["iso"] == 64
    assert flat["has_gps"] is True
    assert flat["software"] == "17.5.1"


def test_merge_upload_provenance():
    meta = build_metadata_v2(
        exif=PHOTO_EXIF, probe=PHOTO_PROBE, file_path="/tmp/a.jpg", file_size=100
    )
    when = datetime(2024, 6, 11, 10, 0, 0, tzinfo=timezone.utc)
    merge_upload_provenance(
        meta,
        uploaded_at=when,
        uploaded_by_user_id="user-1",
        uploaded_by_display_name="Alex",
        library_id=42,
    )
    ingest = meta["provenance"]["ingest"]
    assert ingest["library_id"] == 42
    assert ingest["uploaded_by_user_id"] == "user-1"
    assert ingest["uploaded_by_display_name"] == "Alex"
    assert "email" not in json.dumps(ingest)


@patch("services.metadata_service._run_ffprobe_json", return_value=VIDEO_PROBE)
@patch("services.metadata_service._run_exiftool_json", return_value=VIDEO_EXIF)
def test_extract_media_metadata_integration(mock_exif, mock_probe, tmp_path):
    path = tmp_path / "clip.mp4"
    path.write_bytes(b"\x00")
    out = extract_media_metadata(str(path))
    assert out["media_kind"] == "video"
    assert out["video_codec"] == "hevc"
    assert out["metadata"]["schema_version"] == 2


def test_serializer_v2_legacy_shim():
    meta = build_metadata_v2(
        exif=PHOTO_EXIF, probe=PHOTO_PROBE, file_path="/tmp/a.jpg", file_size=100
    )
    client = serializer_metadata_for_client(meta)
    assert client is not None
    assert client["capture"]["lens_model"] == PHOTO_EXIF["LensModel"]
    assert client["capture"]["iso"] == 64
    assert client["schema_version"] == 2


def test_serializer_backward_compatible_v1_metadata():
    legacy = {
        "file": {"width": 100, "height": 200},
        "capture": {"camera_model": "OldCam"},
        "location": {},
        "video": {},
    }
    assert serializer_metadata_for_client(legacy) == legacy


def test_serialize_clip_exposes_normalized_fields_and_altitude():
    clip = Clip(
        library_id=1,
        title="t",
        blob_url="https://example.test/a.jpg",
        thumbnail_url="https://example.test/t.jpg",
        altitude=100.5,
        media_kind="photo",
        lens_model="Lens",
        iso=200,
        video_codec=None,
        audio_codec=None,
        has_gps=1,
        capture_timezone_offset="+05:30",
        software="Lightroom",
        metadata_json=json.dumps(
            build_metadata_v2(
                exif=PHOTO_EXIF, probe=PHOTO_PROBE, file_path="/x.jpg", file_size=1
            )
        ),
    )
    data = serialize_clip(clip)
    assert data["altitude"] == 100.5
    assert data["media_kind"] == "photo"
    assert data["lens_model"] == "Lens"
    assert data["iso"] == 200
    assert data["has_gps"] is True
    assert data["metadata"]["schema_version"] == 2
    assert "email" not in json.dumps(data.get("uploaded_by") or {})
