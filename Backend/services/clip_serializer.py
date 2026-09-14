"""Serialize Clip ORM rows for API responses."""

import json
from typing import Any, Dict, List, Optional

from auth.config import get_settings
from models import Clip


def _parse_metadata_json(raw: Optional[str]) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def _metadata_for_client(raw: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Return metadata for API consumers; v1 passthrough, v2 includes legacy section shims."""
    if not raw:
        return None
    if raw.get("schema_version") != 2:
        return raw

    device = raw.get("device") or {}
    lens = raw.get("lens_exposure") or {}
    capture = raw.get("capture") or {}
    location = raw.get("location") or {}
    file_info = raw.get("file") or {}
    video = raw.get("video") or {}
    audio = raw.get("audio") or {}
    vstream = video.get("stream") or {}
    astream = audio.get("stream") or {}

    legacy_capture = {
        "captured_at": capture.get("captured_at"),
        "camera_make": device.get("make"),
        "camera_model": device.get("model"),
        "lens_model": lens.get("lens_model"),
        "focal_length": lens.get("focal_length_mm"),
        "focal_length_35mm": lens.get("focal_length_35mm_equiv"),
        "aperture": lens.get("aperture_f"),
        "shutter_speed": lens.get("shutter_s"),
        "iso": lens.get("iso"),
        "exposure_compensation": lens.get("exposure_compensation"),
        "flash": lens.get("flash"),
        "white_balance": lens.get("white_balance"),
        "software": (raw.get("provenance") or {}).get("file_history", {}).get("software"),
        "orientation": lens.get("orientation"),
        "color_space": lens.get("color_space"),
    }
    legacy_file = {
        "filename": file_info.get("original_filename"),
        "file_size": file_info.get("size_bytes"),
        "mime_type": file_info.get("mime_type"),
        "extension": file_info.get("extension"),
        "width": file_info.get("width"),
        "height": file_info.get("height"),
    }
    legacy_video = {
        "duration_seconds": video.get("duration_seconds"),
        "codec": vstream.get("codec"),
        "frame_rate": vstream.get("frame_rate"),
        "bitrate": video.get("bitrate") or vstream.get("bitrate"),
        "container": video.get("container"),
        "audio_codec": astream.get("codec"),
        "audio_channels": astream.get("channels"),
        "audio_sample_rate": astream.get("sample_rate"),
    }

    return {
        **raw,
        "capture": legacy_capture,
        "file": legacy_file,
        "location": location,
        "video": legacy_video,
        "audio": audio,
    }


def serialize_clip(clip: Clip) -> Dict[str, Any]:
    metadata = _metadata_for_client(_parse_metadata_json(getattr(clip, "metadata_json", None)))
    uploader = getattr(clip, "uploader", None)
    uploaded_by = None
    if getattr(clip, "uploaded_by_user_id", None):
        uploaded_by = {
            "id": clip.uploaded_by_user_id,
            "display_name": uploader.display_name if uploader else None,
        }
    hide_direct_urls = get_settings().hide_direct_media_urls
    return {
        "id": clip.id,
        "library_id": getattr(clip, "library_id", None),
        "title": clip.title,
        "description": clip.description,
        "category": clip.category_rel.name if clip.category_rel else None,
        "people": [person.name for person in clip.people],
        "blob_url": None if hide_direct_urls else clip.blob_url,
        "thumbnail_url": None if hide_direct_urls else clip.thumbnail_url,
        "original_filename": clip.original_filename,
        "stored_filename": clip.stored_filename,
        "camera_model": clip.camera_model,
        "camera_make": getattr(clip, "camera_make", None),
        "latitude": clip.latitude,
        "longitude": clip.longitude,
        "altitude": getattr(clip, "altitude", None),
        "location_label": getattr(clip, "location_label", None),
        "recorded_at": clip.recorded_at,
        "uploaded_at": clip.uploaded_at,
        "uploaded_by": uploaded_by,
        "file_size": clip.file_size,
        "mime_type": getattr(clip, "mime_type", None),
        "width": getattr(clip, "width", None),
        "height": getattr(clip, "height", None),
        "duration_seconds": getattr(clip, "duration_seconds", None),
        "media_kind": getattr(clip, "media_kind", None),
        "lens_model": getattr(clip, "lens_model", None),
        "iso": getattr(clip, "iso", None),
        "video_codec": getattr(clip, "video_codec", None),
        "audio_codec": getattr(clip, "audio_codec", None),
        "has_gps": bool(clip.has_gps) if getattr(clip, "has_gps", None) is not None else None,
        "capture_timezone_offset": getattr(clip, "capture_timezone_offset", None),
        "software": getattr(clip, "software", None),
        "metadata": metadata,
    }


def serialize_clips(clips: List[Clip]) -> List[Dict[str, Any]]:
    return [serialize_clip(clip) for clip in clips]
