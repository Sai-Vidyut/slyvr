from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base


clip_people = Table(
    "clip_people",
    Base.metadata,
    Column("clip_id", Integer, ForeignKey("clips.id"), primary_key=True),
    Column("person_id", Integer, ForeignKey("people.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)  # Supabase Auth UUID
    email = Column(String(320), unique=True, nullable=False)
    display_name = Column(String(255), nullable=True)
    avatar_url = Column(String(2048), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    personal_libraries = relationship(
        "Library",
        back_populates="owner",
        foreign_keys="Library.owner_user_id",
    )
    memberships = relationship("WorkspaceMember", back_populates="user")
    uploaded_clips = relationship(
        "Clip",
        back_populates="uploader",
        foreign_keys="Clip.uploaded_by_user_id",
    )


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    created_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    join_code_hash = Column(String(128), nullable=True)
    join_code_prefix = Column(String(16), nullable=True)
    join_code_created_at = Column(DateTime, nullable=True)
    join_code_revoked_at = Column(DateTime, nullable=True)

    members = relationship(
        "WorkspaceMember",
        back_populates="workspace",
        cascade="all, delete-orphan",
    )
    library = relationship(
        "Library",
        back_populates="workspace",
        uselist=False,
        cascade="all, delete-orphan",
    )
    created_by = relationship("User", foreign_keys=[created_by_user_id])


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role = Column(String(32), nullable=False)  # owner | admin | member
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="memberships")


class Library(Base):
    """Unified media context: personal, workspace, or isolated legacy/dev."""

    __tablename__ = "libraries"
    __table_args__ = (
        CheckConstraint(
            "("
            " (type = 'personal' AND owner_user_id IS NOT NULL AND workspace_id IS NULL)"
            " OR (type = 'workspace' AND workspace_id IS NOT NULL AND owner_user_id IS NULL)"
            " OR (type = 'legacy' AND owner_user_id IS NULL AND workspace_id IS NULL)"
            ")",
            name="ck_library_ownership",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String(32), nullable=False)  # personal | workspace | legacy
    owner_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship(
        "User",
        back_populates="personal_libraries",
        foreign_keys=[owner_user_id],
    )
    workspace = relationship("Workspace", back_populates="library")
    clips = relationship("Clip", back_populates="library")
    categories = relationship("Category", back_populates="library")
    people = relationship("Person", back_populates="library")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("library_id", "name", name="uq_category_library_name"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    library_id = Column(Integer, ForeignKey("libraries.id"), nullable=True)
    name = Column(String(100), nullable=False)

    library = relationship("Library", back_populates="categories")
    clips = relationship("Clip", back_populates="category_rel")


class Person(Base):
    __tablename__ = "people"
    __table_args__ = (
        UniqueConstraint("library_id", "name", name="uq_person_library_name"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    library_id = Column(Integer, ForeignKey("libraries.id"), nullable=True)
    name = Column(String(255), nullable=False)

    library = relationship("Library", back_populates="people")
    clips = relationship(
        "Clip",
        secondary=clip_people,
        back_populates="people",
    )


class Clip(Base):
    __tablename__ = "clips"

    id = Column(Integer, primary_key=True, autoincrement=True)

    library_id = Column(Integer, ForeignKey("libraries.id"), nullable=True)
    uploaded_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)

    title = Column(String(255), nullable=False)
    description = Column(Text)

    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    blob_url = Column(String(2048), nullable=False)
    thumbnail_url = Column(String(2048))

    original_filename = Column(String(255))
    stored_filename = Column(String(255))

    camera_model = Column(String(255))
    camera_make = Column(String(255))

    latitude = Column(Float)
    longitude = Column(Float)
    altitude = Column(Float)
    location_label = Column(String(512))

    recorded_at = Column(DateTime)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    file_size = Column(BigInteger, default=0)
    mime_type = Column(String(128))
    width = Column(Integer)
    height = Column(Integer)
    duration_seconds = Column(Float)
    metadata_json = Column(Text)

    library = relationship("Library", back_populates="clips")
    uploader = relationship(
        "User",
        back_populates="uploaded_clips",
        foreign_keys=[uploaded_by_user_id],
    )
    category_rel = relationship("Category", back_populates="clips")
    people = relationship(
        "Person",
        secondary=clip_people,
        back_populates="clips",
    )
