"""Extract and normalize photo/video metadata (ExifTool + ffprobe)."""

from __future__ import annotations

import json
import mimetypes
import os
import subprocess
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

METADATA_SCHEMA_VERSION = 2

_CAPTURE_SOURCE_PRIORITY = (
    ("exif_original", ("DateTimeOriginal",)),
    ("exif_create", ("CreateDate",)),
    ("quicktime_media", ("MediaCreateDate", "TrackCreateDate", "ContentCreateDate")),
    ("ffprobe_creation", ("creation_time",)),  # format/stream tags key name
)


def _safe_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _safe_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _parse_exif_date(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        # ExifTool -n may emit unix-ish for some tags; treat cautiously
        try:
            return datetime.fromtimestamp(float(value), tz=timezone.utc)
        except (OSError, ValueError, OverflowError):
            return None
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None
    for fmt in (
        "%Y:%m:%d %H:%M:%S%z",
        "%Y:%m:%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
    ):
        try:
            cleaned = text.replace("Z", "+0000") if "%z" in fmt else text
            dt = datetime.strptime(cleaned, fmt)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


def _parse_ffprobe_creation(value: Any) -> Optional[datetime]:
    if not value or not isinstance(value, str):
        return None
    text = value.strip()
    if "." in text and text.endswith("Z"):
        base, _frac = text[:-1].split(".", 1)
        text = base + "Z"
    if text.endswith("Z"):
        text = text[:-1] + "+0000"
    return _parse_exif_date(text)


def _timezone_offset_from_exif(exif: Dict[str, Any]) -> Optional[str]:
    for key in ("OffsetTimeOriginal", "OffsetTime", "TimeZoneOffset", "OffsetTimeDigitized"):
        val = exif.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
    return None


def _resolve_captured_at(
    exif: Dict[str, Any], probe: Dict[str, Any]
) -> Tuple[Optional[datetime], Optional[str]]:
    for source, keys in _CAPTURE_SOURCE_PRIORITY:
        if source == "ffprobe_creation":
            fmt = probe.get("format") if isinstance(probe.get("format"), dict) else {}
            tags = fmt.get("tags") if isinstance(fmt.get("tags"), dict) else {}
            raw = tags.get("creation_time")
            dt = _parse_ffprobe_creation(raw)
            if dt:
                return dt, source
            for stream in probe.get("streams") or []:
                if not isinstance(stream, dict):
                    continue
                stags = stream.get("tags") if isinstance(stream.get("tags"), dict) else {}
                raw = stags.get("creation_time")
                dt = _parse_ffprobe_creation(raw)
                if dt:
                    return dt, source
            continue
        for key in keys:
            dt = _parse_exif_date(exif.get(key))
            if dt:
                return dt, source
    return None, None


def _run_exiftool_json(file_path: str) -> Dict[str, Any]:
    command = ["exiftool", "-j", "-n", file_path]
    try:
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("ExifTool not found on PATH.") from exc

    if result.returncode != 0:
        stderr = (result.stderr or "").strip() or "Unknown ExifTool error"
        raise RuntimeError(f"ExifTool failed: {stderr}")

    items = json.loads(result.stdout or "[]")
    if not isinstance(items, list) or not items:
        return {}
    item = items[0]
    return item if isinstance(item, dict) else {}


def _run_ffprobe_json(file_path: str) -> Dict[str, Any]:
    command = [
        "ffprobe",
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        file_path,
    ]
    try:
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return {}

    if result.returncode != 0:
        return {}

    try:
        payload = json.loads(result.stdout or "{}")
        return payload if isinstance(payload, dict) else {}
    except json.JSONDecodeError:
        return {}


def _streams_by_type(probe: Dict[str, Any]) -> Tuple[Optional[Dict], Optional[Dict], List[Dict]]:
    video_stream = None
    audio_stream = None
    all_streams: List[Dict] = []
    for stream in probe.get("streams") or []:
        if not isinstance(stream, dict):
            continue
        all_streams.append(stream)
        ctype = stream.get("codec_type")
        if ctype == "video" and video_stream is None:
            video_stream = stream
        elif ctype == "audio" and audio_stream is None:
            audio_stream = stream
    return video_stream, audio_stream, all_streams


def _infer_media_kind(
    mime_type: Optional[str],
    video_stream: Optional[Dict],
    audio_stream: Optional[Dict],
    *,
    filename: str,
) -> str:
    if video_stream is not None:
        return "video"
    if mime_type:
        if mime_type.startswith("video/"):
            return "video"
        if mime_type.startswith("audio/"):
            return "audio"
        if mime_type.startswith("image/"):
            return "photo"
    ext = os.path.splitext(filename)[1].lower()
    if ext in {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"}:
        return "video"
    if ext in {".mp3", ".wav", ".aac", ".flac", ".m4a", ".ogg"}:
        return "audio"
    if audio_stream is not None and video_stream is None:
        return "audio"
    return "photo"


def _rotation_degrees(exif: Dict[str, Any], video_stream: Optional[Dict]) -> Optional[int]:
    rot = _safe_int(exif.get("Rotation"))
    if rot is not None:
        return rot
    orient = _safe_int(exif.get("Orientation"))
    if orient in {3, 4}:
        return 180
    if orient in {5, 6, 7, 8}:
        return 90
    if video_stream:
        tags = video_stream.get("tags") if isinstance(video_stream.get("tags"), dict) else {}
        display_matrix = tags.get("rotate") or video_stream.get("rotation")
        return _safe_int(display_matrix)
    return None


def build_metadata_v2(
    *,
    exif: Dict[str, Any],
    probe: Dict[str, Any],
    file_path: str,
    file_size: Optional[int],
) -> Dict[str, Any]:
    """Build schema v2 metadata document (no ingest provenance — added at upload)."""
    mime_type, _ = mimetypes.guess_type(file_path)
    filename = os.path.basename(file_path)

    video_stream, audio_stream, _ = _streams_by_type(probe)
    media_kind = _infer_media_kind(mime_type, video_stream, audio_stream, filename=filename)

    width = _safe_int(
        exif.get("ImageWidth")
        or exif.get("ExifImageWidth")
        or exif.get("SourceImageWidth")
    )
    height = _safe_int(
        exif.get("ImageHeight")
        or exif.get("ExifImageHeight")
        or exif.get("SourceImageHeight")
    )
    if video_stream:
        width = width or _safe_int(video_stream.get("width"))
        height = height or _safe_int(video_stream.get("height"))

    fmt = probe.get("format") if isinstance(probe.get("format"), dict) else {}
    fmt_tags = fmt.get("tags") if isinstance(fmt.get("tags"), dict) else {}

    duration = _safe_float(fmt.get("duration"))
    if duration is None:
        duration = _safe_float(exif.get("Duration"))

    captured_at, captured_at_source = _resolve_captured_at(exif, probe)
    modified_at = (
        _parse_exif_date(exif.get("ModifyDate"))
        or _parse_exif_date(exif.get("FileModifyDate"))
        or _parse_exif_date(exif.get("MediaModifyDate"))
    )

    latitude = _safe_float(exif.get("GPSLatitude"))
    longitude = _safe_float(exif.get("GPSLongitude"))
    altitude = _safe_float(exif.get("GPSAltitude"))
    gps_accuracy = _safe_float(exif.get("GPSHPositioningError") or exif.get("GPSDOP"))

    camera_make = exif.get("Make") or exif.get("CameraMake")
    camera_model = exif.get("Model") or exif.get("CameraModel")
    lens_model = exif.get("LensModel") or exif.get("Lens")
    iso = _safe_int(exif.get("ISO"))
    software = exif.get("Software") or exif.get("ProcessingSoftware")
    timezone_offset = _timezone_offset_from_exif(exif)

    encoder = fmt_tags.get("encoder") or fmt_tags.get("ENCODER")
    if not encoder and video_stream:
        vtags = video_stream.get("tags") if isinstance(video_stream.get("tags"), dict) else {}
        encoder = vtags.get("encoder")

    video_codec = video_stream.get("codec_name") if video_stream else None
    audio_codec = audio_stream.get("codec_name") if audio_stream else None

    rotation = _rotation_degrees(exif, video_stream)

    structured: Dict[str, Any] = {
        "schema_version": METADATA_SCHEMA_VERSION,
        "capture": {
            "captured_at": captured_at.isoformat() if captured_at else None,
            "captured_at_source": captured_at_source,
            "modified_at": modified_at.isoformat() if modified_at else None,
            "timezone_offset": timezone_offset,
        },
        "device": {
            "make": camera_make,
            "model": camera_model,
        },
        "lens_exposure": {
            "lens_model": lens_model,
            "focal_length_mm": exif.get("FocalLength"),
            "focal_length_35mm_equiv": exif.get("FocalLengthIn35mmFormat"),
            "aperture_f": exif.get("FNumber") or exif.get("Aperture"),
            "shutter_s": exif.get("ShutterSpeed") or exif.get("ExposureTime"),
            "iso": iso,
            "exposure_compensation": exif.get("ExposureCompensation"),
            "flash": exif.get("Flash"),
            "white_balance": exif.get("WhiteBalance"),
            "orientation": exif.get("Orientation"),
            "color_space": exif.get("ColorSpace"),
        },
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "altitude": altitude,
            "gps_timestamp": exif.get("GPSTimeStamp") or exif.get("GPSDateStamp"),
            "horizontal_accuracy_m": gps_accuracy,
        },
        "video": {
            "duration_seconds": duration,
            "container": fmt.get("format_name"),
            "bitrate": _safe_int(fmt.get("bit_rate")),
            "rotation_degrees": rotation,
            "stream": None
            if not video_stream
            else {
                "codec": video_codec,
                "profile": video_stream.get("profile"),
                "level": video_stream.get("level"),
                "width": _safe_int(video_stream.get("width")),
                "height": _safe_int(video_stream.get("height")),
                "frame_rate": video_stream.get("avg_frame_rate") or video_stream.get("r_frame_rate"),
                "pixel_format": video_stream.get("pix_fmt"),
                "bitrate": _safe_int(video_stream.get("bit_rate")),
            },
        },
        "audio": {
            "stream": None
            if not audio_stream
            else {
                "codec": audio_codec,
                "channels": _safe_int(audio_stream.get("channels")),
                "sample_rate": _safe_int(audio_stream.get("sample_rate")),
                "bitrate": _safe_int(audio_stream.get("bit_rate")),
            },
        },
        "file": {
            "original_filename": filename,
            "extension": os.path.splitext(filename)[1].lstrip(".").lower() or None,
            "mime_type": mime_type,
            "size_bytes": file_size,
            "width": width,
            "height": height,
            "media_kind": media_kind,
        },
        "provenance": {
            "file_history": {
                "software": software,
                "encoder": encoder,
                "create_date_raw": exif.get("CreateDate"),
                "modify_date_raw": exif.get("ModifyDate") or exif.get("MediaModifyDate"),
            },
        },
    }
    return structured


def merge_upload_provenance(
    metadata: Dict[str, Any],
    *,
    uploaded_at: datetime,
    uploaded_by_user_id: str,
    uploaded_by_display_name: Optional[str],
    library_id: int,
) -> Dict[str, Any]:
    """Attach ingest provenance at upload time (no secrets or storage keys)."""
    provenance = metadata.setdefault("provenance", {})
    provenance["ingest"] = {
        "uploaded_at": uploaded_at.isoformat(),
        "uploaded_by_user_id": uploaded_by_user_id,
        "uploaded_by_display_name": uploaded_by_display_name,
        "library_id": library_id,
    }
    return metadata


def flat_fields_from_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Normalized clip columns derived from schema v2 document."""
    device = metadata.get("device") or {}
    lens = metadata.get("lens_exposure") or {}
    location = metadata.get("location") or {}
    file_info = metadata.get("file") or {}
    video = metadata.get("video") or {}
    audio = metadata.get("audio") or {}
    capture = metadata.get("capture") or {}
    provenance = metadata.get("provenance") or {}
    file_history = provenance.get("file_history") or {}
    vstream = video.get("stream") or {}
    astream = audio.get("stream") or {}

    captured_at_raw = capture.get("captured_at")
    recorded_at = _parse_exif_date(captured_at_raw) if captured_at_raw else None

    lat = _safe_float(location.get("latitude"))
    lng = _safe_float(location.get("longitude"))

    return {
        "camera_make": device.get("make"),
        "camera_model": device.get("model"),
        "gps_latitude": lat,
        "gps_longitude": lng,
        "gps_altitude": _safe_float(location.get("altitude")),
        "recorded_at": recorded_at,
        "mime_type": file_info.get("mime_type"),
        "width": _safe_int(file_info.get("width")),
        "height": _safe_int(file_info.get("height")),
        "duration_seconds": _safe_float(video.get("duration_seconds")),
        "media_kind": file_info.get("media_kind"),
        "lens_model": lens.get("lens_model"),
        "iso": _safe_int(lens.get("iso")),
        "video_codec": vstream.get("codec"),
        "audio_codec": astream.get("codec"),
        "has_gps": lat is not None and lng is not None,
        "capture_timezone_offset": capture.get("timezone_offset"),
        "software": file_history.get("software"),
    }


def extract_media_metadata(file_path: str) -> Dict[str, Any]:
    """Extract structured metadata from photos/videos using ExifTool + ffprobe."""
    exif: Dict[str, Any] = {}
    try:
        exif = _run_exiftool_json(file_path)
    except RuntimeError:
        exif = {}

    probe = _run_ffprobe_json(file_path)
    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else None

    structured = build_metadata_v2(
        exif=exif,
        probe=probe,
        file_path=file_path,
        file_size=file_size,
    )
    flat = flat_fields_from_metadata(structured)

    return {
        **flat,
        "metadata": structured,
    }


def extract_metadata(file_path: str) -> Dict[str, Any]:
    return extract_media_metadata(file_path)
