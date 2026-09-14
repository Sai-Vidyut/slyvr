from __future__ import annotations

from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.deps import ActiveLibraryContext, get_active_library_context, get_db
from models import Category, Clip, Person
from schemas.clip_schema import (
    CategoryResponse,
    ClipListResponse,
    ClipReadUrlResponse,
    ClipResponse,
    CreateCategoryRequest,
    CreatePersonRequest,
    PersonResponse,
    SearchResponse,
)
from services.clip_read_access import issue_clip_read_access
from services.clip_serializer import serialize_clip, serialize_clips
from services.clip_service import (
    delete_clip,
    get_all_clips,
    get_categories,
    get_clip_by_id,
    resolve_category_in_library,
)
from services.search_service import search_clips_ranked
from services.storage.types import StoragePurpose

router = APIRouter()


class ClipUpdate(BaseModel):
    title: str
    description: str
    category: str


@router.get("/clips", response_model=ClipListResponse)
def read_clips(
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    clips = get_all_clips(db, ctx.library.id)
    return {"clips": serialize_clips(clips)}


@router.get("/clips/search", response_model=SearchResponse)
def search(
    q: str = Query(""),
    person: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    device: Optional[str] = Query(None),
    year: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    media_kind: Optional[str] = Query(None),
    has_gps: Optional[bool] = Query(None),
    lens_model: Optional[str] = Query(None),
    video_codec: Optional[str] = Query(None),
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    clips, facets = search_clips_ranked(
        db,
        q,
        library_id=ctx.library.id,
        person=person,
        category=category,
        device=device,
        year=year,
        location=location,
        file_type=file_type,
        media_kind=media_kind,
        has_gps=has_gps,
        lens_model=lens_model,
        video_codec=video_codec,
    )
    return {
        "clips": serialize_clips(clips),
        "facets": facets,
    }


@router.get("/clips/{clip_id}/read-url", response_model=ClipReadUrlResponse)
def clip_read_url(
    clip_id: int,
    purpose: Literal["media", "thumbnail"] = Query(...),
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    clip = get_clip_by_id(db, clip_id, ctx.library.id)
    storage_purpose = (
        StoragePurpose.MEDIA if purpose == "media" else StoragePurpose.THUMBNAIL
    )
    access = issue_clip_read_access(
        clip, library_id=ctx.library.id, purpose=storage_purpose
    )
    return {"url": access.url, "expires_at": access.expires_at}


@router.get("/clips/{clip_id}", response_model=ClipResponse)
def read_clip(
    clip_id: int,
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    clip = get_clip_by_id(db, clip_id, ctx.library.id)
    return serialize_clip(clip)


@router.delete("/clips/{clip_id}")
def remove_clip(
    clip_id: int,
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    delete_clip(db, clip_id, ctx.library.id)
    return {"detail": "Clip deleted successfully"}


@router.put("/clips/{clip_id}")
def update_clip(
    clip_id: int,
    data: ClipUpdate,
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    clip = (
        db.query(Clip)
        .filter(Clip.id == clip_id, Clip.library_id == ctx.library.id)
        .first()
    )
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    clip.title = data.title
    clip.description = data.description
    clip.category_id = resolve_category_in_library(
        db, library_id=ctx.library.id, category_name=data.category or None
    )

    db.commit()
    db.refresh(clip)
    return {"message": "Clip updated successfully"}


@router.get("/categories")
def categories(
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    return {"categories": get_categories(db, ctx.library.id)}


@router.get("/categories/all", response_model=List[CategoryResponse])
def get_all_categories(
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    return (
        db.query(Category)
        .filter(Category.library_id == ctx.library.id)
        .order_by(Category.name)
        .all()
    )


@router.post("/categories")
def create_category(
    data: CreateCategoryRequest,
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Category)
        .filter(Category.library_id == ctx.library.id, Category.name == data.name)
        .first()
    )
    if existing:
        return existing

    category = Category(name=data.name, library_id=ctx.library.id)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/by-name/{name}")
def delete_category_by_name(
    name: str,
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    category = (
        db.query(Category)
        .filter(Category.library_id == ctx.library.id, Category.name == name)
        .first()
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    db.delete(category)
    db.commit()
    return {"message": "Category deleted"}


@router.get("/people", response_model=List[PersonResponse])
def get_people(
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    return (
        db.query(Person)
        .filter(Person.library_id == ctx.library.id)
        .order_by(Person.name)
        .all()
    )


@router.post("/people")
def create_person(
    data: CreatePersonRequest,
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Person)
        .filter(Person.library_id == ctx.library.id, Person.name == data.name)
        .first()
    )
    if existing:
        return existing

    person = Person(name=data.name, library_id=ctx.library.id)
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


@router.delete("/people/by-name/{name}")
def delete_person_by_name(
    name: str,
    ctx: ActiveLibraryContext = Depends(get_active_library_context),
    db: Session = Depends(get_db),
):
    person = (
        db.query(Person)
        .filter(Person.library_id == ctx.library.id, Person.name == name)
        .first()
    )
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    db.delete(person)
    db.commit()
    return {"message": "Person deleted"}
