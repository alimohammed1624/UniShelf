import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload

from app.models import Resource, User
from app.models.enums import UserRole
from app.database import get_db
from app.controllers.auth.helpers import require_role
from app.controllers.auth.schemas import UserSchema
from app.controllers.resources.schemas import ResourceSchema
from app.utils.minio_client import delete_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/resources", response_model=List[ResourceSchema])
def list_all_resources(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    include_archived: bool = Query(False),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """List all resources including archived ones, with anonymous uploaders visible."""
    query = db.query(Resource).options(selectinload(Resource.tags))

    if not include_archived:
        query = query.filter(Resource.is_archived == False)

    query = query.order_by(Resource.created_at.desc(), Resource.id.desc())
    return query.offset(skip).limit(limit).all()


@router.get("/users", response_model=List[UserSchema])
def list_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """List all users with full details."""
    return (
        db.query(User)
        .order_by(User.created_at.desc(), User.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.delete("/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def hard_delete_resource(
    resource_id: int,
    current_user: User = Depends(require_role(UserRole.SUPERADMIN)),
    db: Session = Depends(get_db),
):
    """Hard delete: remove from MinIO and DB. Superadmin only."""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    # Delete from MinIO first — if this fails, abort (don't leave orphaned row)
    if resource.file_path:
        try:
            delete_file(resource.file_path)
        except Exception as e:
            logger.error(f"Failed to delete MinIO object {resource.file_path}: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Storage service unavailable — cannot complete deletion",
            )

    db.delete(resource)
    db.commit()
    logger.info(f"Resource {resource_id} hard-deleted by superadmin {current_user.id}")
