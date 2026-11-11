"""Upload filename and size guards."""

from __future__ import annotations

import os

DEFAULT_MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024  # 2 GiB


def safe_upload_basename(filename: str | None) -> str:
    """Strip path segments so temp writes cannot escape the upload directory."""
    cleaned = (filename or "").replace("\\", "/")
    base = os.path.basename(cleaned).strip()
    if not base or base in {".", ".."}:
        return "upload.bin"
    return base[:255]
