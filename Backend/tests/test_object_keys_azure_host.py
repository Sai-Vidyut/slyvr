"""Azure blob URL host validation for read signing."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from services.storage.object_keys import (  # noqa: E402
    configured_azure_blob_netlocs,
    parse_slyvr_azure_blob_url,
    parse_slyvr_azure_blob_url_for_signing,
)

_MEDIA_KEY = "11111111-2222-3333-4444-555555555555.mp4"
_ACCOUNT = "myacct"
_CONFIGURED_HOST = f"{_ACCOUNT}.blob.core.windows.net"
_VALID_PATH_URL = f"https://{_CONFIGURED_HOST}/clips/{_MEDIA_KEY}"
_FOREIGN_URL = f"https://foreign.example.net/clips/{_MEDIA_KEY}"
_MALFORMED = "not-a-url"


def _clear_netloc_cache() -> None:
    configured_azure_blob_netlocs.cache_clear()


def test_parse_without_signing_allows_foreign_host_path():
    parsed = parse_slyvr_azure_blob_url(_FOREIGN_URL)
    assert parsed is not None
    assert parsed.object_key == _MEDIA_KEY


def test_parse_for_signing_rejects_foreign_host():
    conn = (
        f"DefaultEndpointsProtocol=https;AccountName={_ACCOUNT};"
        "AccountKey=keykeykeykeykeykeykeykeykeykeykeykeykey==;EndpointSuffix=core.windows.net"
    )
    _clear_netloc_cache()
    with patch("services.azure_service.AZURE_CONNECTION_STRING", conn):
        _clear_netloc_cache()
        assert parse_slyvr_azure_blob_url_for_signing(_FOREIGN_URL) is None


def test_parse_for_signing_accepts_configured_host():
    conn = (
        f"DefaultEndpointsProtocol=https;AccountName={_ACCOUNT};"
        "AccountKey=keykeykeykeykeykeykeykeykeykeykeykeykey==;EndpointSuffix=core.windows.net"
    )
    _clear_netloc_cache()
    with patch("services.azure_service.AZURE_CONNECTION_STRING", conn):
        _clear_netloc_cache()
        parsed = parse_slyvr_azure_blob_url_for_signing(_VALID_PATH_URL)
    assert parsed is not None
    assert parsed.object_key == _MEDIA_KEY


def test_parse_for_signing_rejects_malformed_url():
    conn = (
        f"DefaultEndpointsProtocol=https;AccountName={_ACCOUNT};"
        "AccountKey=keykeykeykeykeykeykeykeykeykeykeykeykey==;EndpointSuffix=core.windows.net"
    )
    _clear_netloc_cache()
    with patch("services.azure_service.AZURE_CONNECTION_STRING", conn):
        _clear_netloc_cache()
        assert parse_slyvr_azure_blob_url_for_signing(_MALFORMED) is None


def test_parse_for_signing_rejects_when_azure_not_configured():
    _clear_netloc_cache()
    with patch("services.azure_service.AZURE_CONNECTION_STRING", None):
        _clear_netloc_cache()
        assert parse_slyvr_azure_blob_url_for_signing(_VALID_PATH_URL) is None
