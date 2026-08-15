import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError

from app.models import Resource, User
from app.models.enums import UserRole
from app.database import get_db
from app.controllers.auth.helpers import (
    require_role,
    assert_can_manage,
    assert_can_change_role,
    generate_temp_password,
    get_password_hash,
    assert_email_allowed,
)
from app.controllers.resources.schemas import ResourceSchema
from app.utils.db_helpers import inaccessible_resource_ids
from app.utils.minio_client import delete_file
from app.utils.thumbnails import thumbnail_object_key
from .schemas import (
    AdminUserCreate,
    AdminUserSchema,
    BanRequest,
    RoleChangeRequest,
    TempPasswordResponse,
)

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
    """
    List all resources including archived ones, with anonymous uploaders visible.

    "All" still stops at rank: the private resources of owners at or above the
    caller's own role are filtered out, so this endpoint cannot be used to read
    past the limit that applies everywhere else.
    """
    query = db.query(Resource).options(selectinload(Resource.tags))

    query = query.filter(Resource.id.not_in(inaccessible_resource_ids(db, current_user)))

    if not include_archived:
        query = query.filter(Resource.is_archived == False)

    query = query.order_by(Resource.created_at.desc(), Resource.id.desc())
    return query.offset(skip).limit(limit).all()


def _sweep_expired_bans(db: Session) -> None:
    """
    Lift every temporary ban that has expired, in one statement, so the admin
    listing never shows a stale "banned" row. Mirrors clear_expired_ban().
    """
    updated = (
        db.query(User)
        .filter(
            User.banned_until.isnot(None),
            User.banned_until <= datetime.now(timezone.utc),
        )
        .update(
            {
                "is_active": True,
                "banned_until": None,
                "ban_reason": None,
                "banned_at": None,
                "banned_by_id": None,
            },
            synchronize_session=False,
        )
    )
    if updated:
        db.commit()


def _get_target_user(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.get("/users", response_model=List[AdminUserSchema])
def list_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    role: Optional[int] = Query(None, ge=0, le=3),
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(active|banned)$"),
    q: Optional[str] = Query(None, max_length=100),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    List all users with full details, including moderation metadata.

    Rank caps the listing: users ranked strictly above the caller are left out,
    so an admin's dashboard never surfaces a superadmin. Peers stay visible —
    they are part of the picture an admin needs — but `assert_can_manage` still
    refuses every action on them. The cap keys off the caller's own role rather
    than naming SUPERADMIN, so the same endpoint serves both dashboards.
    """
    _sweep_expired_bans(db)

    query = db.query(User).filter(User.role <= current_user.role)

    if role is not None:
        query = query.filter(User.role == role)

    if status_filter == "active":
        query = query.filter(User.is_active.is_(True))
    elif status_filter == "banned":
        query = query.filter(User.is_active.is_(False))

    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(User.email.ilike(pattern) | User.full_name.ilike(pattern))

    return (
        query.order_by(User.created_at.desc(), User.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


# ── User management ───────────────────────────────────────────


@router.post("/users", response_model=AdminUserSchema, status_code=status.HTTP_201_CREATED)
def create_managed_user(
    payload: AdminUserCreate,
    current_user: User = Depends(require_role(UserRole.SUPERADMIN)),
    db: Session = Depends(get_db),
):
    """Create a user at any role up to the creator's own. Superadmin only."""
    assert_email_allowed(payload.email)

    if payload.role > current_user.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot grant a role higher than your own",
        )

    db_user = User(
        email=payload.email.lower().strip(),
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name.strip(),
        role=payload.role,
        is_active=True,
    )
    db.add(db_user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    db.refresh(db_user)
    logger.info(
        f"[admin-action] actor={current_user.id} action=create_user "
        f"target={db_user.id} role={db_user.role}"
    )
    return db_user


@router.post("/users/{user_id}/ban", response_model=AdminUserSchema)
def ban_user(
    user_id: int,
    payload: BanRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Ban a user permanently, or temporarily when duration_hours is given."""
    user = _get_target_user(user_id, db)
    assert_can_manage(current_user, user)

    now = datetime.now(timezone.utc)
    user.is_active = False
    user.banned_until = (
        now + timedelta(hours=payload.duration_hours) if payload.duration_hours else None
    )
    user.ban_reason = payload.reason
    user.banned_at = now
    user.banned_by_id = current_user.id
    db.commit()
    db.refresh(user)

    logger.info(
        f"[admin-action] actor={current_user.id} action=ban target={user.id} "
        f"until={user.banned_until.isoformat() if user.banned_until else 'permanent'} "
        f"reason={user.ban_reason!r}"
    )
    return user


@router.post("/users/{user_id}/restore", response_model=AdminUserSchema)
def restore_user(
    user_id: int,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Lift any ban on a user. Idempotent."""
    user = _get_target_user(user_id, db)
    assert_can_manage(current_user, user)

    user.is_active = True
    user.banned_until = None
    user.ban_reason = None
    user.banned_at = None
    user.banned_by_id = None
    db.commit()
    db.refresh(user)

    logger.info(f"[admin-action] actor={current_user.id} action=restore target={user.id}")
    return user


@router.post("/users/{user_id}/reset-password", response_model=TempPasswordResponse)
def reset_user_password(
    user_id: int,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Set a generated password on a user's account and return it exactly once.
    The plaintext is never stored or logged — relay it out of band.
    """
    user = _get_target_user(user_id, db)
    assert_can_manage(current_user, user)

    temp_password = generate_temp_password()
    user.hashed_password = get_password_hash(temp_password)
    user.must_change_password = True
    db.commit()
    db.refresh(user)

    logger.info(
        f"[admin-action] actor={current_user.id} action=reset_password target={user.id}"
    )
    return TempPasswordResponse(
        user_id=user.id,
        email=user.email,
        temp_password=temp_password,
        must_change_password=user.must_change_password,
    )


@router.patch("/users/{user_id}/role", response_model=AdminUserSchema)
def change_user_role(
    user_id: int,
    payload: RoleChangeRequest,
    current_user: User = Depends(require_role(UserRole.SUPERADMIN)),
    db: Session = Depends(get_db),
):
    """Promote or demote a user. Superadmin only."""
    user = _get_target_user(user_id, db)
    assert_can_change_role(current_user, user, payload.new_role, db)

    user.role = payload.new_role
    db.commit()
    db.refresh(user)

    logger.info(
        f"[admin-action] actor={current_user.id} action=change_role "
        f"target={user.id} new_role={user.role}"
    )
    return user


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

        # Cached thumbnail cleanup is best-effort — an orphan here is harmless
        try:
            delete_file(thumbnail_object_key(resource.id))
        except Exception:
            logger.warning(f"Failed to delete cached thumbnail for resource {resource.id}")

    db.delete(resource)
    db.commit()
    logger.info(f"Resource {resource_id} hard-deleted by superadmin {current_user.id}")
