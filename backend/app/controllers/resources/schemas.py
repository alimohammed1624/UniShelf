from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ResourceBase(BaseModel):
    title: str
    description: Optional[str] = None
    visibility: str = "public"


class ResourceCreate(ResourceBase):
    pass


class Resource(ResourceBase):
    id: int
    file_path: str
    uploader_id: int
    created_at: datetime

    class Config:
        from_attributes = True
