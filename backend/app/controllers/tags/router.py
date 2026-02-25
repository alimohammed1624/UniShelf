import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models import Tag
from app.models.enums import UserRole
from app.database import get_db
from app.controllers.auth.helpers import get_current_user, require_role
from .schemas import TagCreate, TagUpdate, TagSchema

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=List[TagSchema])
def list_tags(
    category: Optional[str] = Query(None, max_length=50),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    query = db.query(Tag)
    if category:
        query = query.filter(Tag.category == category.strip().lower())
    query = query.order_by(Tag.name)
    return query.offset(skip).limit(limit).all()


@router.post("", response_model=TagSchema, status_code=status.HTTP_201_CREATED)
def create_tag(
    tag: TagCreate,
    current_user=Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    db_tag = Tag(
        name=tag.name,
        description=tag.description,
        category=tag.category,
    )
    db.add(db_tag)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tag '{tag.name}' already exists",
        )

    db.refresh(db_tag)
    return db_tag


@router.put("/{tag_id}", response_model=TagSchema)
def update_tag(
    tag_id: int,
    updates: TagUpdate,
    current_user=Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    if updates.name is not None:
        tag.name = updates.name
    if updates.description is not None:
        tag.description = updates.description
    if updates.category is not None:
        tag.category = updates.category

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tag name '{updates.name}' already exists",
        )

    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: int,
    current_user=Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    db.delete(tag)  # CASCADE on FK handles junction table cleanup
    db.commit()
    logger.info(f"Tag {tag_id} ('{tag.name}') deleted by user {current_user.id}")
