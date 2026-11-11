from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from models import Category, Clip, Person
from services.clip_storage_refs import clip_has_b2_structured_key, clip_media_ref, clip_thumbnail_ref
from services.storage import get_storage_service
from services.storage.types import StoragePurpose


def get_all_clips(db: Session, library_id: int) -> List[Clip]:
    return (
        db.query(Clip)
        .options(
            joinedload(Clip.category_rel),
            joinedload(Clip.people),
            joinedload(Clip.uploader),
        )
        .filter(Clip.library_id == library_id)
        .order_by(Clip.uploaded_at.desc())
        .all()
    )


def get_clip_by_id(
    db: Session,
    clip_id: int,
    library_id: int,
) -> Clip:
    clip = (
        db.query(Clip)
        .options(
            joinedload(Clip.category_rel),
            joinedload(Clip.people),
            joinedload(Clip.uploader),
        )
        .filter(Clip.id == clip_id, Clip.library_id == library_id)
        .first()
    )

    if not clip:
        raise HTTPException(
            status_code=404,
            detail="Clip not found",
        )

    return clip


def search_clips(
    db: Session,
    query: str,
    library_id: int,
) -> List[Clip]:
    """Legacy ILIKE search — prefer search_service.search_clips_ranked."""
    pattern = f"%{query}%"

    return (
        db.query(Clip)
        .options(joinedload(Clip.category_rel), joinedload(Clip.people))
        .outerjoin(Category)
        .filter(Clip.library_id == library_id)
        .filter(
            or_(
                Clip.title.ilike(pattern),
                Clip.description.ilike(pattern),
                Category.name.ilike(pattern),
            )
        )
        .order_by(Clip.uploaded_at.desc())
        .all()
    )


def get_categories(db: Session, library_id: int):
    return (
        db.query(Category)
        .filter(Category.library_id == library_id)
        .order_by(Category.name)
        .all()
    )


def get_people(db: Session, library_id: int):
    return (
        db.query(Person)
        .filter(Person.library_id == library_id)
        .order_by(Person.name)
        .all()
    )


def create_category(db: Session, name: str, library_id: int):
    existing = (
        db.query(Category)
        .filter(Category.library_id == library_id, Category.name == name)
        .first()
    )
    if existing:
        return existing

    category = Category(name=name, library_id=library_id)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def create_person(db: Session, name: str, library_id: int):
    existing = (
        db.query(Person)
        .filter(Person.library_id == library_id, Person.name == name)
        .first()
    )
    if existing:
        return existing

    person = Person(name=name, library_id=library_id)
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


def delete_clip(db: Session, clip_id: int, library_id: int) -> None:
    clip = (
        db.query(Clip)
        .filter(Clip.id == clip_id, Clip.library_id == library_id)
        .first()
    )

    if not clip:
        raise HTTPException(
            status_code=404,
            detail="Clip not found",
        )

    storage = get_storage_service()
    media_ref = clip_media_ref(clip)
    thumb_ref = clip_thumbnail_ref(clip)

    try:
        if media_ref:
            storage.delete_object(media_ref, library_id=library_id)
        elif clip.blob_url and not clip_has_b2_structured_key(clip, StoragePurpose.MEDIA):
            storage.delete_by_url(clip.blob_url, library_id=library_id)
    except Exception as e:
        print(f"Failed to delete video blob: {e}")

    try:
        if thumb_ref:
            storage.delete_object(thumb_ref, library_id=library_id)
        elif clip.thumbnail_url and not clip_has_b2_structured_key(
            clip, StoragePurpose.THUMBNAIL
        ):
            storage.delete_by_url(clip.thumbnail_url, library_id=library_id)
    except Exception as e:
        print(f"Failed to delete thumbnail blob: {e}")

    db.delete(clip)
    db.commit()


def resolve_category_in_library(
    db: Session,
    *,
    library_id: int,
    category_name: Optional[str],
) -> Optional[int]:
    if not category_name:
        return None
    category = (
        db.query(Category)
        .filter(Category.library_id == library_id, Category.name == category_name)
        .first()
    )
    return category.id if category else None
