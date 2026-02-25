from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False, default="")
    role = Column(Integer, nullable=False, default=int(UserRole.STUDENT))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())

    # Relationships
    resources = relationship("Resource", back_populates="uploader", foreign_keys="Resource.uploader_id")
    owned_resources = relationship("Resource", back_populates="owner", foreign_keys="Resource.owner_id")
    interest_tags = relationship("Tag", secondary="user_tags", back_populates="interested_users")
    visibility_entries = relationship("Visibility", back_populates="user")
