"""Dev-only: seed SQLite with synthetic clips for UI/perf testing. Not for production."""

from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from database import SessionLocal  # noqa: E402
from models import Clip  # noqa: E402


def main() -> None:
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    session = SessionLocal()
    try:
        base = session.query(Clip).count()
        now = datetime.utcnow()
        for i in range(count):
            session.add(
                Clip(
                    title=f"Library clip {base + i + 1}",
                    description=f"Synthetic asset for performance testing #{base + i + 1}",
                    blob_url="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                    thumbnail_url=f"https://picsum.photos/seed/clip{base + i}/640/360",
                    uploaded_at=now - timedelta(hours=i * 3),
                    file_size=(i % 40 + 1) * 1_048_576,
                )
            )
        session.commit()
        total = session.query(Clip).count()
        print(f"Seeded {count} clips. Total clips in DB: {total}")
    finally:
        session.close()


if __name__ == "__main__":
    main()
