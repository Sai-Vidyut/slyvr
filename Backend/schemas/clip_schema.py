from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# --------------------
# PEOPLE
# --------------------

class PersonResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class CreatePersonRequest(BaseModel):
    name: str


# --------------------
# CATEGORIES
# --------------------

class CategoryResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


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
    camera_make: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_label: Optional[str] = None
    recorded_at: Optional[datetime] = None
    uploaded_at: Optional[datetime] = None
    file_size: Optional[int] = 0
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    duration_seconds: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class ClipListResponse(BaseModel):
    clips: List[ClipResponse]

    class Config:
        from_attributes = True


class SearchFacets(BaseModel):
    people: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    devices: List[str] = Field(default_factory=list)
    years: List[str] = Field(default_factory=list)
    locations: List[str] = Field(default_factory=list)
    file_types: List[str] = Field(default_factory=list)


class SearchResponse(BaseModel):
    clips: List[ClipResponse]
    facets: Dict[str, List[str]] = Field(default_factory=dict)
