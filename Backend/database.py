from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Set, Tuple

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./clips.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()

logger = logging.getLogger(__name__)

# Columns added after initial schema — applied safely to existing SQLite DBs
_CLIP_COLUMN_MIGRATIONS = [
    ("camera_make", "VARCHAR(255)"),
    ("altitude", "FLOAT"),
    ("location_label", "VARCHAR(512)"),
    ("mime_type", "VARCHAR(128)"),
    ("width", "INTEGER"),
    ("height", "INTEGER"),
    ("duration_seconds", "FLOAT"),
    ("metadata_json", "TEXT"),
    ("library_id", "INTEGER"),
    ("uploaded_by_user_id", "VARCHAR(36)"),
    ("storage_provider", "VARCHAR(32)"),
    ("media_object_key", "VARCHAR(512)"),
    ("thumbnail_object_key", "VARCHAR(512)"),
]

_CATEGORY_COLUMN_MIGRATIONS = [
    ("library_id", "INTEGER"),
]

_PERSON_COLUMN_MIGRATIONS = [
    ("library_id", "INTEGER"),
]

LEGACY_LIBRARY_NAME = "Legacy Development"


def _table_names(inspector) -> Set[str]:
    return set(inspector.get_table_names())


def _column_names(inspector, table: str) -> Set[str]:
    if table not in _table_names(inspector):
        return set()
    return {col["name"] for col in inspector.get_columns(table)}


def _add_missing_columns(
    conn, table: str, migrations: List[Tuple[str, str]], existing: Set[str]
) -> None:
    for name, sql_type in migrations:
        if name not in existing:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}"))
            logger.info("Added column %s.%s", table, name)


def _has_unique_on_name_only(inspector, table: str) -> bool:
    """True if a UNIQUE constraint/index exists on `name` alone (pre-library scoping)."""
    try:
        for uq in inspector.get_unique_constraints(table):
            cols = uq.get("column_names") or []
            if cols == ["name"]:
                return True
    except Exception:
        pass
    try:
        for idx in inspector.get_indexes(table):
            if idx.get("unique") and (idx.get("column_names") or []) == ["name"]:
                return True
    except Exception:
        pass
    return False


def _has_library_scoped_unique(inspector, table: str) -> bool:
    try:
        for uq in inspector.get_unique_constraints(table):
            cols = set(uq.get("column_names") or [])
            if cols == {"library_id", "name"}:
                return True
    except Exception:
        pass
    try:
        for idx in inspector.get_indexes(table):
            cols = set(idx.get("column_names") or [])
            if idx.get("unique") and cols == {"library_id", "name"}:
                return True
    except Exception:
        pass
    return False


def _needs_taxonomy_rebuild(inspector, table: str) -> bool:
    if table not in _table_names(inspector):
        return False
    if "library_id" not in _column_names(inspector, table):
        return False
    if _has_library_scoped_unique(inspector, table):
        return False
    # Missing composite unique → rebuild (covers old global UNIQUE(name) and fresh ADD COLUMN)
    return True


def _rebuild_categories_scoped(conn) -> None:
    """Rebuild categories with UNIQUE(library_id, name). Preserves rows and IDs."""
    conn.execute(text("PRAGMA foreign_keys=OFF"))
    conn.execute(
        text(
            """
            CREATE TABLE categories_new (
                id INTEGER NOT NULL PRIMARY KEY,
                library_id INTEGER,
                name VARCHAR(100) NOT NULL,
                UNIQUE (library_id, name),
                FOREIGN KEY(library_id) REFERENCES libraries (id)
            )
            """
        )
    )
    conn.execute(
        text(
            """
            INSERT INTO categories_new (id, library_id, name)
            SELECT id, library_id, name FROM categories
            """
        )
    )
    conn.execute(text("DROP TABLE categories"))
    conn.execute(text("ALTER TABLE categories_new RENAME TO categories"))
    conn.execute(text("PRAGMA foreign_keys=ON"))
    logger.info("Rebuilt categories with library-scoped uniqueness")


