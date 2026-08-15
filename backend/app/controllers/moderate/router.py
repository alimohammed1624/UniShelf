import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError

from app.models import Report, Resource, User
from app.models.enums import UserRole, ReportStatus, ArchiveKind
from app.database import get_db
from app.controllers.auth.helpers import get_current_user, require_role
from app.controllers.resources.schemas import ResourceSchema
from .schemas import ReportCreate, ReportSchema, ResourceBrief, redact_report_uploader

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

    try:
        db.commit()
    except IntegrityError:
        # Lost the race against a concurrent submit — same answer as the check above.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reported this resource"
        )

    db.refresh(new_report)

    logger.info(f"Report {new_report.id} submitted by user {current_user.id} on resource {report_data.resource_id}")
    return redact_report_uploader(
        ReportSchema.model_validate(new_report), resource, current_user
    )


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

    now = datetime.now(timezone.utc)

    # Archive the resource as a takedown. archive_reason is String(500) while
    # Report.reason allows 2000, so it has to be cut down to fit.
    resource.is_archived = True
    resource.archived_at = now
    resource.archived_by_id = current_user.id
    resource.archive_kind = int(ArchiveKind.MODERATION)
    resource.archive_reason = (
        report.reason if len(report.reason) <= 500 else report.reason[:497] + "..."
    )

    # Mark report as resolved
    report.status = int(ReportStatus.RESOLVED)
    report.resolved_at = now

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


# ── Takedowns ─────────────────────────────────────────────────


@router.get("/resources/archived", response_model=list[ResourceSchema])
def list_archived_resources(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_role(UserRole.MODERATOR)),
    db: Session = Depends(get_db),
):
    """
    List resources taken down by moderation. Moderators only.

    Backed by the resources themselves rather than resolved reports —
    dismiss_report also resolves without archiving, so a report-derived
    listing shows dismissed false alarms as takedowns.
    """
    query = (
        db.query(Resource)
        .options(selectinload(Resource.tags))
        .filter(
            Resource.is_archived == True,
            Resource.archive_kind == int(ArchiveKind.MODERATION),
        )
        .order_by(Resource.archived_at.desc(), Resource.id.desc())
    )
    return query.offset(skip).limit(limit).all()
