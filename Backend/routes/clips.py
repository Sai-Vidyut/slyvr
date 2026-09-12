from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import SessionLocal

from models import (
    Clip,
    Category,
    Person,
)

from services.clip_service import (
    get_all_clips,
    get_clip_by_id,
    get_categories,
    delete_clip,
)
from services.clip_serializer import serialize_clip, serialize_clips
from services.search_service import search_clips_ranked

from schemas.clip_schema import (
    ClipResponse,
    ClipListResponse,
    SearchResponse,
    CategoryResponse,
    CreateCategoryRequest,
    PersonResponse,
    CreatePersonRequest,
)

router = APIRouter()


class ClipUpdate(BaseModel):
    title: str
    description: str
    category: str


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --------------------
# CLIPS
# --------------------

@router.get(
    "/clips",
    response_model=ClipListResponse,
)
def read_clips(
    db: Session = Depends(get_db),
):
    clips = get_all_clips(db)
    return {"clips": serialize_clips(clips)}


@router.get(
    "/clips/search",
    response_model=SearchResponse,
)
def search(
    q: str = Query(""),
    person: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    device: Optional[str] = Query(None),
    year: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    clips, facets = search_clips_ranked(
        db,
        q,
        person=person,
        category=category,
        device=device,
        year=year,
        location=location,
        file_type=file_type,
    )
    return {
        "clips": serialize_clips(clips),
        "facets": facets,
    }


@router.get(
    "/clips/{clip_id}",
    response_model=ClipResponse,
)
def read_clip(
    clip_id: int,
    db: Session = Depends(get_db),
):
    clip = get_clip_by_id(db, clip_id)
    return serialize_clip(clip)


@router.delete("/clips/{clip_id}")
def remove_clip(
    clip_id: int,
    db: Session = Depends(get_db),
):
    delete_clip(db, clip_id)

    return {
        "detail": "Clip deleted successfully"
    }


@router.put("/clips/{clip_id}")
def update_clip(
    clip_id: int,
    data: ClipUpdate,
    db: Session = Depends(get_db),
):
    clip = (
        db.query(Clip)
        .filter(Clip.id == clip_id)
        .first()
    )

    if not clip:
        raise HTTPException(
            status_code=404,
            detail="Clip not found",
        )

    clip.title = data.title
    clip.description = data.description

    if data.category:
        category = (
            db.query(Category)
            .filter(
                Category.name == data.category
            )
            .first()
        )

        if category:
            clip.category_id = category.id
    else:
        clip.category_id = None

    db.commit()
    db.refresh(clip)

    return {
        "message": "Clip updated successfully"
    }


# --------------------
# CATEGORIES
# --------------------

@router.get("/categories")
def categories(
    db: Session = Depends(get_db),
):
    return {
        "categories": get_categories(db)
    }


@router.get(
    "/categories/all",
    response_model=list[CategoryResponse],
)
def get_all_categories(
    db: Session = Depends(get_db),
):
    return (
        db.query(Category)
        .order_by(Category.name)
        .all()
    )


@router.post("/categories")
def create_category(
    data: CreateCategoryRequest,
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Category)
        .filter(
            Category.name == data.name
        )
        .first()
    )

    if existing:
        return existing

    category = Category(
        name=data.name
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return category


@router.delete("/categories/by-name/{name}")
def delete_category_by_name(
    name: str,
    db: Session = Depends(get_db),
):
    category = (
        db.query(Category)
        .filter(Category.name == name)
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found",
        )

    db.delete(category)
    db.commit()

    return {
        "message": "Category deleted"
    }


# --------------------
# PEOPLE
# --------------------

@router.get(
    "/people",
    response_model=list[PersonResponse],
)
def get_people(
    db: Session = Depends(get_db),
):
    return (
        db.query(Person)
        .order_by(Person.name)
        .all()
    )


@router.post("/people")
def create_person(
    data: CreatePersonRequest,
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Person)
        .filter(
            Person.name == data.name
        )
        .first()
    )

    if existing:
        return existing

    person = Person(
        name=data.name
    )

    db.add(person)
    db.commit()
    db.refresh(person)

    return person


@router.delete("/people/by-name/{name}")
def delete_person_by_name(
    name: str,
    db: Session = Depends(get_db),
):
    person = (
        db.query(Person)
        .filter(Person.name == name)
        .first()
    )

    if not person:
        raise HTTPException(
            status_code=404,
            detail="Person not found",
        )

    db.delete(person)
    db.commit()

    return {
        "message": "Person deleted"
    }
