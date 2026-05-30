import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload

from app.models import Report, Resource, User
from app.models.enums import UserRole, ReportStatus
from app.database import get_db
from app.controllers.auth.helpers import get_current_user, require_role
from .schemas import ReportCreate, ReportSchema, ResourceBrief

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/moderate", tags=["moderator"])


@router.post("/reports", response_model=ReportSchema, status_code=status.HTTP_201_CREATED)
def submit_report(
    report_data: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a report on a resource. Any authenticated user can do this."""
    # Check if resource exists and is not already archived
    resource = db.query(Resource).filter(
        Resource.id == report_data.resource_id,
        Resource.is_archived == False
    ).first()
    if resource is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found or already archived"
        )

    # Check for duplicate report
    existing = db.query(Report).filter(
        Report.reported_by == current_user.id,
        Report.resource_id == report_data.resource_id,
        Report.status == int(ReportStatus.OPEN)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reported this resource"
        )

    new_report = Report(
        reported_by=current_user.id,
        resource_id=report_data.resource_id,
        reason=report_data.reason,
        status=int(ReportStatus.OPEN)
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    logger.info(f"Report {new_report.id} submitted by user {current_user.id} on resource {report_data.resource_id}")
    return new_report


@router.get("/reports", response_model=list[ReportSchema])
def list_reports(
    status_filter: int = Query(None, ge=0, le=1, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_role(UserRole.MODERATOR)),
    db: Session = Depends(get_db),
):
    """List reports. Moderators only. Defaults to open reports."""
    query = db.query(Report).options(selectinload(Report.resource))

    if status_filter is not None:
        query = query.filter(Report.status == status_filter)
    else:
        query = query.filter(Report.status == int(ReportStatus.OPEN))

    query = query.order_by(Report.created_at.desc(), Report.id.desc())
    return query.offset(skip).limit(limit).all()


@router.put("/reports/{report_id}", response_model=ReportSchema)
def resolve_report(
    report_id: int,
    current_user: User = Depends(require_role(UserRole.MODERATOR)),
    db: Session = Depends(get_db),
):
    """Resolve a report and archive the associated resource. Moderators only."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    if report.status != int(ReportStatus.OPEN):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report is already resolved"
        )

    resource = db.query(Resource).filter(Resource.id == report.resource_id).first()
    if resource is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated resource not found"
        )

    # Archive the resource
    resource.is_archived = True

    # Mark report as resolved
    report.status = int(ReportStatus.RESOLVED)
    report.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(report)

    logger.info(f"Report {report_id} resolved by moderator {current_user.id}, resource {resource.id} archived")
    return report


@router.delete("/reports/{report_id}", response_model=ReportSchema)
def dismiss_report(
    report_id: int,
    current_user: User = Depends(require_role(UserRole.MODERATOR)),
    db: Session = Depends(get_db),
):
    """Dismiss a report as a false alarm. Moderators only."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    if report.status != int(ReportStatus.OPEN):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report is already resolved"
        )

    # Mark report as dismissed (resolved without archiving)
    report.status = int(ReportStatus.RESOLVED)
    report.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(report)

    logger.info(f"Report {report_id} dismissed by moderator {current_user.id}")
    return report
