import json
from typing import Any, Dict, List, Optional

from models import Clip


def _parse_metadata_json(raw: Optional[str]) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def serialize_clip(clip: Clip) -> Dict[str, Any]:
    metadata = _parse_metadata_json(getattr(clip, "metadata_json", None))
    uploader = getattr(clip, "uploader", None)
    uploaded_by = None
    if getattr(clip, "uploaded_by_user_id", None):
        uploaded_by = {
            "id": clip.uploaded_by_user_id,
            "display_name": uploader.display_name if uploader else None,
            "email": uploader.email if uploader else None,
        }
    return {
        "id": clip.id,
        "library_id": getattr(clip, "library_id", None),
        "title": clip.title,
        "description": clip.description,
        "category": clip.category_rel.name if clip.category_rel else None,
        "people": [person.name for person in clip.people],
        "blob_url": clip.blob_url,
        "thumbnail_url": clip.thumbnail_url,
        "original_filename": clip.original_filename,
        "stored_filename": clip.stored_filename,
        "camera_model": clip.camera_model,
        "camera_make": getattr(clip, "camera_make", None),
        "latitude": clip.latitude,
        "longitude": clip.longitude,
        "location_label": getattr(clip, "location_label", None),
        "recorded_at": clip.recorded_at,
        "uploaded_at": clip.uploaded_at,
        "uploaded_by": uploaded_by,
        "file_size": clip.file_size,
        "mime_type": getattr(clip, "mime_type", None),
        "width": getattr(clip, "width", None),
        "height": getattr(clip, "height", None),
        "duration_seconds": getattr(clip, "duration_seconds", None),
        "metadata": metadata,
    }


def serialize_clips(clips: List[Clip]) -> List[Dict[str, Any]]:
    return [serialize_clip(clip) for clip in clips]
