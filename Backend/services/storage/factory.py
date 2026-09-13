"""Build configured storage providers (env-driven, server-side only)."""

from __future__ import annotations

import os

from dotenv import load_dotenv

from services import azure_service
from services.storage.routing_provider import RoutingStorageProvider
from services.storage.types import PROVIDER_AZURE, PROVIDER_B2

load_dotenv()


def resolve_write_provider_name() -> str:
    """
    Determine which provider receives new uploads.

    Explicit SLYVR_STORAGE_PROVIDER wins. Otherwise default to Azure when configured.
    """
    explicit = (os.getenv("SLYVR_STORAGE_PROVIDER") or "").strip().lower()
    if explicit:
        if explicit not in (PROVIDER_AZURE, PROVIDER_B2):
            raise ValueError(
                f"Unsupported SLYVR_STORAGE_PROVIDER: {explicit!r} "
                f"(expected {PROVIDER_AZURE!r} or {PROVIDER_B2!r})"
            )
        return explicit
    if azure_service.AZURE_CONNECTION_STRING:
        return PROVIDER_AZURE
    raise ValueError(
        "No storage write provider configured. Set SLYVR_STORAGE_PROVIDER "
        f"to {PROVIDER_AZURE!r} or {PROVIDER_B2!r}, or configure AZURE_CONNECTION_STRING."
    )


def build_routing_storage_provider() -> RoutingStorageProvider:
    write_name = resolve_write_provider_name()
    return RoutingStorageProvider(write_provider_name=write_name)
