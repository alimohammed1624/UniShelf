"""
Shared database query helpers for resource access control and common patterns.
"""

import re
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, Query, aliased
from sqlalchemy.sql import Select
from app.models import Resource, User, Visibility
from app.models.enums import UserRole, AccessType


# Hierarchy depth is capped at 10 levels (see validate_hierarchy), so an upward
# walk that runs longer than this is a parent_id cycle, not a real tree.
MAX_ANCESTOR_DEPTH = 10


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


def _check_own_access(db: Session, resource: Resource, user: User) -> Optional[bool]:
    """
    Decide access for a single resource, ignoring its ancestors.
    Precedence: blacklist/whitelist entries override is_public.

    Returns True (granted) or False (denied) when this resource alone settles it,
    or None when it is public with no ACL entry — then the ancestors decide.
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

    if not resource.is_public:
        return False
    return None  # Public and unremarkable — inherit the verdict from above


def check_resource_access(db: Session, resource: Resource, user: User) -> bool:
    """
    Check if a user can access a resource.

    Privacy is inherited: a resource inside a folder the user cannot reach is
    itself unreachable, even when its own is_public is True. Inheritance is
    computed here rather than written onto children, so each child keeps its own
    stored setting for when the folder goes public again.

    Walks parent_id, not the hierarchy ltree column — children do not reliably
    inherit the label path (see _collect_descendants in the resources router).

    Returns True if access is granted, False if denied.
    """
    current = resource
    seen: set[int] = set()

    for _ in range(MAX_ANCESTOR_DEPTH):
        if current.id in seen:
            break  # parent_id cycle — fail closed
        seen.add(current.id)

        verdict = _check_own_access(db, current, user)
        if verdict is not None:
            return verdict

        if current.parent_id is None:
            return True  # Public all the way up to the root
        parent = db.query(Resource).filter(Resource.id == current.parent_id).first()
        if parent is None:
            return True  # Dangling parent_id — treat this resource as a root
        current = parent

    return False


def inaccessible_resource_ids(db: Session, user: User) -> Optional[Select]:
    """
    Sub-select of the resource ids a user cannot see, ancestors included.

    The set-based twin of check_resource_access, for queries that filter in SQL.
    The seed is every row denied on its own terms; the recursive step carries
    that denial down the parent_id chain, so a public file inside a private
    folder is excluded along with the folder. Rows the user owns, uploaded, or
    is whitelisted on are never denied and never blocked by an ancestor.

    Returns None for admin+, who bypass visibility filtering entirely.
    """
    if user.role >= int(UserRole.ADMIN):
        return None

    blacklisted = select(Visibility.resource_id).where(
        Visibility.user_id == user.id,
        Visibility.access_type == int(AccessType.BLACKLIST),
    )
    whitelisted = select(Visibility.resource_id).where(
        Visibility.user_id == user.id,
        Visibility.access_type == int(AccessType.WHITELIST),
    )

    denied = (
        select(Resource.id.label("id"))
        .where(
            Resource.owner_id != user.id,
            Resource.uploader_id != user.id,
            Resource.id.not_in(whitelisted),
            or_(Resource.is_public == False, Resource.id.in_(blacklisted)),
        )
        .cte("denied_resources", recursive=True)
    )

    # UNION, not UNION ALL: parent_id is not cycle-proof (update_resource accepts
    # any directory as a parent), and deduplicating rows is what stops a cycle
    # from recursing forever. It plays the role the visited set plays in the
    # Python walks.
    child = aliased(Resource)
    denied = denied.union(
        select(child.id)
        .join(denied, child.parent_id == denied.c.id)
        .where(
            child.owner_id != user.id,
            child.uploader_id != user.id,
            child.id.not_in(whitelisted),
        )
    )

    return select(denied.c.id)


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
    """Validate and return a logical dot-separated resource path. Raise 422 if invalid."""
    if hierarchy == "":
        return hierarchy
    if not re.match(r"^[a-z0-9_]+(\.[a-z0-9_]+)*$", hierarchy):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Hierarchy must be a dot-separated lowercase alphanumeric resource path (letters, digits, underscores only)",
        )
    if len(hierarchy.split(".")) > 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Hierarchy depth cannot exceed 10 levels",
        )
    return hierarchy
