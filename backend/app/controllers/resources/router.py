import re
import logging
from typing import Callable, List, Optional
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Body, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func as sa_func
from sqlalchemy.sql import Select

from app.models import Resource, User, Tag, Visibility, Report
from app.models.enums import UserRole, AccessType, ReportStatus, ArchiveKind
from app.database import get_db
from app.controllers.auth.helpers import get_current_user, require_role
from app.utils.minio_client import (
    upload_file,
    upload_bytes,
    stream_download,
    download_file,
    download_file_if_exists,
    delete_file,
    get_minio_client,
)
from app.utils.thumbnails import (
    THUMBNAIL_CONTENT_TYPE,
    generate_thumbnail,
    supports_thumbnail,
    thumbnail_object_key,
)
from app.utils.db_helpers import (
    active_resources,
    check_resource_access,
    get_resource_or_404,
    inaccessible_resource_ids,
    require_resource_access,
    require_resource_owner,
    sanitize_filename,
    validate_hierarchy,
)
from .schemas import ResourceSchema, ResourceUpdate, DirectoryCreate, VisibilityCreate, VisibilitySchema, TagBrief
from app.controllers.moderate.schemas import ResourceBrief
from app.config import settings
from app.utils.metrics import UPLOAD_COUNT, UPLOAD_SIZE, DOWNLOAD_COUNT
from pydantic import BaseModel


class _ReportResponse(BaseModel):
    id: int
    reported_by: int
    resource_id: int
    reason: str
    status: int
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resource: ResourceBrief

    class Config:
        from_attributes = True


class _ResourceBrief(BaseModel):
    id: int
    title: str
    filename: Optional[str] = None
    uploader_id: int
    is_archived: bool

    class Config:
        from_attributes = True

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/resources", tags=["resources"])

MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# ── Upload ────────────────────────────────────────────────────


