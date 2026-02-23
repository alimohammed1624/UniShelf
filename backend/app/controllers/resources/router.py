from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import io

from app.models import Resource, User
from app.database import get_db
from app.controllers.auth.helpers import get_current_user
from app.utils.minio_client import upload_file, download_file
from .schemas import Resource as ResourceSchema

router = APIRouter()


@router.post("/resources", response_model=ResourceSchema)
async def upload_resource(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    visibility: str = Form("public"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Generate unique object key using timestamp and filename
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    object_name = f"resources/{timestamp}-{file.filename}"

    # Upload to MinIO
    object_key = await upload_file(file, object_name)

    # Save metadata to database
    db_resource = Resource(
        title=title,
        description=description,
        visibility=visibility,
        file_path=object_key,  # Store MinIO object key instead of local path
        uploader_id=current_user.id,
    )
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource


@router.get("/resources", response_model=List[ResourceSchema])
def read_resources(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    resources = db.query(Resource).offset(skip).limit(limit).all()
    return resources


@router.get("/resources/{resource_id}/download")
async def download_resource(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream a resource file from MinIO through the backend."""
    # Fetch resource from database
    resource = db.query(Resource).filter(Resource.id == resource_id).first()

    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Check visibility/access permissions
    if resource.visibility != "public" and resource.uploader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Download file from MinIO
    file_data = await download_file(resource.file_path)

    # Extract original filename from the object key (format: resources/timestamp-filename)
    original_filename = (
        resource.file_path.split("-", 1)[-1]
        if "-" in resource.file_path
        else resource.file_path
    )

    # Return file as streaming response with proper headers
    return StreamingResponse(
        io.BytesIO(file_data),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{original_filename}"'},
    )
