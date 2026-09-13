"""Backblaze B2 storage adapter (S3-compatible API via boto3)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import boto3
from botocore.client import BaseClient

from services.storage import b2_config
from services.storage.object_keys import is_valid_object_key
from services.storage.types import PROVIDER_B2, ReadAccess, StoragePurpose, StoredObjectRef


def _content_type_for_path(file_path: Path) -> str:
    ext = file_path.suffix.lower()
    if ext in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if ext == ".png":
        return "image/png"
    if ext == ".mp4":
        return "video/mp4"
    return "application/octet-stream"


def _generate_object_key(file_path: Path) -> str:
    return f"{uuid.uuid4()}{file_path.suffix}"


class B2StorageProvider:
    """StorageProvider backed by Backblaze B2 (S3-compatible)."""

    def __init__(self, s3_client: Optional[BaseClient] = None) -> None:
        self._s3_client = s3_client

    def _client_for_bucket(self, bucket: str) -> BaseClient:
        if self._s3_client is not None:
            return self._s3_client
        b2_config.require_b2_config()
        key_id, secret = b2_config.credentials_for_bucket(bucket)
        return boto3.client(
            "s3",
            endpoint_url=b2_config.B2_ENDPOINT,
            region_name="auto",
            aws_access_key_id=key_id,
            aws_secret_access_key=secret,
        )

    def put_file(
        self,
        local_path: str,
        *,
        library_id: int,
        purpose: StoragePurpose,
    ) -> StoredObjectRef:
        _ = library_id
        b2_config.require_b2_config()
        file_path = Path(local_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {local_path}")

        bucket = b2_config.bucket_for_purpose(purpose)
        object_key = _generate_object_key(file_path)
        if not is_valid_object_key(object_key):
            raise ValueError("Invalid object key produced by storage upload")

        content_type = _content_type_for_path(file_path)
        client = self._client_for_bucket(bucket)
        with open(local_path, "rb") as body:
            client.put_object(
                Bucket=bucket,
                Key=object_key,
                Body=body,
                ContentType=content_type,
            )

        read_url = b2_config.unsigned_object_locator(bucket, object_key)
        return StoredObjectRef(
            provider=PROVIDER_B2,
            bucket=bucket,
            object_key=object_key,
            read_url=read_url,
        )

    def delete_object(self, ref: StoredObjectRef, *, library_id: int) -> None:
        _ = library_id
        if ref.provider != PROVIDER_B2:
            raise ValueError("Provider mismatch for B2 delete")
        if not is_valid_object_key(ref.object_key):
            raise ValueError("Invalid object key for delete")
        allowed = b2_config.configured_b2_buckets()
        if ref.bucket not in allowed:
            raise ValueError("Invalid bucket for delete")
        b2_config.require_b2_config()
        self._client_for_bucket(ref.bucket).delete_object(Bucket=ref.bucket, Key=ref.object_key)

    def delete_by_url(self, read_url: str, *, library_id: int) -> None:
        _ = library_id
        _ = read_url
        raise ValueError("B2 delete_by_url is not supported; use structured delete_object")

    def issue_read_url(
        self,
        ref: StoredObjectRef,
        *,
        library_id: int,
        ttl_seconds: int,
    ) -> ReadAccess:
        _ = library_id
        if ref.provider != PROVIDER_B2:
            raise ValueError("Provider mismatch for B2 read")
        if not is_valid_object_key(ref.object_key):
            raise ValueError("Invalid object key for read")
        allowed = b2_config.configured_b2_buckets()
        if ref.bucket not in allowed:
            raise ValueError("Invalid bucket for read")
        if ttl_seconds < 1:
            raise ValueError("ttl_seconds must be positive")
        b2_config.require_b2_config()

        expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
        url = self._client_for_bucket(ref.bucket).generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": ref.bucket, "Key": ref.object_key},
            ExpiresIn=ttl_seconds,
        )
        return ReadAccess(url=url, expires_at=expires_at)

    def get_read_url(self, read_url: str, *, library_id: int) -> str:
        _ = library_id
        return read_url
