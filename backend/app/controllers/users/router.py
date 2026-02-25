import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.orm import Session

from app.models import User, Tag
from app.models.enums import UserRole
from app.database import get_db
from app.controllers.auth.schemas import UserSchema, UserUpdate, UserPublicProfile
from app.controllers.auth.helpers import get_current_user, get_password_hash, require_role
from app.controllers.tags.schemas import TagSchema
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


# ── Current user profile ─────────────────────────────────────


@router.get("/me", response_model=UserSchema)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserSchema)
def update_my_profile(
    updates: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if updates.full_name is not None:
        current_user.full_name = updates.full_name.strip()
    if updates.password is not None:
        current_user.hashed_password = get_password_hash(updates.password)

    db.commit()
    db.refresh(current_user)
    return current_user


# ── Interest tags ─────────────────────────────────────────────


@router.get("/me/tags", response_model=List[TagSchema])
def get_my_interest_tags(current_user: User = Depends(get_current_user)):
    return current_user.interest_tags


@router.put("/me/tags", response_model=List[TagSchema])
def set_my_interest_tags(
    tag_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if len(tag_ids) > settings.MAX_TAGS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {settings.MAX_TAGS_PER_USER} interest tags allowed",
        )

    # Deduplicate and validate
    unique_ids = list(set(tag_ids))
    tags = db.query(Tag).filter(Tag.id.in_(unique_ids)).all()
    if len(tags) != len(unique_ids):
        found_ids = {t.id for t in tags}
        missing = [i for i in unique_ids if i not in found_ids]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tags not found: {missing}",
        )

    current_user.interest_tags = tags
    db.commit()
    db.refresh(current_user)
    return current_user.interest_tags


# ── Public profiles ───────────────────────────────────────────


@router.get("/{user_id}", response_model=UserPublicProfile)
def get_user_profile(
    user_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


# ── Admin: ban/unban ──────────────────────────────────────────


@router.patch("/{user_id}/ban", response_model=UserSchema)
def toggle_user_ban(
    user_id: int,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot ban yourself",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Cannot ban someone with equal or higher role
    if user.role >= current_user.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot ban a user with equal or higher role",
        )

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    logger.info(f"User {user_id} {'unbanned' if user.is_active else 'banned'} by {current_user.id}")
    return user


# ── Admin: change role ────────────────────────────────────────


@router.patch("/{user_id}/role", response_model=UserSchema)
def change_user_role(
    user_id: int,
    new_role: int = Query(..., ge=0, le=3),
    current_user: User = Depends(require_role(UserRole.SUPERADMIN)),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.role = new_role
    db.commit()
    db.refresh(user)
    logger.info(f"User {user_id} role changed to {new_role} by {current_user.id}")
    return user
