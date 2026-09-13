import json
import mimetypes
import os
import shutil
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import logging

from auth.config import get_settings
from auth.deps import ActiveLibraryContext, get_active_library_context
from database import SessionLocal, ensure_schema
from models import Clip, Person
from routes.clips import router as clips_router
from routes.me import router as me_router
from routes.workspaces import router as workspaces_router
from services.ffmpeg_service import generate_thumbnail
from services.storage import StoragePurpose, get_storage_service
from services.metadata_service import extract_media_metadata
from services.upload_safety import safe_upload_basename

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Clear cached settings after dotenv load
get_settings.cache_clear()

ensure_schema()

app = FastAPI(title="Slyvr")

app.include_router(clips_router)
app.include_router(me_router)
app.include_router(workspaces_router)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = "./temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tif", ".tiff", ".gif"}


def _is_image(filename: str, content_type: Optional[str]) -> bool:
    ext = os.path.splitext(filename or "")[1].lower()
    if ext in IMAGE_EXTENSIONS:
        return True
    return bool(content_type and content_type.startswith("image/"))


def _prepare_thumbnail(temp_media_path: str, is_image: bool) -> str:
    if is_image:
        thumb_path = f"{temp_media_path}.thumb{os.path.splitext(temp_media_path)[1] or '.jpg'}"
        shutil.copy2(temp_media_path, thumb_path)
        return thumb_path
    return generate_thumbnail(temp_media_path)


@app.post("/upload")
async def upload_media(
    video: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    category_id: int = Form(None),
    person_ids: str = Form(""),
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
):
    """Accept video or still image uploads. Field name kept as `video` for API compatibility."""
    temp_media_path = None
    temp_thumbnail_path = None
    db = None

    try:
        db = SessionLocal()
        library_id = ctx.library.id
        uploader_id = ctx.user.id

        # Ignore any client-supplied uploader identity; JWT context is authoritative.
        original_name = safe_upload_basename(video.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        stored_filename = f"{timestamp}_{original_name}"
        temp_media_path = os.path.join(TEMP_DIR, stored_filename)
        temp_resolved = os.path.realpath(temp_media_path)
        temp_root = os.path.realpath(TEMP_DIR)
        if not temp_resolved.startswith(temp_root + os.sep) and temp_resolved != temp_root:
            raise HTTPException(status_code=400, detail="Invalid upload filename")

        max_bytes = settings.max_upload_bytes
        file_size = 0
        with open(temp_media_path, "wb") as buffer:
            while True:
                chunk = await video.read(1024 * 1024)
                if not chunk:
                    break
                file_size += len(chunk)
                if file_size > max_bytes:
                    raise HTTPException(status_code=413, detail="Upload too large")
                buffer.write(chunk)
        is_image = _is_image(original_name, video.content_type)

        logger.info("Media saved temporarily at %s (image=%s)", temp_media_path, is_image)

        try:
            extracted = extract_media_metadata(temp_media_path)
        except Exception as meta_err:
            logger.warning("Metadata extraction failed (continuing): %s", meta_err)
            extracted = {
                "camera_model": None,
                "camera_make": None,
                "gps_latitude": None,
                "gps_longitude": None,
                "gps_altitude": None,
                "recorded_at": None,
                "mime_type": mimetypes.guess_type(temp_media_path)[0] or video.content_type,
                "width": None,
                "height": None,
                "duration_seconds": None,
                "metadata": None,
            }

        temp_thumbnail_path = _prepare_thumbnail(temp_media_path, is_image)
        logger.info("Thumbnail prepared at %s", temp_thumbnail_path)

        storage = get_storage_service()
        media_stored = storage.upload_file(
            temp_media_path,
            library_id=library_id,
            purpose=StoragePurpose.MEDIA,
        )
        thumbnail_stored = storage.upload_file(
            temp_thumbnail_path,
            library_id=library_id,
            purpose=StoragePurpose.THUMBNAIL,
        )

        structured = extracted.get("metadata")
        metadata_json = json.dumps(structured) if structured else None

        # Validate category belongs to active library when provided
        resolved_category_id = None
        if category_id is not None:
            from models import Category

            category = (
                db.query(Category)
                .filter(Category.id == category_id, Category.library_id == library_id)
                .first()
            )
            if category:
                resolved_category_id = category.id

        clip = Clip(
            library_id=library_id,
            uploaded_by_user_id=uploader_id,
            title=title,
            description=description,
            category_id=resolved_category_id,
            storage_provider=media_stored.provider,
            media_object_key=media_stored.object_key,
            thumbnail_object_key=thumbnail_stored.object_key,
            blob_url=media_stored.read_url,
            thumbnail_url=thumbnail_stored.read_url,
            original_filename=original_name,
            stored_filename=stored_filename,
            file_size=file_size,
            camera_model=extracted.get("camera_model"),
            camera_make=extracted.get("camera_make"),
            latitude=extracted.get("gps_latitude"),
            longitude=extracted.get("gps_longitude"),
            altitude=extracted.get("gps_altitude"),
            recorded_at=extracted.get("recorded_at"),
            mime_type=extracted.get("mime_type") or video.content_type,
            width=extracted.get("width"),
            height=extracted.get("height"),
            duration_seconds=extracted.get("duration_seconds"),
            metadata_json=metadata_json,
        )

        if person_ids:
            ids = [int(x) for x in person_ids.split(",") if x.strip()]
            people = (
                db.query(Person)
                .filter(Person.id.in_(ids), Person.library_id == library_id)
                .all()
            )
            clip.people = people

        db.add(clip)
        db.commit()
        db.refresh(clip)

        for path in (temp_media_path, temp_thumbnail_path):
            if path and os.path.exists(path):
                os.remove(path)

        hide_upload_urls = get_settings().hide_direct_media_urls
        return {
            "success": True,
            "message": "Media uploaded successfully",
            "clip_id": clip.id,
            "library_id": library_id,
            "uploaded_by_user_id": uploader_id,
            "video_blob_url": None if hide_upload_urls else media_stored.read_url,
            "thumbnail_blob_url": None if hide_upload_urls else thumbnail_stored.read_url,
            "metadata": extracted,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error during upload")

        for path in (temp_media_path, temp_thumbnail_path):
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass

        raise HTTPException(status_code=500, detail="Upload failed")

    finally:
        if db:
            db.close()


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
    )
