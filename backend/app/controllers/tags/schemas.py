from pydantic import BaseModel, field_validator
from typing import Optional
import re


class TagCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    category: Optional[str] = "general"

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        v = v.strip().lower()
        # Replace spaces/underscores with hyphens for consistency
        v = re.sub(r"[\s_]+", "-", v)
        # Remove anything that's not alphanumeric or hyphen
        v = re.sub(r"[^a-z0-9-]", "", v)
        if not v:
            raise ValueError("Tag name is required")
        if len(v) > 50:
            raise ValueError("Tag name must be at most 50 characters")
        return v

    @field_validator("description")
    @classmethod
    def description_length(cls, v: Optional[str]) -> str:
        v = v or ""
        if len(v) > 200:
            raise ValueError("Description must be at most 200 characters")
        return v

    @field_validator("category")
    @classmethod
    def category_length(cls, v: Optional[str]) -> str:
        v = v or "general"
        v = v.strip().lower()
        if len(v) > 50:
            raise ValueError("Category must be at most 50 characters")
        return v


class TagUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().lower()
            v = re.sub(r"[\s_]+", "-", v)
            v = re.sub(r"[^a-z0-9-]", "", v)
            if not v:
                raise ValueError("Tag name cannot be empty")
            if len(v) > 50:
                raise ValueError("Tag name must be at most 50 characters")
        return v

    @field_validator("description")
    @classmethod
    def description_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 200:
            raise ValueError("Description must be at most 200 characters")
        return v

    @field_validator("category")
    @classmethod
    def category_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().lower()
            if len(v) > 50:
                raise ValueError("Category must be at most 50 characters")
        return v


class TagSchema(BaseModel):
    id: int
    name: str
    description: str
    category: str

    class Config:
        from_attributes = True
