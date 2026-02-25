from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=False, default="")
    category = Column(String, nullable=False, default="general")

    # Relationships
    resources = relationship("Resource", secondary="resource_tags", back_populates="tags")
    interested_users = relationship("User", secondary="user_tags", back_populates="interest_tags")
