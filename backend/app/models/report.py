from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Index, func, text
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
        # One *open* report per user per resource. A plain unique constraint on
        # the pair outlived the report it was about: once the first report was
        # resolved or dismissed, submit_report's own duplicate check (which is
        # scoped to OPEN) let the insert through and the constraint turned it
        # into a 500. Reporting a resource again after the last one is closed is
        # legitimate — a dismissed report does not archive, and a takedown can be
        # restored — so the index carries the same status scope as the check.
        Index(
            "uq_report_open_per_user_resource",
            "reported_by",
            "resource_id",
            unique=True,
            postgresql_where=text(f"status = {int(ReportStatus.OPEN)}"),
        ),
        Index("ix_reports_status", "status"),
        Index("ix_reports_resource_id", "resource_id"),
    )

    # Relationships
    reported_by_user = relationship("User", foreign_keys=[reported_by])
    resource = relationship("Resource", foreign_keys=[resource_id])
