from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PersonResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class CreatePersonRequest(BaseModel):
    name: str


class CategoryResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class CreateCategoryRequest(BaseModel):
    name: str


class UploaderInfo(BaseModel):
    id: str
    display_name: Optional[str] = None
    email: Optional[str] = None


class ClipResponse(BaseModel):
    id: int
    library_id: Optional[int] = None
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
    uploaded_by: Optional[UploaderInfo] = None
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


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class LibrarySummary(BaseModel):
    id: int
    type: str
    name: str
    workspace_id: Optional[int] = None
    role: str


class MeResponse(BaseModel):
    user: UserResponse
    libraries: List[LibrarySummary]
    active_library: LibrarySummary


class CreateWorkspaceRequest(BaseModel):
    name: str


class JoinWorkspaceRequest(BaseModel):
    code: str


class WorkspaceResponse(BaseModel):
    id: int
    name: str
    slug: str
    library_id: int
    role: str
    join_code_prefix: Optional[str] = None
    join_code_active: bool = False


class CreateWorkspaceResponse(WorkspaceResponse):
    join_code: str


class JoinCodeResponse(BaseModel):
    join_code: Optional[str] = None
    join_code_prefix: Optional[str] = None
    join_code_active: bool = False


class WorkspaceMemberResponse(BaseModel):
    user_id: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    role: str
    joined_at: Optional[datetime] = None
