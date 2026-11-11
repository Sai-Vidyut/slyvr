"""Ensure B2 structured deletes never use Azure legacy delete_by_url."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from models import Clip, Library  # noqa: E402
from services.clip_service import delete_clip  # noqa: E402
from services.storage.service import StorageService  # noqa: E402
from services.storage.types import PROVIDER_B2  # noqa: E402
from tests.test_storage_service import FakeStorageProvider  # noqa: E402

_MEDIA_KEY = "11111111-2222-3333-4444-555555555555.mp4"


def test_delete_b2_structured_skips_delete_by_url(sqlite_session, monkeypatch):
    from services.storage import b2_config

    monkeypatch.setattr(b2_config, "B2_ENDPOINT", "")
    monkeypatch.setattr(b2_config, "B2_BUCKET_NAME", "")
    b2_config.configured_b2_buckets.cache_clear()

    db = sqlite_session
    library = Library(type="personal", owner_user_id="user-1", name="Personal")
    db.add(library)
    db.commit()
    db.refresh(library)

    clip = Clip(
        library_id=library.id,
        title="t",
        storage_provider=PROVIDER_B2,
        media_object_key=_MEDIA_KEY,
        blob_url=f"https://s3.example.com/clips-bucket/{_MEDIA_KEY}",
        thumbnail_url=None,
    )
    db.add(clip)
    db.commit()
    db.refresh(clip)

    fake = FakeStorageProvider()
    with patch(
        "services.clip_service.get_storage_service",
        return_value=StorageService(provider=fake),
    ):
        delete_clip(db, clip.id, library.id)

    assert fake.delete_object_calls == []
    assert fake.delete_calls == []


@pytest.fixture
def sqlite_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool

    from database import Base
    import models  # noqa: F401

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        yield db
    finally:
        db.close()
