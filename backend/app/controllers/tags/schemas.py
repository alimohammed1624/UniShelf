from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
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


class TagSuggestionRequest(BaseModel):
    # The length caps bound both the cost and the prompt-injection blast radius
    # of this input: without them a user can paste 100KB into the search box and
    # we pay to send it upstream.
    query: Optional[str] = Field(default="", max_length=200)
    selected_tags: List[str] = Field(default_factory=list, max_length=20)
    limit: int = Field(default=6, ge=1, le=10)

    @field_validator("query")
    @classmethod
    def clean_query(cls, v: Optional[str]) -> str:
        return (v or "").strip()

    @field_validator("selected_tags")
    @classmethod
    def clean_selected_tags(cls, v: List[str]) -> List[str]:
        return [t.strip().lower() for t in v if t and t.strip()]


class TagSuggestion(BaseModel):
    id: int
    name: str
    reason: str = ""


class TagSuggestionsResponse(BaseModel):
    suggestions: List[TagSuggestion]
    # How the list was produced: llm / cache / popular / fallback / disabled
    source: str
