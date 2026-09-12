from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker, declarative_base

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
]


def ensure_schema() -> None:
    """Create missing tables and add new nullable columns without destroying data."""
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    if "clips" not in inspector.get_table_names():
        return

    existing = {col["name"] for col in inspector.get_columns("clips")}
    with engine.begin() as conn:
        for name, sql_type in _CLIP_COLUMN_MIGRATIONS:
            if name not in existing:
                conn.execute(text(f"ALTER TABLE clips ADD COLUMN {name} {sql_type}"))
