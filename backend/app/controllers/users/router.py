import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session

from app.models import User, Tag
from app.models.resource import Resource
from app.database import get_db
from app.controllers.auth.schemas import UserSchema, UserUpdate, UserPublicProfile
from app.controllers.auth.helpers import get_current_user, get_password_hash
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
        current_user.must_change_password = False

    db.commit()
    db.refresh(current_user)
    return current_user



# ── Bookmarks ───────────────────────────────────────────────

@router.get("/me/bookmarks", response_model=List[int])
def get_my_bookmarks(current_user: User = Depends(get_current_user)):
    """Returns a list of resource IDs bookmarked by the user."""
    return [r.id for r in current_user.bookmarked_resources]

@router.post("/me/bookmarks/{resource_id}")
def add_bookmark(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    if resource not in current_user.bookmarked_resources:
        current_user.bookmarked_resources.append(resource)
        db.commit()
    return {"message": "Bookmark added"}

@router.delete("/me/bookmarks/{resource_id}")
def remove_bookmark(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    if resource in current_user.bookmarked_resources:
        current_user.bookmarked_resources.remove(resource)
        db.commit()
    return {"message": "Bookmark removed"}


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

# Ban/restore, password reset and role changes live in the admin domain:
# see app/controllers/admin/router.py (/admin/users/...).
