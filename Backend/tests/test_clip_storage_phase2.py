"""Phase 2: provider-neutral Clip storage references and migrations."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from database import _CLIP_COLUMN_MIGRATIONS, _add_missing_columns  # noqa: E402
from services.storage.backfill import backfill_clip_storage_refs  # noqa: E402
from services.storage.object_keys import parse_slyvr_azure_blob_url  # noqa: E402
from services.storage.types import PROVIDER_AZURE, StoragePurpose  # noqa: E402

_MEDIA_KEY = "11111111-2222-3333-4444-555555555555.mp4"
_THUMB_KEY = "22222222-3333-4444-5555-666666666666.jpg"
_AZURE_MEDIA_URL = (
    f"https://acct.blob.core.windows.net/clips/{_MEDIA_KEY}"
)
_AZURE_THUMB_URL = (
    f"https://acct.blob.core.windows.net/thumbnails/{_THUMB_KEY}"
)


def _legacy_clips_table_sql() -> str:
    return """
    CREATE TABLE clips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        library_id INTEGER,
        title VARCHAR(255) NOT NULL,
        blob_url VARCHAR(2048) NOT NULL,
        thumbnail_url VARCHAR(2048),
        storage_provider VARCHAR(32),
        media_object_key VARCHAR(512),
        thumbnail_object_key VARCHAR(512)
    )
    """


def _run_storage_migrations(engine) -> None:
    inspector = inspect(engine)
    existing = {col["name"] for col in inspector.get_columns("clips")}
    with engine.begin() as conn:
        _add_missing_columns(conn, "clips", _CLIP_COLUMN_MIGRATIONS, existing)
        backfill_clip_storage_refs(conn)


def test_migration_adds_clip_storage_columns(tmp_path):
    db_file = tmp_path / "migrate.db"
    engine = create_engine(f"sqlite:///{db_file}")
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE clips (
                    id INTEGER PRIMARY KEY,
                    blob_url VARCHAR(2048) NOT NULL,
                    thumbnail_url VARCHAR(2048)
                )
                """
            )
        )

    _run_storage_migrations(engine)
    cols = {c["name"] for c in inspect(engine).get_columns("clips")}
    assert "storage_provider" in cols
    assert "media_object_key" in cols
    assert "thumbnail_object_key" in cols


def test_migration_is_idempotent(tmp_path):
    db_file = tmp_path / "idempotent.db"
    engine = create_engine(f"sqlite:///{db_file}")
    with engine.begin() as conn:
        conn.execute(text(_legacy_clips_table_sql()))
        conn.execute(
            text(
                """
                INSERT INTO clips (library_id, title, blob_url, thumbnail_url)
                VALUES (1, 'legacy', :blob, :thumb)
                """
            ),
            {"blob": _AZURE_MEDIA_URL, "thumb": _AZURE_THUMB_URL},
        )

    _run_storage_migrations(engine)
    with engine.connect() as conn:
        row1 = conn.execute(
            text(
                "SELECT storage_provider, media_object_key, thumbnail_object_key FROM clips WHERE id = 1"
            )
        ).one()

    _run_storage_migrations(engine)
    with engine.connect() as conn:
        row2 = conn.execute(
            text(
                "SELECT storage_provider, media_object_key, thumbnail_object_key FROM clips WHERE id = 1"
            )
        ).one()

    assert row1 == row2
    assert row1[0] == PROVIDER_AZURE
    assert row1[1] == _MEDIA_KEY
    assert row1[2] == _THUMB_KEY


def test_legacy_clip_row_readable_after_migration(tmp_path):
    db_file = tmp_path / "legacy.db"
    engine = create_engine(f"sqlite:///{db_file}")
    legacy_url = "https://example.test/not-azure.mp4"
    with engine.begin() as conn:
        conn.execute(text(_legacy_clips_table_sql()))
        conn.execute(
            text(
                """
                INSERT INTO clips (library_id, title, blob_url, thumbnail_url)
                VALUES (1, 'x', :blob, NULL)
                """
            ),
            {"blob": legacy_url},
        )

    _run_storage_migrations(engine)
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT blob_url, storage_provider, media_object_key FROM clips")
        ).one()
    assert row[0] == legacy_url
    assert row[1] is None
    assert row[2] is None


