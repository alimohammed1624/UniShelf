from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

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

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    role: str
    created_at: datetime
    resources: List[Resource] = []

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
