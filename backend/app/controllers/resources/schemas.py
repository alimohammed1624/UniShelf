from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List
import re

from app.utils.db_helpers import can_see_owner, can_see_uploader


# ── Tag brief (for embedding in resource responses) ──────────


class TagBrief(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


# ── Resource schemas ─────────────────────────────────────────


class ResourceSchema(BaseModel):
    id: int
    title: str
    description: str
    file_path: Optional[str] = None
    hierarchy: str
    parent_id: Optional[int] = None
    filename: Optional[str] = None
    size: Optional[int] = None
    type: str
    is_public: bool
    is_anonymous: bool
    uploader_id: Optional[int] = None  # Null when redacted — see for_viewer()
    owner_id: Optional[int] = None  # Null when redacted — see for_viewer()
    is_archived: bool
    archived_at: Optional[datetime] = None
    archived_by_id: Optional[int] = None
    archive_reason: Optional[str] = None
    archive_kind: Optional[int] = None  # 0 = SELF, 1 = MODERATION
    last_accessed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    tags: List[TagBrief] = []

    class Config:
        from_attributes = True

    @classmethod
    def for_viewer(cls, resource, viewer) -> "ResourceSchema":
        """
        Serialize a resource as `viewer` is allowed to see it.

        Anonymity is enforced here rather than in the client: withholding the id
        is what makes it real, since /users/{id} will answer for any id that
        leaves the building. `is_anonymous` still ships, so the UI knows to
        render "Anonymous" rather than an absent uploader.

        Both people-shaped columns are covered. On an anonymous upload the owner
        starts out as the uploader, so redacting one and publishing the other
        would leave the name a single lookup away.
        """
        schema = cls.model_validate(resource)
        if not can_see_uploader(resource, viewer):
            schema.uploader_id = None
        if not can_see_owner(resource, viewer):
            schema.owner_id = None
        return schema


class DirectoryCreate(BaseModel):
    title: str
    description: str = ""
    is_public: bool = True
    is_anonymous: bool = False
    parent_id: Optional[int] = None

    @field_validator("title")
    @classmethod
    def title_length(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Title cannot be empty")
        if len(v) > 255:
            raise ValueError("Title must be at most 255 characters")
        return v

    @field_validator("description")
    @classmethod
    def description_length(cls, v: str) -> str:
        if len(v) > 2000:
            raise ValueError("Description must be at most 2000 characters")
        return v


class ResourceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    is_anonymous: Optional[bool] = None
    hierarchy: Optional[str] = None
    parent_id: Optional[int] = None

    @field_validator("title")
    @classmethod
    def title_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Title cannot be empty")
            if len(v) > 255:
                raise ValueError("Title must be at most 255 characters")
        return v

    @field_validator("description")
    @classmethod
    def description_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 2000:
            raise ValueError("Description must be at most 2000 characters")
        return v

    @field_validator("hierarchy")
    @classmethod
    def hierarchy_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            if not re.match(r"^[a-z0-9_]+(\.[a-z0-9_]+)*$", v):
                raise ValueError("Hierarchy must be a dot-separated lowercase alphanumeric resource path")
            if len(v.split(".")) > 10:
                raise ValueError("Hierarchy depth cannot exceed 10 levels")
        return v


# ── Visibility schemas ───────────────────────────────────────


class VisibilityCreate(BaseModel):
    user_id: int
    access_type: int  # 0 = WHITELIST, 1 = BLACKLIST

    @field_validator("access_type")
    @classmethod
    def valid_access_type(cls, v: int) -> int:
        if v not in (0, 1):
            raise ValueError("access_type must be 0 (WHITELIST) or 1 (BLACKLIST)")
        return v


class VisibilitySchema(BaseModel):
    id: int
    resource_id: int
    user_id: int
    access_type: int

    class Config:
        from_attributes = True
