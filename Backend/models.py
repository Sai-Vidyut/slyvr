from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    BigInteger,
    ForeignKey,
    Table,
)

from sqlalchemy.orm import relationship

from database import Base


# MANY TO MANY
clip_people = Table(
    "clip_people",
    Base.metadata,

    Column(
        "clip_id",
        Integer,
        ForeignKey("clips.id"),
        primary_key=True,
    ),

    Column(
        "person_id",
        Integer,
        ForeignKey("people.id"),
        primary_key=True,
    ),
)


class Category(Base):
    __tablename__ = "categories"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    name = Column(
        String(100),
        unique=True,
        nullable=False,
    )

    clips = relationship(
        "Clip",
        back_populates="category_rel",
    )


class Person(Base):
    __tablename__ = "people"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    name = Column(
        String(255),
        unique=True,
        nullable=False,
    )

    clips = relationship(
        "Clip",
        secondary=clip_people,
        back_populates="people",
    )


class Clip(Base):
    __tablename__ = "clips"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    title = Column(
        String(255),
        nullable=False,
    )

    description = Column(Text)

    category_id = Column(
        Integer,
        ForeignKey("categories.id"),
        nullable=True,
    )

    blob_url = Column(
        String(2048),
        nullable=False,
    )

    thumbnail_url = Column(String(2048))

    original_filename = Column(
        String(255)
    )

    stored_filename = Column(
        String(255)
    )

    camera_model = Column(
        String(255)
    )

    latitude = Column(Float)

    longitude = Column(Float)

    recorded_at = Column(
        DateTime
    )

    uploaded_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    file_size = Column(
        BigInteger,
        default=0,
    )

    category_rel = relationship(
        "Category",
        back_populates="clips",
    )

    people = relationship(
        "Person",
        secondary=clip_people,
        back_populates="clips",
    )