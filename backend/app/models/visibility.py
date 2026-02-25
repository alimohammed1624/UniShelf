from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import AccessType


class Visibility(Base):
    __tablename__ = "visibility"

    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(Integer, ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    access_type = Column(Integer, nullable=False)  # AccessType enum value (0=WHITELIST, 1=BLACKLIST)

    __table_args__ = (
        UniqueConstraint("resource_id", "user_id", name="uq_visibility_resource_user"),
    )

    # Relationships
    resource = relationship("Resource", back_populates="visibility_entries")
    user = relationship("User", back_populates="visibility_entries")
