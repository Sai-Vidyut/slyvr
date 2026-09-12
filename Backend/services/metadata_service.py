import json
import mimetypes
import os
import subprocess
from datetime import datetime
from typing import Any, Dict, Optional


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
    if not value or not isinstance(value, str):
        return None
    for fmt in (
        "%Y:%m:%d %H:%M:%S%z",
        "%Y:%m:%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
    ):
        try:
            cleaned = value.replace("Z", "+0000") if fmt.endswith("%z") else value
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    return None


def _run_exiftool_json(file_path: str) -> Dict[str, Any]:
    # Avoid -G1 so keys stay unprefixed (Make, Model, GPSLatitude, …)
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


def extract_media_metadata(file_path: str) -> Dict[str, Any]:
    """Extract structured metadata from photos/videos using ExifTool + ffprobe."""
    exif: Dict[str, Any] = {}
    try:
        exif = _run_exiftool_json(file_path)
    except RuntimeError:
        exif = {}

    probe = _run_ffprobe_json(file_path)

    mime_type, _ = mimetypes.guess_type(file_path)
    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else None
    filename = os.path.basename(file_path)

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

    video_stream = next(
        (
            s
            for s in probe.get("streams", [])
            if isinstance(s, dict) and s.get("codec_type") == "video"
        ),
        None,
    )
    audio_stream = next(
        (
            s
            for s in probe.get("streams", [])
            if isinstance(s, dict) and s.get("codec_type") == "audio"
        ),
        None,
    )

    if video_stream:
        width = width or _safe_int(video_stream.get("width"))
        height = height or _safe_int(video_stream.get("height"))

    duration = _safe_float(probe.get("format", {}).get("duration"))
    if duration is None:
        duration = _safe_float(exif.get("Duration"))

    captured_at = (
        _parse_exif_date(exif.get("DateTimeOriginal"))
        or _parse_exif_date(exif.get("CreateDate"))
        or _parse_exif_date(exif.get("MediaCreateDate"))
    )

    latitude = _safe_float(exif.get("GPSLatitude"))
    longitude = _safe_float(exif.get("GPSLongitude"))
    altitude = _safe_float(exif.get("GPSAltitude"))

    camera_make = exif.get("Make") or exif.get("CameraMake")
    camera_model = exif.get("Model") or exif.get("CameraModel")

    structured = {
        "file": {
            "filename": filename,
            "file_size": file_size,
            "mime_type": mime_type,
            "extension": os.path.splitext(filename)[1].lstrip(".").lower() or None,
            "width": width,
            "height": height,
        },
        "capture": {
            "captured_at": captured_at.isoformat() if captured_at else None,
            "camera_make": camera_make,
            "camera_model": camera_model,
            "lens_model": exif.get("LensModel") or exif.get("Lens"),
            "focal_length": exif.get("FocalLength"),
            "focal_length_35mm": exif.get("FocalLengthIn35mmFormat"),
            "aperture": exif.get("FNumber") or exif.get("Aperture"),
            "shutter_speed": exif.get("ShutterSpeed") or exif.get("ExposureTime"),
            "iso": exif.get("ISO"),
            "exposure_compensation": exif.get("ExposureCompensation"),
            "flash": exif.get("Flash"),
            "white_balance": exif.get("WhiteBalance"),
            "software": exif.get("Software"),
            "orientation": exif.get("Orientation"),
            "color_space": exif.get("ColorSpace"),
        },
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "altitude": altitude,
            "gps_timestamp": exif.get("GPSTimeStamp") or exif.get("GPSDateStamp"),
        },
        "video": {
            "duration_seconds": duration,
            "codec": video_stream.get("codec_name") if video_stream else None,
            "frame_rate": video_stream.get("avg_frame_rate") if video_stream else None,
            "bitrate": _safe_int(probe.get("format", {}).get("bit_rate")),
            "container": probe.get("format", {}).get("format_name"),
            "audio_codec": audio_stream.get("codec_name") if audio_stream else None,
            "audio_channels": _safe_int(audio_stream.get("channels")) if audio_stream else None,
            "audio_sample_rate": _safe_int(audio_stream.get("sample_rate")) if audio_stream else None,
        },
    }

    return {
        "camera_model": camera_model,
        "camera_make": camera_make,
        "create_date": exif.get("CreateDate"),
        "gps_latitude": latitude,
        "gps_longitude": longitude,
        "gps_altitude": altitude,
        "recorded_at": captured_at,
        "mime_type": mime_type,
        "width": width,
        "height": height,
        "duration_seconds": duration,
        "metadata": structured,
    }


# Backward-compatible alias used by older imports
def extract_metadata(file_path: str) -> Dict[str, Any]:
    return extract_media_metadata(file_path)
