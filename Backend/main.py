import os
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging

from models import (
    Clip,
    Category,
    Person,
)

from database import (
    Base,
    engine,
    SessionLocal,
)

from services.exif_service import extract_metadata
from services.ffmpeg_service import generate_thumbnail
from services.azure_service import upload_file_to_azure

from routes.clips import router as clips_router

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Clipage")

app.include_router(clips_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

TEMP_DIR = "./temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)


@app.post("/upload")
async def upload_video(
    video: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    category_id: int = Form(None),
    person_ids: str = Form(""),
):
    temp_video_path = None
    temp_thumbnail_path = None
    db = None

    try:
        db = SessionLocal()

        timestamp = datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )

        video_filename = (
            f"{timestamp}_{video.filename}"
        )

        temp_video_path = os.path.join(
            TEMP_DIR,
            video_filename,
        )

        with open(
            temp_video_path,
            "wb",
        ) as buffer:
            content = await video.read()
            buffer.write(content)

        video_size = os.path.getsize(
            temp_video_path
        )

        logger.info(
            f"Video saved temporarily at {temp_video_path}"
        )

        metadata = extract_metadata(
            temp_video_path
        )

        logger.info(
            f"Metadata extracted: {metadata}"
        )

        temp_thumbnail_path = (
            generate_thumbnail(
                temp_video_path
            )
        )

        logger.info(
            f"Thumbnail generated at {temp_thumbnail_path}"
        )

        video_blob_url = (
            upload_file_to_azure(
                temp_video_path,
                "clips",
            )
        )

        thumbnail_blob_url = (
            upload_file_to_azure(
                temp_thumbnail_path,
                "thumbnails",
            )
        )

        clip = Clip(
            title=title,
            description=description,
            category_id=category_id,
            blob_url=video_blob_url,
            thumbnail_url=thumbnail_blob_url,
            original_filename=video.filename,
            stored_filename=video_filename,
            file_size=video_size,
            camera_model=metadata.get(
                "camera_model"
            ),
            latitude=None,
            longitude=None,
        )

        if person_ids:
            ids = [
                int(x)
                for x in person_ids.split(",")
                if x.strip()
            ]

            people = (
                db.query(Person)
                .filter(Person.id.in_(ids))
                .all()
            )

            clip.people = people

        db.add(clip)
        db.commit()
        db.refresh(clip)

        if (
            temp_video_path
            and os.path.exists(
                temp_video_path
            )
        ):
            os.remove(
                temp_video_path
            )

        if (
            temp_thumbnail_path
            and os.path.exists(
                temp_thumbnail_path
            )
        ):
            os.remove(
                temp_thumbnail_path
            )

        return {
            "success": True,
            "message":
                "Video uploaded successfully",
            "clip_id": clip.id,
            "video_blob_url":
                video_blob_url,
            "thumbnail_blob_url":
                thumbnail_blob_url,
            "metadata": metadata,
        }

    except Exception as e:
        logger.error(
            f"Error during video upload: {str(e)}"
        )

        if (
            temp_video_path
            and os.path.exists(
                temp_video_path
            )
        ):
            os.remove(
                temp_video_path
            )

        if (
            temp_thumbnail_path
            and os.path.exists(
                temp_thumbnail_path
            )
        ):
            os.remove(
                temp_thumbnail_path
            )

        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}",
        )

    finally:
        if db:
            db.close()


@app.get("/health")
async def health_check():
    return {
        "status": "healthy"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
    )
