from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional

from app.controllers.auth.schemas import UserCreate, UserSchema

# One year — the longest temporary ban that still makes sense as "temporary"
MAX_BAN_DURATION_HOURS = 8760


class BanRequest(BaseModel):
    """A ban with no duration is permanent."""

    reason: Optional[str] = None
    duration_hours: Optional[int] = Field(None, ge=1, le=MAX_BAN_DURATION_HOURS)

    @field_validator("reason")
    @classmethod
    def reason_length(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        if len(v) > 500:
            raise ValueError("Reason must be at most 500 characters")
        return v


class RoleChangeRequest(BaseModel):
    new_role: int = Field(..., ge=0, le=3)


class AdminUserCreate(UserCreate):
    role: int = Field(0, ge=0, le=3)


class TempPasswordResponse(BaseModel):
    """The generated password is returned exactly once and never stored."""

    user_id: int
    email: EmailStr
    temp_password: str
    must_change_password: bool


class AdminUserSchema(UserSchema):
    banned_until: Optional[datetime] = None
    ban_reason: Optional[str] = None
    banned_at: Optional[datetime] = None
    banned_by_id: Optional[int] = None
    must_change_password: bool = False

    class Config:
        from_attributes = True
