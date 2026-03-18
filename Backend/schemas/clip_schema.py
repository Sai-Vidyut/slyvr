from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


# --------------------
# PEOPLE
# --------------------

class PersonResponse(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True


class CreatePersonRequest(BaseModel):
    name: str


# --------------------
# CATEGORIES
# --------------------

class CategoryResponse(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True


class CreateCategoryRequest(BaseModel):
    name: str


# --------------------
# CLIPS
# --------------------

class ClipResponse(BaseModel):
    id: int

    title: str

    description: Optional[str] = None

    category: Optional[str] = None

    people: List[str] = []

    blob_url: Optional[str] = None

    thumbnail_url: Optional[str] = None

    original_filename: Optional[str] = None

    stored_filename: Optional[str] = None

    camera_model: Optional[str] = None

    latitude: Optional[float] = None

    longitude: Optional[float] = None

    recorded_at: Optional[datetime] = None

    uploaded_at: Optional[datetime] = None

    file_size: Optional[int] = 0

    class Config:
        orm_mode = True


class ClipListResponse(BaseModel):
    clips: List[ClipResponse]

    class Config:
        orm_mode = True