@router.post("/link", response_model=ResourceSchema, status_code=status.HTTP_201_CREATED)
async def submit_link_resource(
    title: str = Form(..., min_length=1, max_length=255),
    description: str = Form("", max_length=2000),
    url: str = Form(..., min_length=1, max_length=2048),
    is_public: bool = Form(True),
    is_anonymous: bool = Form(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL must start with http:// or https://")

    db_resource = Resource(
        title=title.strip(),
        description=description,
        file_path=url,
        hierarchy="",
        parent_id=None,
        filename=None,
        size=None,
        type="link",
        is_public=is_public,
        is_anonymous=is_anonymous,
        uploader_id=current_user.id,
        owner_id=current_user.id,
    )
    db.add(db_resource)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save link resource")

    db.refresh(db_resource)
    UPLOAD_COUNT.labels(status="success").inc()
    return db_resource


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
        require_resource_owner(parent, current_user)

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
    UPLOAD_SIZE.observe(file_size)

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
        UPLOAD_COUNT.labels(status="failure").inc()
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
        UPLOAD_COUNT.labels(status="failure").inc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save resource",
        )

    db.refresh(db_resource)
    UPLOAD_COUNT.labels(status="success").inc()
    return db_resource


@router.post("/directory", response_model=ResourceSchema, status_code=status.HTTP_201_CREATED)
def create_directory(
    payload: DirectoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.parent_id is not None:
        parent = db.query(Resource).filter(Resource.id == payload.parent_id).first()
        if parent is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent resource not found")
        if parent.type != "directory":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent must be a directory")
        require_resource_owner(parent, current_user)

    db_resource = Resource(
        title=payload.title,
        description=payload.description,
        file_path=None,
        hierarchy="",
        parent_id=payload.parent_id,
        filename=None,
        size=None,
        type="directory",
        is_public=payload.is_public,
        is_anonymous=payload.is_anonymous,
        uploader_id=current_user.id,
        owner_id=current_user.id,
    )
    db.add(db_resource)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create directory")

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
    include_archived: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Resource).options(selectinload(Resource.tags))

    if not include_archived:
        query = query.filter(Resource.is_archived == False)
    elif current_user.role < int(UserRole.ADMIN):
        # Archived rows are surfaced so an owner can find and restore their own.
        # The visibility filter below still admits other people's public resources,
        # so scope the archived ones to the caller — opting in must not turn a
        # takedown into something the whole university can read.
        query = query.filter(
            (Resource.is_archived == False)
            | (Resource.owner_id == current_user.id)
            | (Resource.uploader_id == current_user.id)
        )

    # ── Visibility filtering ──
    # Admin+ sees everything; others see everything except what they are denied,
    # which includes the contents of folders they cannot reach.
    denied_ids = inaccessible_resource_ids(db, current_user)
    if denied_ids is not None:
        query = query.filter(Resource.id.not_in(denied_ids))

    # ── Search & filter ──
    if q:
        # Escape SQL LIKE wildcards in user input
        escaped_q = q.replace("%", r"\%").replace("_", r"\_")
        pattern = f"%{escaped_q}%"
        query = query.filter(
            Resource.title.ilike(pattern) | Resource.filename.ilike(pattern)
        )

    if hierarchy:
        validated_h = validate_hierarchy(hierarchy)
        # ltree <@ operator: matches exact path and all descendants
        query = query.filter(Resource.hierarchy.op('<@')(validated_h))

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

    # Drop the cached thumbnail so it regenerates from the new file (best-effort)
    try:
        delete_file(thumbnail_object_key(resource.id))
    except Exception:
        logger.warning(f"Failed to delete cached thumbnail for resource {resource.id}")

    db.refresh(resource)
    return resource


# ── Soft delete ───────────────────────────────────────────────


# Hierarchy depth is capped at 10 levels (see validate_hierarchy), and
# get_resource_parents bounds its upward walk the same way. A subtree walk that
# runs deeper than this is a parent_id cycle, not a real tree.
MAX_SUBTREE_DEPTH = 10


def _collect_descendants(
    db: Session,
    resource_id: int,
    prune: Optional[Callable[[Resource], bool]] = None,
    max_depth: int = MAX_SUBTREE_DEPTH,
) -> List[Resource]:
    """
    Breadth-first walk of everything below a resource, archived rows included.

    Walks parent_id rather than the hierarchy ltree column: parent_id is the
    reliable structural link, while hierarchy is a label path children do not
    always inherit. A visited set plus the depth bound keep a cycle in parent_id
    from spinning forever.

    When `prune` returns True for a child, that child is left out of the result
    and its own subtree is not walked.
    """
    descendants: List[Resource] = []
    seen = {resource_id}
    frontier = [resource_id]
    depth = 0

    while frontier and depth < max_depth:
        children = (
            db.query(Resource)
            .filter(Resource.parent_id.in_(frontier))
            .order_by(Resource.id.asc())
            .all()
        )
        frontier = []
        for child in children:
            if child.id in seen:
                continue
            seen.add(child.id)
            if prune is not None and prune(child):
                continue
            descendants.append(child)
            frontier.append(child.id)
        depth += 1

    return descendants


def _stamp_self_archive(resource: Resource, user: User, when: datetime) -> None:
    """Archive a resource as the owner's own housekeeping (reversible by the owner)."""
    resource.is_archived = True
    resource.archived_at = when
    resource.archived_by_id = user.id
    resource.archive_kind = int(ArchiveKind.SELF)
    resource.archive_reason = None


def _clear_archive(resource: Resource) -> None:
    """Lift an archive and drop the metadata that explained it."""
    resource.is_archived = False
    resource.archived_at = None
    resource.archived_by_id = None
    resource.archive_reason = None
    resource.archive_kind = None


def _blocks_restore(resource: Resource) -> bool:
    """
    True if a descendant must stay archived while an ancestor is restored — a
    moderation takedown, or an archive this flow did not create. Its subtree is
    held down with it, so nothing is ever restored under a still-archived parent.
    """
    return resource.is_archived and resource.archive_kind != int(ArchiveKind.SELF)


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = get_resource_or_404(db, resource_id)
    require_resource_owner(resource, current_user)

    now = datetime.now(timezone.utc)
    _stamp_self_archive(resource, current_user, now)

    # Archive the whole subtree. Leaving children active under an archived parent
    # breaks their breadcrumbs, since get_resource_parents stops at the first
    # archived ancestor. Descendants already archived keep their own metadata, so
    # a moderation takedown underneath is never overwritten.
    cascaded = 0
    for descendant in _collect_descendants(db, resource_id):
        if descendant.is_archived:
            continue
        _stamp_self_archive(descendant, current_user, now)
        cascaded += 1

    db.commit()
    logger.info(
        f"Resource {resource_id} archived by user {current_user.id} "
        f"({cascaded} descendant(s) cascaded)"
    )


# ── Restore (undo soft delete) ────────────────────────────────


@router.post("/{resource_id}/restore", response_model=ResourceSchema)
def restore_resource(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lift a soft delete on a resource and its self-archived subtree. Idempotent."""
    resource = get_resource_or_404(db, resource_id, include_archived=True)

    if not resource.is_archived:
        require_resource_owner(resource, current_user)
        return resource

    # Who may lift an archive depends on why it was made, so the kind is checked
    # before ownership. require_resource_owner allows owner-or-admin, and a
    # moderator is *below* admin — gating on it first would lock moderators out
    # of the takedowns that are theirs to reverse.
    if resource.archive_kind == int(ArchiveKind.MODERATION):
        if current_user.role < int(UserRole.MODERATOR):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This resource was removed by moderation and can only be restored by a moderator",
            )
    else:
        require_resource_owner(resource, current_user)

    # Restoring under an archived parent would resurrect an unreachable resource.
    if resource.parent_id is not None:
        parent = db.query(Resource).filter(Resource.id == resource.parent_id).first()
        if parent is not None and parent.is_archived:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Parent resource is archived — restore the parent first",
            )

    _clear_archive(resource)

    # Cascade down over self-archived descendants only. A moderation takedown in
    # the subtree stays down, and so does everything beneath it, so restoring a
    # directory can never silently undo one.
    restored = 0
    for descendant in _collect_descendants(db, resource_id, prune=_blocks_restore):
        if descendant.is_archived:
            _clear_archive(descendant)
            restored += 1

    db.commit()
    db.refresh(resource)
    logger.info(
        f"Resource {resource_id} restored by user {current_user.id} "
        f"({restored} descendant(s) cascaded)"
    )
    return resource


# ── Download (streaming) ─────────────────────────────────────


@router.get("/{resource_id}/download")
def download_resource(
    resource_id: int,
    inline: bool = Query(default=False),
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
    DOWNLOAD_COUNT.inc()

    download_filename = sanitize_filename(resource.filename or "download")
    disposition = "inline" if inline else "attachment"
    headers = {
        "Content-Disposition": f'{disposition}; filename="{download_filename}"',
    }
    if resource.size:
        headers["Content-Length"] = str(resource.size)

    return StreamingResponse(
        chunk_generator,
        media_type=resource.type or "application/octet-stream",
        headers=headers,
    )


# ── Thumbnail (lazy-generated, cached in MinIO) ──────────────


@router.get("/{resource_id}/thumbnail")
async def get_resource_thumbnail(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return a small WebP preview of the resource (PDF first page or image).

    Generated lazily on first request and cached in MinIO under
    thumbnails/{id}.webp, so pre-existing resources get thumbnails the first
    time anyone lists them. 404 means "no thumbnail for this type" — the
    frontend falls back to a file-type icon.
    """
    resource = get_resource_or_404(db, resource_id)
    require_resource_access(db, resource, current_user)

    if not resource.file_path or not supports_thumbnail(resource.type):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No thumbnail available")

    thumb_key = thumbnail_object_key(resource.id)
    thumb = await download_file_if_exists(thumb_key)

    if thumb is None:
        # Cache miss: render from the source file. Whole-file read is bounded
        # by MAX_UPLOAD_BYTES, same as the upload path. Concurrent first
        # requests may both generate — harmless, the writes are idempotent.
        source = await download_file(resource.file_path)
        thumb = generate_thumbnail(source, resource.type)
        if thumb is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No thumbnail available")
        await upload_bytes(thumb, thumb_key, THUMBNAIL_CONTENT_TYPE)

    return Response(
        content=thumb,
        media_type=THUMBNAIL_CONTENT_TYPE,
        headers={"Cache-Control": "private, max-age=3600"},
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


# ── Tree: children ────────────────────────────────────────────


def _build_children_tree(
    db: Session,
    parent_id: int,
    hierarchy_prefix: str,
    current_depth: int,
    max_depth: int,
    user: User,
    denied_ids: Optional[Select],
) -> List[dict]:
    """
    Recursively build a tree of children resources with visibility filtering.

    `denied_ids` is built once by the caller and threaded through the recursion
    rather than rebuilt per level.
    """
    if current_depth > max_depth:
        return []

    query = (
        active_resources(db)
        .options(selectinload(Resource.tags))
        .filter(
            Resource.parent_id == parent_id,
            Resource.hierarchy.op('<@')(hierarchy_prefix),
        )
    )

    # Apply visibility filtering for non-admin users
    if denied_ids is not None:
        query = query.filter(Resource.id.not_in(denied_ids))

    children = query.order_by(Resource.title.asc()).all()
    result = []

    for child in children:
        node = {
            "id": child.id,
            "title": child.title,
            "type": child.type,
            "filename": child.filename,
            "is_directory": child.type == "directory",
        }
        if child.type == "directory" and current_depth < max_depth:
            node["children"] = _build_children_tree(
                db, child.id, child.hierarchy, current_depth + 1, max_depth, user, denied_ids
            )
        result.append(node)

    return result


@router.get("/{resource_id}/tree/children", response_model=List[dict])
def get_resource_children(
    resource_id: int,
    max_depth: int = Query(default=3, ge=1, le=5),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = get_resource_or_404(db, resource_id)
    require_resource_access(db, resource, current_user)

    if resource.type != "directory":
        return []

    children = _build_children_tree(
        db, resource_id, resource.hierarchy, 1, max_depth, current_user,
        inaccessible_resource_ids(db, current_user),
    )
    return children


# ── Tree: parents ─────────────────────────────────────────────


@router.get("/{resource_id}/tree/parents", response_model=List[dict])
def get_resource_parents(
    resource_id: int,
    max_levels: int = Query(default=2, ge=1, le=10),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = get_resource_or_404(db, resource_id)
    require_resource_access(db, resource, current_user)

    parents = []
    current_parent_id = resource.parent_id
    depth = 0

    while current_parent_id is not None and depth < max_levels:
        parent = (
            active_resources(db)
            .filter(Resource.id == current_parent_id, Resource.is_archived == False)
            .first()
        )
        if parent is None:
            break

        # Check visibility for non-admin users
        visible = check_resource_access(db, parent, current_user)
        if not visible:
            break

        parents.append({
            "id": parent.id,
            "title": parent.title,
            "type": parent.type,
            "filename": parent.filename,
            "is_directory": parent.type == "directory",
        })

        current_parent_id = parent.parent_id
        depth += 1

    # Reverse so root comes first
    parents.reverse()
    return parents


# ── Report resource ───────────────────────────────────────────

@router.post("/{resource_id}/report", response_model=_ReportResponse, status_code=status.HTTP_201_CREATED)
def report_resource(
    resource_id: int,
    reason: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Alias for submitting a report on a specific resource."""
    # Validate reason (mirrors ReportCreate validator)
    reason = reason.strip()
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Reason cannot be empty"
        )
    if len(reason) > 2000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Reason must be at most 2000 characters"
        )

    # Check if resource exists and is not already archived
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.is_archived == False
    ).first()
    if resource is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found or already archived"
        )

    # Check for duplicate report
    existing = db.query(Report).filter(
        Report.reported_by == current_user.id,
        Report.resource_id == resource_id,
        Report.status == int(ReportStatus.OPEN)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reported this resource"
        )

    new_report = Report(
        reported_by=current_user.id,
        resource_id=resource_id,
        reason=reason,
        status=int(ReportStatus.OPEN)
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    logger.info(f"Report {new_report.id} submitted by user {current_user.id} on resource {resource_id}")
    return new_report
