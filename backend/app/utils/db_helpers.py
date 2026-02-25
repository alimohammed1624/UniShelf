"""
Shared database query helpers for resource access control and common patterns.
"""

import re
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, Query
from app.models import Resource, User, Visibility
from app.models.enums import UserRole, AccessType


def active_resources(db: Session) -> Query:
    """Return a query for non-archived resources. Use everywhere except admin endpoints."""
    return db.query(Resource).filter(Resource.is_archived == False)


def get_resource_or_404(db: Session, resource_id: int, include_archived: bool = False) -> Resource:
    """Fetch a resource by ID. Raises 404 if not found or archived (unless include_archived=True)."""
    query = db.query(Resource).filter(Resource.id == resource_id)
    if not include_archived:
        query = query.filter(Resource.is_archived == False)
    resource = query.first()
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return resource


def check_resource_access(db: Session, resource: Resource, user: User) -> bool:
    """
    Check if a user can access a resource.
    Precedence: blacklist/whitelist entries override is_public.

    Returns True if access is granted, False if denied.
    """
    # Owner and admin+ always have access
    if resource.owner_id == user.id or resource.uploader_id == user.id:
        return True
    if user.role >= int(UserRole.ADMIN):
        return True

    # Check for explicit ACL entry (overrides is_public)
    entry = (
        db.query(Visibility)
        .filter(Visibility.resource_id == resource.id, Visibility.user_id == user.id)
        .first()
    )
    if entry is not None:
        if entry.access_type == int(AccessType.BLACKLIST):
            return False  # Explicitly blacklisted — denied even if public
        if entry.access_type == int(AccessType.WHITELIST):
            return True  # Explicitly whitelisted — allowed even if private

    # Fall back to is_public
    return resource.is_public


def require_resource_access(db: Session, resource: Resource, user: User) -> None:
    """Raise 403 if user cannot access the resource."""
    if not check_resource_access(db, resource, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


def check_resource_owner(resource: Resource, user: User) -> bool:
    """Check if user is the owner or an admin+."""
    return resource.owner_id == user.id or user.role >= int(UserRole.ADMIN)


def require_resource_owner(resource: Resource, user: User) -> None:
    """Raise 403 if user is not the owner or admin+."""
    if not check_resource_owner(resource, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner or admin access required")


def sanitize_filename(filename: str) -> str:
    """Remove unsafe characters from a filename for Content-Disposition headers."""
    # Keep only alphanumeric, dots, hyphens, underscores, spaces
    sanitized = re.sub(r"[^a-zA-Z0-9._\- ]", "", filename)
    return sanitized or "download"


def validate_hierarchy(hierarchy: str) -> str:
    """Validate and return a hierarchy string. Raise 422 if invalid."""
    if hierarchy == "":
        return hierarchy
    if not re.match(r"^[a-z0-9_]+(\.[a-z0-9_]+)*$", hierarchy):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Hierarchy must be dot-separated lowercase alphanumeric segments",
        )
    if len(hierarchy.split(".")) > 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Hierarchy depth cannot exceed 10 levels",
        )
    return hierarchy