def _rebuild_people_scoped(conn) -> None:
    """Rebuild people with UNIQUE(library_id, name). Preserves rows and IDs."""
    conn.execute(text("PRAGMA foreign_keys=OFF"))
    conn.execute(
        text(
            """
            CREATE TABLE people_new (
                id INTEGER NOT NULL PRIMARY KEY,
                library_id INTEGER,
                name VARCHAR(255) NOT NULL,
                UNIQUE (library_id, name),
                FOREIGN KEY(library_id) REFERENCES libraries (id)
            )
            """
        )
    )
    conn.execute(
        text(
            """
            INSERT INTO people_new (id, library_id, name)
            SELECT id, library_id, name FROM people
            """
        )
    )
    conn.execute(text("DROP TABLE people"))
    conn.execute(text("ALTER TABLE people_new RENAME TO people"))
    conn.execute(text("PRAGMA foreign_keys=ON"))
    logger.info("Rebuilt people with library-scoped uniqueness")


def _ensure_legacy_library_and_backfill(conn) -> None:
    """Create isolated legacy library and assign unscoped clips/categories/people."""
    row = conn.execute(
        text("SELECT id FROM libraries WHERE type = 'legacy' LIMIT 1")
    ).fetchone()
    if row:
        legacy_id = row[0]
    else:
        conn.execute(
            text(
                """
                INSERT INTO libraries (type, owner_user_id, workspace_id, name, created_at)
                VALUES ('legacy', NULL, NULL, :name, :created_at)
                """
            ),
            {"name": LEGACY_LIBRARY_NAME, "created_at": datetime.utcnow().isoformat()},
        )
        legacy_id = conn.execute(text("SELECT last_insert_rowid()")).scalar()
        logger.info("Created legacy library id=%s", legacy_id)

    # Populate library_id; leave uploaded_by_user_id NULL for legacy clips (A2)
    result = conn.execute(
        text(
            """
            UPDATE clips
            SET library_id = :lid
            WHERE library_id IS NULL
            """
        ),
        {"lid": legacy_id},
    )
    if result.rowcount:
        logger.info("Backfilled %s clips into legacy library", result.rowcount)

    cat = conn.execute(
        text(
            """
            UPDATE categories
            SET library_id = :lid
            WHERE library_id IS NULL
            """
        ),
        {"lid": legacy_id},
    )
    if cat.rowcount:
        logger.info("Backfilled %s categories into legacy library", cat.rowcount)

    people = conn.execute(
        text(
            """
            UPDATE people
            SET library_id = :lid
            WHERE library_id IS NULL
            """
        ),
        {"lid": legacy_id},
    )
    if people.rowcount:
        logger.info("Backfilled %s people into legacy library", people.rowcount)


def _ensure_personal_library_unique_index(conn) -> None:
    conn.execute(
        text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_libraries_personal_owner
            ON libraries (owner_user_id)
            WHERE type = 'personal' AND owner_user_id IS NOT NULL
            """
        )
    )
    conn.execute(
        text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_libraries_workspace
            ON libraries (workspace_id)
            WHERE type = 'workspace' AND workspace_id IS NOT NULL
            """
        )
    )
    conn.execute(
        text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_libraries_legacy_singleton
            ON libraries (type)
            WHERE type = 'legacy'
            """
        )
    )


def ensure_schema() -> None:
    """Create missing tables, add nullable columns, scope taxonomies, backfill legacy."""
    # Import models so metadata is registered before create_all
    import models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    tables = _table_names(inspector)

    with engine.begin() as conn:
        if "clips" in tables:
            existing = _column_names(inspector, "clips")
            _add_missing_columns(conn, "clips", _CLIP_COLUMN_MIGRATIONS, existing)
            from services.storage.backfill import backfill_clip_storage_refs

            backfill_clip_storage_refs(conn)

        if "categories" in tables:
            existing = _column_names(inspector, "categories")
            _add_missing_columns(conn, "categories", _CATEGORY_COLUMN_MIGRATIONS, existing)

        if "people" in tables:
            existing = _column_names(inspector, "people")
            _add_missing_columns(conn, "people", _PERSON_COLUMN_MIGRATIONS, existing)

        # Refresh inspector after ALTER ADD COLUMN
        inspector = inspect(engine)

        if "libraries" in _table_names(inspector):
            _ensure_legacy_library_and_backfill(conn)
            _ensure_personal_library_unique_index(conn)

        # Rebuild uniqueness when library-scoped UNIQUE(library_id, name) is missing
        inspector = inspect(engine)
        if "categories" in _table_names(inspector) and _needs_taxonomy_rebuild(
            inspector, "categories"
        ):
            _rebuild_categories_scoped(conn)

        inspector = inspect(engine)
        if "people" in _table_names(inspector) and _needs_taxonomy_rebuild(
            inspector, "people"
        ):
            _rebuild_people_scoped(conn)