def test_backfill_valid_azure_urls():
    media = parse_slyvr_azure_blob_url(_AZURE_MEDIA_URL)
    assert media is not None
    assert media.container_name == "clips"
    assert media.object_key == _MEDIA_KEY


def test_malformed_urls_not_classified_as_azure(tmp_path):
    db_file = tmp_path / "bad.db"
    engine = create_engine(f"sqlite:///{db_file}")
    bad_blob = "https://example.test/evil/../../clips/fake.mp4"
    with engine.begin() as conn:
        conn.execute(text(_legacy_clips_table_sql()))
        conn.execute(
            text(
                """
                INSERT INTO clips (library_id, title, blob_url, thumbnail_url)
                VALUES (1, 'bad', :blob, :thumb)
                """
            ),
            {
                "blob": bad_blob,
                "thumb": "https://example.test/thumb.jpg",
            },
        )

    _run_storage_migrations(engine)
    with engine.connect() as conn:
        row = conn.execute(
            text(
                "SELECT storage_provider, media_object_key, thumbnail_object_key FROM clips"
            )
        ).one()
    assert row[0] is None
    assert row[1] is None
    assert row[2] is None


def test_new_clip_persists_provider_refs_and_urls(sqlite_session):
    from models import Clip, Library

    db = sqlite_session
    library = Library(type="personal", owner_user_id="u1", name="P")
    db.add(library)
    db.commit()
    db.refresh(library)

    clip = Clip(
        library_id=library.id,
        title="new",
        storage_provider=PROVIDER_AZURE,
        media_object_key=_MEDIA_KEY,
        thumbnail_object_key=_THUMB_KEY,
        blob_url=_AZURE_MEDIA_URL,
        thumbnail_url=_AZURE_THUMB_URL,
    )
    db.add(clip)
    db.commit()
    db.refresh(clip)

    assert clip.storage_provider == PROVIDER_AZURE
    assert clip.media_object_key == _MEDIA_KEY
    assert clip.thumbnail_object_key == _THUMB_KEY
    assert clip.blob_url == _AZURE_MEDIA_URL
    assert clip.thumbnail_url == _AZURE_THUMB_URL


def test_delete_ref_backed_clip_uses_structured_delete(sqlite_session):
    from models import Clip, Library
    from services.clip_service import delete_clip
    from services.storage.service import StorageService
    from tests.test_storage_service import FakeStorageProvider

    db = sqlite_session
    library = Library(type="personal", owner_user_id="u1", name="P")
    db.add(library)
    db.commit()
    db.refresh(library)

    clip = Clip(
        library_id=library.id,
        title="ref",
        storage_provider=PROVIDER_AZURE,
        media_object_key=_MEDIA_KEY,
        thumbnail_object_key=_THUMB_KEY,
        blob_url=_AZURE_MEDIA_URL,
        thumbnail_url=_AZURE_THUMB_URL,
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

    assert len(fake.delete_object_calls) == 2
    assert fake.delete_calls == []


def test_delete_legacy_url_only_uses_url_fallback(sqlite_session):
    from models import Clip, Library
    from services.clip_service import delete_clip
    from services.storage.service import StorageService
    from tests.test_storage_service import FakeStorageProvider

    db = sqlite_session
    library = Library(type="personal", owner_user_id="u1", name="P")
    db.add(library)
    db.commit()
    db.refresh(library)

    clip = Clip(
        library_id=library.id,
        title="legacy",
        blob_url="https://fake.test/legacy.mp4",
        thumbnail_url="https://fake.test/legacy.jpg",
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
    assert len(fake.delete_calls) == 2


def test_storage_upload_failure_blocks_second_upload():
    from services.storage.service import StorageService
    from tests.test_storage_service import FakeStorageProvider

    fake = FakeStorageProvider()
    service = StorageService(provider=fake)
    service.upload_file("/tmp/a.mp4", library_id=1, purpose=StoragePurpose.MEDIA)
    fake.put_should_fail = True
    with pytest.raises(RuntimeError, match="upload failed"):
        service.upload_file(
            "/tmp/b.jpg",
            library_id=1,
            purpose=StoragePurpose.THUMBNAIL,
        )


@pytest.fixture
def sqlite_session():
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
