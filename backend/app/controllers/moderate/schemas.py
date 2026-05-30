from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional


class ResourceBrief(BaseModel):
    id: int
    title: str
    filename: Optional[str] = None
    uploader_id: int
    is_archived: bool

    class Config:
        from_attributes = True


class ReportCreate(BaseModel):
    resource_id: int
    reason: str

    @field_validator("reason")
    @classmethod
    def reason_length(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Reason cannot be empty")
        if len(v) > 2000:
            raise ValueError("Reason must be at most 2000 characters")
        return v


class ReportSchema(BaseModel):
    id: int
    reported_by: int
    resource_id: int
    reason: str
    status: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resource: ResourceBrief

    class Config:
        from_attributes = True
