"""
MinIO client service for handling file uploads and downloads.
Singleton client instance. Streaming downloads. Generic error messages to clients.
"""

import io
from typing import Generator
from datetime import timedelta
from minio import Minio
from minio.error import S3Error
from fastapi import UploadFile, HTTPException
import logging
from app.config import settings
from app.utils.metrics import MINIO_OP_DURATION

logger = logging.getLogger(__name__)

# Get MinIO configuration from settings
MINIO_ENDPOINT = settings.MINIO_ENDPOINT
MINIO_ACCESS_KEY = settings.MINIO_ACCESS_KEY
MINIO_SECRET_KEY = settings.MINIO_SECRET_KEY
MINIO_BUCKET_NAME = settings.MINIO_BUCKET_NAME
MINIO_SECURE = settings.MINIO_SECURE

# ── Singleton client ─────────────────────────────────────────

_client: Minio | None = None


def get_minio_client() -> Minio:
    """
    Return a module-level singleton MinIO client instance.
    """
    global _client
    if _client is None:
        _client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_SECURE,
        )
    return _client


# ── Bucket management ─────────────────────────────────────────


def ensure_bucket_exists(bucket_name: str = MINIO_BUCKET_NAME) -> None:
    """
    Create bucket if it doesn't exist.
    """
    client = get_minio_client()
    try:
        if not client.bucket_exists(bucket_name):
            client.make_bucket(bucket_name)
            logger.info(f"Created bucket: {bucket_name}")
        else:
            logger.info(f"Bucket already exists: {bucket_name}")
    except S3Error as e:
        logger.error(f"Error ensuring bucket exists: {e}")
        raise HTTPException(status_code=502, detail="Storage service unavailable")


# ── Upload ────────────────────────────────────────────────────


async def upload_file(
    file: UploadFile, object_name: str, bucket_name: str = MINIO_BUCKET_NAME
) -> str:
    """
    Upload a file to MinIO bucket.

    Returns:
        The object key of the uploaded file
    """
    client = get_minio_client()

    try:
        file_content = await file.read()
        file_size = len(file_content)
        await file.seek(0)

        with MINIO_OP_DURATION.labels(operation="upload").time():
            client.put_object(
                bucket_name,
                object_name,
                io.BytesIO(file_content),
                length=file_size,
                content_type=file.content_type or "application/octet-stream",
            )

        logger.info(f"Uploaded file: {object_name} ({file_size} bytes)")
        return object_name

    except S3Error as e:
        logger.error(f"S3 error uploading file {object_name}: {e}")
        raise HTTPException(status_code=502, detail="Storage service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error uploading file {object_name}: {e}")
        raise HTTPException(status_code=502, detail="Storage service unavailable")


# ── Streaming download ────────────────────────────────────────


def stream_download(
    object_name: str, bucket_name: str = MINIO_BUCKET_NAME, chunk_size: int = 8192
) -> Generator[bytes, None, None]:
    """
    Stream a file from MinIO in chunks. Does not load entire file into memory.

    Yields:
        Chunks of file bytes
    """
    client = get_minio_client()
    response = None
    try:
        with MINIO_OP_DURATION.labels(operation="download").time():
            response = client.get_object(bucket_name, object_name)
        while True:
            chunk = response.read(chunk_size)
            if not chunk:
                break
            yield chunk
    except S3Error as e:
        logger.error(f"S3 error downloading file {object_name}: {e}")
        raise HTTPException(status_code=404, detail="File not found in storage")
    except Exception as e:
        logger.error(f"Unexpected error downloading file {object_name}: {e}")
        raise HTTPException(status_code=502, detail="Storage service unavailable")
    finally:
        if response is not None:
            response.close()
            response.release_conn()


# ── Legacy full download (kept for backward compat) ───────────


async def download_file(
    object_name: str, bucket_name: str = MINIO_BUCKET_NAME
) -> bytes:
    """
    Download entire file into memory. Prefer stream_download() for large files.
    """
    client = get_minio_client()

    try:
        response = client.get_object(bucket_name, object_name)
        file_data = response.read()
        response.close()
        response.release_conn()

        logger.info(f"Downloaded file: {object_name}")
        return file_data

    except S3Error as e:
        logger.error(f"S3 error downloading file {object_name}: {e}")
        raise HTTPException(status_code=404, detail="File not found in storage")
    except Exception as e:
        logger.error(f"Unexpected error downloading file {object_name}: {e}")
        raise HTTPException(status_code=502, detail="Storage service unavailable")


# ── Presigned URL ─────────────────────────────────────────────


def get_presigned_url(
    object_name: str, bucket_name: str = MINIO_BUCKET_NAME, expiry_seconds: int = 3600
) -> str:
    """
    Generate a presigned URL for downloading a file.
    """
    client = get_minio_client()

    try:
        url = client.presigned_get_object(
            bucket_name, object_name, expires=timedelta(seconds=expiry_seconds)
        )

        logger.info(f"Generated presigned URL for: {object_name}")
        return url

    except S3Error as e:
        logger.error(f"S3 error generating presigned URL for {object_name}: {e}")
        raise HTTPException(status_code=502, detail="Storage service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error generating presigned URL for {object_name}: {e}")
        raise HTTPException(status_code=502, detail="Storage service unavailable")


# ── Delete ────────────────────────────────────────────────────


def delete_file(object_name: str, bucket_name: str = MINIO_BUCKET_NAME) -> None:
    """
    Delete a file from MinIO bucket.
    """
    client = get_minio_client()

    try:
        with MINIO_OP_DURATION.labels(operation="delete").time():
            client.remove_object(bucket_name, object_name)
        logger.info(f"Deleted file: {object_name}")

    except S3Error as e:
        logger.error(f"S3 error deleting file {object_name}: {e}")
        raise HTTPException(status_code=502, detail="Storage service unavailable")
    except Exception as e:
        logger.error(f"Unexpected error deleting file {object_name}: {e}")
        raise HTTPException(status_code=502, detail="Storage service unavailable")

