from typing import List

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from fastapi import HTTPException

from services.azure_service import delete_blob_from_azure

from models import (
    Clip,
    Category,
    Person,
)


def get_all_clips(db: Session) -> List[Clip]:
    return (
        db.query(Clip)
        .options(joinedload(Clip.category_rel), joinedload(Clip.people))
        .order_by(Clip.uploaded_at.desc())
        .all()
    )


def get_clip_by_id(
    db: Session,
    clip_id: int,
) -> Clip:
    clip = (
        db.query(Clip)
        .options(joinedload(Clip.category_rel), joinedload(Clip.people))
        .filter(Clip.id == clip_id)
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
) -> List[Clip]:
    """Legacy ILIKE search — prefer search_service.search_clips_ranked."""
    pattern = f"%{query}%"

    return (
        db.query(Clip)
        .options(joinedload(Clip.category_rel), joinedload(Clip.people))
        .outerjoin(Category)
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


def get_categories(
    db: Session,
):
    return (
        db.query(Category)
        .order_by(Category.name)
        .all()
    )


def get_people(
    db: Session,
):
    return (
        db.query(Person)
        .order_by(Person.name)
        .all()
    )


def create_category(
    db: Session,
    name: str,
):
    existing = (
        db.query(Category)
        .filter(Category.name == name)
        .first()
    )

    if existing:
        return existing

    category = Category(
        name=name
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return category


def create_person(
    db: Session,
    name: str,
):
    existing = (
        db.query(Person)
        .filter(Person.name == name)
        .first()
    )

    if existing:
        return existing

    person = Person(
        name=name
    )

    db.add(person)
    db.commit()
    db.refresh(person)

    return person


def delete_clip(
    db: Session,
    clip_id: int,
) -> None:
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

    try:
        if clip.blob_url:
            delete_blob_from_azure(
                clip.blob_url
            )
    except Exception as e:
        print(
            f"Failed to delete video blob: {e}"
        )

    try:
        if clip.thumbnail_url:
            delete_blob_from_azure(
                clip.thumbnail_url
            )
    except Exception as e:
        print(
            f"Failed to delete thumbnail blob: {e}"
        )

    db.delete(clip)
    db.commit()