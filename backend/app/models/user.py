from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False, default="")
    role = Column(Integer, nullable=False, default=int(UserRole.MEMBER))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())

    # Moderation metadata. `is_active` stays the single source of truth for
    # "can log in"; a temporary ban is a ban with an expiry, cleared lazily.
    banned_until = Column(DateTime(timezone=True), nullable=True)
    ban_reason = Column(String(500), nullable=True)
    banned_at = Column(DateTime(timezone=True), nullable=True)
    banned_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    must_change_password = Column(Boolean, nullable=False, default=False)

    __table_args__ = (Index("ix_users_banned_until", "banned_until"),)

    # Relationships
    resources = relationship("Resource", back_populates="uploader", foreign_keys="Resource.uploader_id")
    owned_resources = relationship("Resource", back_populates="owner", foreign_keys="Resource.owner_id")
    interest_tags = relationship("Tag", secondary="user_tags", back_populates="interested_users")
    visibility_entries = relationship("Visibility", back_populates="user")
    bookmarked_resources = relationship("Resource", secondary="user_bookmarks", backref="bookmarked_by_users")
