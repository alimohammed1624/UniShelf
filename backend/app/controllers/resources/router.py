import re
import logging
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func as sa_func

from app.models import Resource, User, Tag, Visibility
from app.models.enums import UserRole, AccessType
from app.database import get_db
from app.controllers.auth.helpers import get_current_user, require_role
from app.utils.minio_client import upload_file, stream_download, delete_file, get_minio_client
from app.utils.db_helpers import (
    active_resources,
    get_resource_or_404,
    require_resource_access,
    require_resource_owner,
    sanitize_filename,
    validate_hierarchy,
)
from .schemas import ResourceSchema, ResourceUpdate, VisibilityCreate, VisibilitySchema, TagBrief
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/resources", tags=["resources"])

MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# ── Upload ────────────────────────────────────────────────────


@router.post("", response_model=ResourceSchema, status_code=status.HTTP_201_CREATED)
async def upload_resource(
    title: str = Form(..., min_length=1, max_length=255),
    description: str = Form("", max_length=2000),
    is_public: bool = Form(True),
    is_anonymous: bool = Form(False),
    hierarchy: str = Form(""),
    parent_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validate hierarchy format
    hierarchy = validate_hierarchy(hierarchy)

    # Validate parent exists and is a directory if specified
    if parent_id is not None:
        parent = db.query(Resource).filter(Resource.id == parent_id).first()
        if parent is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent resource not found")
        if parent.type != "directory":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent must be a directory")

    # Read file content and validate size
    file_content = await file.read()
    file_size = len(file_content)
    if file_size > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum of {settings.MAX_UPLOAD_SIZE_MB}MB",
        )
    await file.seek(0)

    # Sanitize and generate filename
    original_filename = file.filename or f"upload_{uuid4().hex[:8]}"
    safe_filename = sanitize_filename(original_filename)
    content_type = file.content_type or "application/octet-stream"

    # Generate unique MinIO object key
    object_name = f"resources/{uuid4().hex}/{safe_filename}"

    # Upload to MinIO
    object_key = await upload_file(file, object_name)

    # Save metadata to database
    db_resource = Resource(
        title=title.strip(),
        description=description,
        file_path=object_key,
        hierarchy=hierarchy,
        parent_id=parent_id,
        filename=safe_filename,
        size=file_size,
        type=content_type,
        is_public=is_public,
        is_anonymous=is_anonymous,
        uploader_id=current_user.id,
        owner_id=current_user.id,
    )
    db.add(db_resource)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Compensate: remove orphaned MinIO object
        try:
            delete_file(object_key)
        except Exception:
            logger.error(f"Failed to clean up MinIO object {object_key} after DB error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save resource metadata",
        )
    except Exception:
        db.rollback()
        try:
            delete_file(object_key)
        except Exception:
            logger.error(f"Failed to clean up MinIO object {object_key} after DB error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save resource",
        )

    db.refresh(db_resource)
    return db_resource


# ── List (with visibility filtering) ─────────────────────────


