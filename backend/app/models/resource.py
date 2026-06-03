from sqlalchemy import Column, ForeignKey, Integer, BigInteger, String, Boolean, DateTime, func
from sqlalchemy.types import UserDefinedType
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy.ext.compiler import compiles


class LTREE(UserDefinedType):
    """PostgreSQL ltree type for hierarchical paths."""
    cache_ok = True

    def get_col_spec(self, **kw):
        return "ltree"

    def bind_processor(self, dialect):
        def process(value):
            if value is None:
                return None
            v = str(value).strip().lower()
            # ltree labels allow letters, digits, underscores; dots separate labels
            # PostgreSQL will reject truly invalid values, so we just normalize format
            return v
        return process

    def result_processor(self, dialect, coltype):
        def process(value):
            if value is None:
                return None
            return str(value)
        return process


@compiles(LTREE, "postgresql")
def compile_ltree(element, compiler, **kw):
    return "LTREE"


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=False, default="")
    file_path = Column(String, nullable=True)  # Null for directory-type resources
    hierarchy = Column(LTREE, nullable=False, server_default="", index=True)  # PostgreSQL ltree path
    parent_id = Column(Integer, ForeignKey("resources.id"), nullable=True)  # Self-ref for tree
    filename = Column(String, nullable=True)  # Original upload filename; null for dirs
    size = Column(BigInteger, nullable=True)  # Bytes; null for dirs
    type = Column(String, nullable=False, default="application/octet-stream")  # MIME or "directory"
    is_public = Column(Boolean, nullable=False, default=True)
    is_anonymous = Column(Boolean, nullable=False, default=False)
    uploader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_archived = Column(Boolean, nullable=False, default=False)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())

    # Relationships
    uploader = relationship("User", back_populates="resources", foreign_keys=[uploader_id])
    owner = relationship("User", back_populates="owned_resources", foreign_keys=[owner_id])
    parent = relationship("Resource", remote_side=[id], backref="children")
    tags = relationship("Tag", secondary="resource_tags", back_populates="resources")
    visibility_entries = relationship("Visibility", back_populates="resource", cascade="all, delete-orphan")
