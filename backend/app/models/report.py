from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint, Index, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import ReportStatus


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reported_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)
    reason = Column(String(2000), nullable=False, default="")
    status = Column(Integer, nullable=False, default=int(ReportStatus.OPEN))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("reported_by", "resource_id", name="uq_report_user_resource"),
        Index("ix_reports_status", "status"),
        Index("ix_reports_resource_id", "resource_id"),
    )

    # Relationships
    reported_by_user = relationship("User", foreign_keys=[reported_by])
    resource = relationship("Resource", foreign_keys=[resource_id])