@router.get("", response_model=List[ResourceSchema])
def list_resources(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    q: Optional[str] = Query(None, max_length=200),
    tags: Optional[str] = Query(None, max_length=500),
    hierarchy: Optional[str] = Query(None, max_length=200),
    uploader_id: Optional[int] = Query(None, ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        active_resources(db)
        .options(selectinload(Resource.tags))
    )

    # ── Visibility filtering ──
    # Get IDs of resources where user is blacklisted
    blacklisted_ids = (
        db.query(Visibility.resource_id)
        .filter(Visibility.user_id == current_user.id, Visibility.access_type == int(AccessType.BLACKLIST))
        .subquery()
    )
    # Get IDs of resources where user is whitelisted
    whitelisted_ids = (
        db.query(Visibility.resource_id)
        .filter(Visibility.user_id == current_user.id, Visibility.access_type == int(AccessType.WHITELIST))
        .subquery()
    )

    # Admin+ sees everything; others see:
    # (public AND not blacklisted) OR own resources OR whitelisted
    if current_user.role < int(UserRole.ADMIN):
        query = query.filter(
            (
                (Resource.is_public == True) & ~Resource.id.in_(blacklisted_ids)
            )
            | (Resource.uploader_id == current_user.id)
            | (Resource.owner_id == current_user.id)
            | Resource.id.in_(whitelisted_ids)
        )

    # ── Search & filter ──
    if q:
        # Escape SQL LIKE wildcards in user input
        escaped_q = q.replace("%", r"\%").replace("_", r"\_")
        query = query.filter(Resource.title.ilike(f"%{escaped_q}%"))

    if hierarchy:
        validated_h = validate_hierarchy(hierarchy)
        # Prefix match: "cse.sem3" matches "cse.sem3", "cse.sem3.dbms", etc.
        query = query.filter(
            (Resource.hierarchy == validated_h) | Resource.hierarchy.like(f"{validated_h}.%")
        )

    if uploader_id:
        query = query.filter(Resource.uploader_id == uploader_id)

    if tags:
        tag_names = [t.strip().lower() for t in tags.split(",") if t.strip()][:10]
        if tag_names:
            query = query.filter(Resource.tags.any(Tag.name.in_(tag_names)))

    # Deterministic ordering for stable pagination
    query = query.order_by(Resource.created_at.desc(), Resource.id.desc())

    resources = query.offset(skip).limit(limit).all()
    return resources


# ── Single resource detail ────────────────────────────────────


@router.get("/{resource_id}", response_model=ResourceSchema)
def get_resource(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = (
        db.query(Resource)
        .options(selectinload(Resource.tags))
        .filter(Resource.id == resource_id, Resource.is_archived == False)
        .first()
    )
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    require_resource_access(db, resource, current_user)
    return resource


# ── Update metadata ───────────────────────────────────────────


@router.put("/{resource_id}", response_model=ResourceSchema)
def update_resource(
    resource_id: int,
    updates: ResourceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = get_resource_or_404(db, resource_id)
    require_resource_owner(resource, current_user)

    if updates.title is not None:
        resource.title = updates.title.strip()
    if updates.description is not None:
        resource.description = updates.description
    if updates.is_public is not None:
        resource.is_public = updates.is_public
    if updates.is_anonymous is not None:
        resource.is_anonymous = updates.is_anonymous
    if updates.hierarchy is not None:
        resource.hierarchy = validate_hierarchy(updates.hierarchy)
    if updates.parent_id is not None:
        parent = db.query(Resource).filter(Resource.id == updates.parent_id).first()
        if parent is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent resource not found")
        if parent.type != "directory":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent must be a directory")
        resource.parent_id = updates.parent_id

    db.commit()
    db.refresh(resource)
    return resource


# ── Replace file ──────────────────────────────────────────────


@router.patch("/{resource_id}/file", response_model=ResourceSchema)
async def replace_resource_file(
    resource_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = get_resource_or_404(db, resource_id)
    require_resource_owner(resource, current_user)

    if resource.type == "directory":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot upload file to a directory resource")

    # Validate file size
    file_content = await file.read()
    file_size = len(file_content)
    if file_size > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum of {settings.MAX_UPLOAD_SIZE_MB}MB",
        )
    await file.seek(0)

    safe_filename = sanitize_filename(file.filename or f"upload_{uuid4().hex[:8]}")
    new_object_name = f"resources/{uuid4().hex}/{safe_filename}"
    old_object_key = resource.file_path

    # Upload new file first
    new_key = await upload_file(file, new_object_name)

    # Update DB
    resource.file_path = new_key
    resource.filename = safe_filename
    resource.size = file_size
    resource.type = file.content_type or "application/octet-stream"

    try:
        db.commit()
    except Exception:
        db.rollback()
        # Compensate: remove new file since DB failed
        try:
            delete_file(new_key)
        except Exception:
            logger.error(f"Failed to clean up new MinIO object {new_key} after DB error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update resource",
        )

    # Clean up old file from MinIO (best-effort)
    if old_object_key:
        try:
            delete_file(old_object_key)
        except Exception:
            logger.warning(f"Failed to delete old MinIO object {old_object_key}")

    db.refresh(resource)
    return resource


# ── Soft delete ───────────────────────────────────────────────


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = get_resource_or_404(db, resource_id)
    require_resource_owner(resource, current_user)

    resource.is_archived = True
    db.commit()


# ── Download (streaming) ─────────────────────────────────────


@router.get("/{resource_id}/download")
def download_resource(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = get_resource_or_404(db, resource_id)
    require_resource_access(db, resource, current_user)

    if resource.type == "directory" or not resource.file_path:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot download a directory")

    # Update last_accessed_at
    resource.last_accessed_at = sa_func.now()
    db.commit()

    # Stream file in chunks from MinIO
    chunk_generator = stream_download(resource.file_path)

    download_filename = sanitize_filename(resource.filename or "download")
    headers = {
        "Content-Disposition": f'attachment; filename="{download_filename}"',
    }
    if resource.size:
        headers["Content-Length"] = str(resource.size)

    return StreamingResponse(
        chunk_generator,
        media_type=resource.type or "application/octet-stream",
        headers=headers,
    )


# ── Ownership transfer ───────────────────────────────────────


@router.post("/{resource_id}/transfer", response_model=ResourceSchema)
def transfer_ownership(
    resource_id: int,
    new_owner_id: int = Query(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = get_resource_or_404(db, resource_id)

    # Only current owner can transfer (not just any admin)
    if resource.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the current owner can transfer ownership",
        )

    new_owner = db.query(User).filter(User.id == new_owner_id).first()
    if new_owner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="New owner not found")
    if not new_owner.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot transfer to a suspended user")

    resource.owner_id = new_owner_id
    db.commit()
    db.refresh(resource)
    logger.info(f"Resource {resource_id} ownership transferred from {current_user.id} to {new_owner_id}")
    return resource


# ── Visibility (ACL) management ───────────────────────────────


@router.get("/{resource_id}/visibility", response_model=List[VisibilitySchema])
def list_visibility_entries(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = get_resource_or_404(db, resource_id)
    require_resource_owner(resource, current_user)
    return resource.visibility_entries


@router.post("/{resource_id}/visibility", response_model=VisibilitySchema, status_code=status.HTTP_201_CREATED)
def add_visibility_entry(
    resource_id: int,
    entry: VisibilityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = get_resource_or_404(db, resource_id)
    require_resource_owner(resource, current_user)

    # Verify target user exists
    target_user = db.query(User).filter(User.id == entry.user_id).first()
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")

    # Cannot add visibility entry for yourself
    if entry.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot add visibility entry for yourself")

    db_entry = Visibility(
        resource_id=resource_id,
        user_id=entry.user_id,
        access_type=entry.access_type,
    )
    db.add(db_entry)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Idempotent: return existing entry if duplicate
        existing = (
            db.query(Visibility)
            .filter(Visibility.resource_id == resource_id, Visibility.user_id == entry.user_id)
            .first()
        )
        if existing:
            # Update access type if different
            if existing.access_type != entry.access_type:
                existing.access_type = entry.access_type
                db.commit()
                db.refresh(existing)
            return existing
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create visibility entry",
        )

    db.refresh(db_entry)
    return db_entry


@router.delete("/{resource_id}/visibility/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_visibility_entry(
    resource_id: int,
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = get_resource_or_404(db, resource_id)
    require_resource_owner(resource, current_user)

    entry = (
        db.query(Visibility)
        .filter(Visibility.id == entry_id, Visibility.resource_id == resource_id)
        .first()
    )
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visibility entry not found")

    db.delete(entry)
    db.commit()


# ── Tag assignment ────────────────────────────────────────────


@router.post("/{resource_id}/tags", response_model=List[TagBrief])
def assign_tags_to_resource(
    resource_id: int,
    tag_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = get_resource_or_404(db, resource_id)
    require_resource_owner(resource, current_user)

    # Validate count
    if len(tag_ids) > settings.MAX_TAGS_PER_RESOURCE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {settings.MAX_TAGS_PER_RESOURCE} tags allowed per resource",
        )

    # Deduplicate and validate all exist
    unique_ids = list(set(tag_ids))
    tags = db.query(Tag).filter(Tag.id.in_(unique_ids)).all()
    if len(tags) != len(unique_ids):
        found_ids = {t.id for t in tags}
        missing = [i for i in unique_ids if i not in found_ids]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tags not found: {missing}",
        )

    # Check total wouldn't exceed limit
    current_tag_ids = {t.id for t in resource.tags}
    new_tag_ids = set(unique_ids) - current_tag_ids
    if len(current_tag_ids) + len(new_tag_ids) > settings.MAX_TAGS_PER_RESOURCE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Resource would exceed maximum of {settings.MAX_TAGS_PER_RESOURCE} tags",
        )

    # Add new tags (idempotent — skip already assigned)
    for tag in tags:
        if tag.id not in current_tag_ids:
            resource.tags.append(tag)

    db.commit()
    db.refresh(resource)
    return resource.tags


@router.delete("/{resource_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_tag_from_resource(
    resource_id: int,
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = get_resource_or_404(db, resource_id)
    require_resource_owner(resource, current_user)

    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if tag is None or tag not in resource.tags:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found on this resource")

    resource.tags.remove(tag)
    db.commit()

