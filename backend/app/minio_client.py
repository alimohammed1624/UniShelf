"""
MinIO client service for handling file uploads and downloads.
"""
import os
import io
from datetime import timedelta
from minio import Minio
from minio.error import S3Error
from fastapi import UploadFile, HTTPException
import logging

logger = logging.getLogger(__name__)

# Get MinIO configuration from environment variables
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
MINIO_BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "unishelf-uploads")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"


def get_minio_client() -> Minio:
    """
    Initialize and return a MinIO client instance.
    """
    return Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=MINIO_SECURE
    )


def ensure_bucket_exists(bucket_name: str = MINIO_BUCKET_NAME) -> None:
    """
    Create bucket if it doesn't exist.
    
    Args:
        bucket_name: Name of the bucket to create
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
        raise HTTPException(status_code=500, detail=f"MinIO bucket error: {str(e)}")


async def upload_file(file: UploadFile, object_name: str, bucket_name: str = MINIO_BUCKET_NAME) -> str:
    """
    Upload a file to MinIO bucket.
    
    Args:
        file: The file to upload (FastAPI UploadFile)
        object_name: The object key/path in the bucket
        bucket_name: Name of the bucket
        
    Returns:
        The object key of the uploaded file
    """
    client = get_minio_client()
    
    try:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Reset file pointer for potential reuse
        await file.seek(0)
        
        # Upload to MinIO
        client.put_object(
            bucket_name,
            object_name,
            io.BytesIO(file_content),
            length=file_size,
            content_type=file.content_type or "application/octet-stream"
        )
        
        logger.info(f"Uploaded file: {object_name} ({file_size} bytes)")
        return object_name
        
    except S3Error as e:
        logger.error(f"Error uploading file to MinIO: {e}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error uploading file: {e}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


async def download_file(object_name: str, bucket_name: str = MINIO_BUCKET_NAME) -> bytes:
    """
    Download a file from MinIO bucket.
    
    Args:
        object_name: The object key in the bucket
        bucket_name: Name of the bucket
        
    Returns:
        File content as bytes
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
        logger.error(f"Error downloading file from MinIO: {e}")
        raise HTTPException(status_code=404, detail=f"File not found: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error downloading file: {e}")
        raise HTTPException(status_code=500, detail=f"File download failed: {str(e)}")


def get_presigned_url(object_name: str, bucket_name: str = MINIO_BUCKET_NAME, expiry_seconds: int = 3600) -> str:
    """
    Generate a presigned URL for downloading a file.
    
    Args:
        object_name: The object key in the bucket
        bucket_name: Name of the bucket
        expiry_seconds: URL expiration time in seconds (default: 1 hour)
        
    Returns:
        Presigned URL string
    """
    client = get_minio_client()
    
    try:
        url = client.presigned_get_object(
            bucket_name,
            object_name,
            expires=timedelta(seconds=expiry_seconds)
        )
        
        logger.info(f"Generated presigned URL for: {object_name}")
        return url
        
    except S3Error as e:
        logger.error(f"Error generating presigned URL: {e}")
        raise HTTPException(status_code=500, detail=f"Could not generate download URL: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error generating presigned URL: {e}")
        raise HTTPException(status_code=500, detail=f"Could not generate download URL: {str(e)}")


def delete_file(object_name: str, bucket_name: str = MINIO_BUCKET_NAME) -> None:
    """
    Delete a file from MinIO bucket.
    
    Args:
        object_name: The object key in the bucket
        bucket_name: Name of the bucket
    """
    client = get_minio_client()
    
    try:
        client.remove_object(bucket_name, object_name)
        logger.info(f"Deleted file: {object_name}")
        
    except S3Error as e:
        logger.error(f"Error deleting file from MinIO: {e}")
        raise HTTPException(status_code=500, detail=f"File deletion failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error deleting file: {e}")
        raise HTTPException(status_code=500, detail=f"File deletion failed: {str(e)}")
