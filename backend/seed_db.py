#!/usr/bin/env python3
"""Seed script for UniShelf database.

Populates a demo organisation — users across every role, a department
directory tree, and the states the app is actually built to handle:
anonymous uploads, per-user access lists, an open moderation queue, a
moderation takedown alongside an owner's own archive, bookmarks, and
interest tags.

Usage:
    docker compose exec backend python seed_db.py
    docker compose exec backend python seed_db.py --reset
"""

import io
import logging
import sys
import uuid
from argparse import ArgumentParser, Namespace
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.controllers.auth.helpers import pwd_context
from app.database import SessionLocal, engine
from app.models import Base, Report, Resource, Tag, User, Visibility
from app.models.associations import resource_tags, user_bookmarks, user_tags
from app.models.enums import AccessType, ArchiveKind, ReportStatus, UserRole
from app.utils.minio_client import MINIO_BUCKET_NAME, get_minio_client

if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


NOW = datetime.now(timezone.utc)

DIRECTORY_TYPE = "directory"


# ── Seed definitions ──────────────────────────────────────────


@dataclass(frozen=True)
class SeedUser:
    email: str
    full_name: str
    role: int
    password: str
    is_active: bool = True
    ban_reason: Optional[str] = None
    banned_by: Optional[str] = None
    must_change_password: bool = False


@dataclass(frozen=True)
class SeedResource:
    """
    One row in the demo tree.

    `hierarchy` is the full ltree path and doubles as this script's primary
    key: parents are referenced by path, and a re-run skips any path that is
    already present. `parent` must appear earlier in the list than its
    children, since parents are resolved as they are created.
    """

    title: str
    description: str
    hierarchy: str
    owner: str
    content_type: str
    parent: Optional[str] = None
    tags: tuple[str, ...] = ()
    is_public: bool = True
    is_anonymous: bool = False
    body: tuple[str, ...] = ()

    @property
    def is_directory(self) -> bool:
        return self.content_type == DIRECTORY_TYPE


@dataclass(frozen=True)
class SeedReport:
    reporter: str
    resource: str  # hierarchy path
    reason: str
    status: int = int(ReportStatus.OPEN)


@dataclass(frozen=True)
class SeedArchive:
    resource: str  # hierarchy path
    kind: int
    archived_by: str
    reason: str
    days_ago: int = 3


SUPERADMIN = "superadmin@unishelf.app"
ADMIN = "admin@unishelf.app"
ADMIN2 = "admin2@unishelf.app"
MOD = "mod@unishelf.app"
MEMBER1 = "member1@unishelf.app"
MEMBER2 = "member2@unishelf.app"
BANNED = "banned@unishelf.app"


USERS: list[SeedUser] = [
    SeedUser(SUPERADMIN, "Priya Raghavan", int(UserRole.SUPERADMIN), "Super123!"),
    SeedUser(ADMIN, "Daniel Okafor", int(UserRole.ADMIN), "Admin123!"),
    SeedUser(ADMIN2, "Mei Lin Chen", int(UserRole.ADMIN), "Admin123!"),
    SeedUser(MOD, "Tomas Herrera", int(UserRole.MODERATOR), "Mod123!"),
    SeedUser(MEMBER1, "Aisha Bello", int(UserRole.MEMBER), "Member123!"),
    # Exercises the forced-rotation flag an admin password reset sets.
    SeedUser(
        MEMBER2,
        "Jonas Weber",
        int(UserRole.MEMBER),
        "Member123!",
        must_change_password=True,
    ),
    SeedUser(
        BANNED,
        "Rob Castellan",
        int(UserRole.MEMBER),
        "Member123!",
        is_active=False,
        ban_reason="Repeatedly re-uploaded confidential finance documents to public folders.",
        banned_by=MOD,
    ),
]


TAGS: list[tuple[str, str, str]] = [
    # (name, description, category)
    ("engineering", "Owned by the engineering department", "department"),
    ("people-ops", "Owned by people operations", "department"),
    ("finance", "Owned by the finance department", "department"),
    ("design", "Owned by the design department", "department"),
    ("runbook", "Step-by-step operational procedure", "doctype"),
    ("policy", "Company policy or standard", "doctype"),
    ("template", "Reusable starting point", "doctype"),
    ("guide", "Explanatory walkthrough", "doctype"),
    ("spec", "Technical specification or design doc", "doctype"),
    ("meeting-notes", "Notes from a meeting or review", "doctype"),
    ("report", "Findings, metrics, or a postmortem", "doctype"),
    ("onboarding", "Material for people joining the org", "topic"),
    ("incident", "Related to an outage or incident", "topic"),
    ("security", "Security-relevant material", "topic"),
    ("approved", "Reviewed and signed off", "status"),
    ("draft", "Work in progress, not yet reviewed", "status"),
    ("confidential", "Restricted circulation", "status"),
]


RESOURCES: list[SeedResource] = [
    # ── Engineering ───────────────────────────────────────────
    SeedResource(
        "Engineering", "Everything the engineering team owns.",
        "engineering", ADMIN, DIRECTORY_TYPE, tags=("engineering",),
    ),
    SeedResource(
        "Onboarding", "First-week material for new engineers.",
        "engineering.onboarding", ADMIN, DIRECTORY_TYPE,
        parent="engineering", tags=("engineering", "onboarding"),
    ),
    SeedResource(
        "Developer Setup Guide",
        "Local environment, toolchain, and repository access for new engineers.",
        "engineering.onboarding.setup_guide", ADMIN, "application/pdf",
        parent="engineering.onboarding",
        tags=("engineering", "guide", "onboarding", "approved"),
        body=(
            "1. Install the toolchain from the internal package mirror.",
            "2. Request repository access in the #access channel.",
            "3. Run the bootstrap script and confirm the test suite passes.",
            "4. Pair with your onboarding buddy on a starter ticket.",
        ),
    ),
    SeedResource(
        "Access Checklist",
        "Accounts and permissions to request before day one.",
        "engineering.onboarding.access_checklist", ADMIN, "text/markdown",
        parent="engineering.onboarding",
        tags=("engineering", "onboarding", "security"),
        body=(
            "- [ ] SSO account provisioned",
            "- [ ] Repository read access",
            "- [ ] Staging environment credentials",
            "- [ ] On-call rotation added (after week 4)",
        ),
    ),
    SeedResource(
        "Runbooks", "Operational procedures for production systems.",
        "engineering.runbooks", MOD, DIRECTORY_TYPE,
        parent="engineering", tags=("engineering", "runbook"),
    ),
    SeedResource(
        "Production Deploy Runbook",
        "The standard path to production, including the pre-flight checks.",
        "engineering.runbooks.deploy", MOD, "text/markdown",
        parent="engineering.runbooks",
        tags=("engineering", "runbook", "approved"),
        body=(
            "## Pre-flight",
            "Confirm the release branch is green and the migration plan is reviewed.",
            "",
            "## Deploy",
            "Promote the build, watch error rate for ten minutes, then close the window.",
        ),
    ),
    SeedResource(
        "Rollback Procedure",
        "How to revert a bad release without waiting for a fix-forward.",
        "engineering.runbooks.rollback", MOD, "text/markdown",
        parent="engineering.runbooks",
        tags=("engineering", "runbook", "incident", "approved"),
        body=(
            "Roll back at the load balancer first, then the database migration.",
            "Never roll back a destructive migration — restore from the snapshot instead.",
        ),
    ),
    SeedResource(
        "On-call Handover Notes",
        "Running log handed between on-call engineers each week.",
        "engineering.runbooks.oncall_handover", MOD, "text/markdown",
        parent="engineering.runbooks",
        tags=("engineering", "runbook", "meeting-notes"),
        body=(
            "Week 32: two paging alerts, both from the batch importer.",
            "Follow-up ticket opened to add a retry with backoff.",
        ),
    ),
    # Private directory — its children stay public in their own right, which is
    # what makes them a live demo of inherited privacy.
    SeedResource(
        "Architecture", "Internal system design records. Restricted.",
        "engineering.architecture", ADMIN, DIRECTORY_TYPE,
        parent="engineering", tags=("engineering", "spec", "confidential"),
        is_public=False,
    ),
    SeedResource(
        "System Overview",
        "Service map, data flows, and trust boundaries.",
        "engineering.architecture.system_overview", ADMIN, "application/pdf",
        parent="engineering.architecture",
        tags=("engineering", "spec", "confidential"),
        body=(
            "Edge -> API gateway -> service mesh -> primary datastore.",
            "Object storage sits outside the mesh and is reached by signed URL only.",
        ),
    ),
    SeedResource(
        "Data Model Notes",
        "Table ownership and retention rules per domain.",
        "engineering.architecture.data_model", ADMIN, "text/markdown",
        parent="engineering.architecture",
        tags=("engineering", "spec", "draft"),
        body=(
            "Each domain owns its tables outright; cross-domain reads go through the API.",
            "Retention defaults to 24 months unless the domain declares otherwise.",
        ),
    ),
    # ── People Ops ────────────────────────────────────────────
    SeedResource(
        "People Ops", "Policies, onboarding, and everything employment-related.",
        "people", ADMIN2, DIRECTORY_TYPE, tags=("people-ops",),
    ),
    SeedResource(
        "Onboarding", "What every new joiner receives in week one.",
        "people.onboarding", ADMIN2, DIRECTORY_TYPE,
        parent="people", tags=("people-ops", "onboarding"),
    ),
    SeedResource(
        "Welcome Packet",
        "Org chart, benefits summary, and first-week schedule.",
        "people.onboarding.welcome_packet", ADMIN2, "application/pdf",
        parent="people.onboarding",
        tags=("people-ops", "onboarding", "guide", "approved"),
        body=(
            "Welcome aboard. Your first week is deliberately light on delivery.",
            "Benefits enrolment closes 30 days after your start date.",
        ),
    ),
    SeedResource(
        "Equipment Policy",
        "What hardware you get, how to replace it, and what happens when you leave.",
        "people.onboarding.equipment_policy", ADMIN2, "text/markdown",
        parent="people.onboarding",
        tags=("people-ops", "policy", "onboarding", "approved"),
        body=(
            "Laptops refresh on a three-year cycle.",
            "Damaged equipment is replaced without cost unless there is a pattern.",
        ),
    ),
    SeedResource(
        "Policies", "Company-wide policies, reviewed annually.",
        "people.policies", ADMIN2, DIRECTORY_TYPE,
        parent="people", tags=("people-ops", "policy"),
    ),
    SeedResource(
        "Leave Policy",
        "Annual leave, sick leave, and how carry-over is calculated.",
        "people.policies.leave_policy", ADMIN2, "application/pdf",
        parent="people.policies",
        tags=("people-ops", "policy", "approved"),
        body=(
            "Annual leave accrues monthly and up to five days carry into the next year.",
            "Sick leave is uncapped and does not require a certificate under three days.",
        ),
    ),
    SeedResource(
        "Code of Conduct",
        "Expected behaviour, reporting channels, and escalation.",
        "people.policies.code_of_conduct", SUPERADMIN, "application/pdf",
        parent="people.policies",
        tags=("people-ops", "policy", "approved"),
        body=(
            "Treat colleagues with respect. Raise concerns early and in good faith.",
            "Reports may be made anonymously and are reviewed by people ops within five days.",
        ),
    ),
    # ── Finance — private, opened to named people via the ACL ──
    SeedResource(
        "Finance", "Budgets, invoicing, and reporting. Access by request.",
        "finance", SUPERADMIN, DIRECTORY_TYPE,
        tags=("finance", "confidential"), is_public=False,
    ),
    SeedResource(
        "FY26", "Current financial year.",
        "finance.fy26", SUPERADMIN, DIRECTORY_TYPE,
        parent="finance", tags=("finance",),
    ),
    SeedResource(
        "Budget Summary FY26",
        "Departmental allocations and headcount plan for the year.",
        "finance.fy26.budget_summary", SUPERADMIN, "application/pdf",
        parent="finance.fy26",
        tags=("finance", "report", "confidential"),
        body=(
            "Engineering holds the largest allocation, driven by infrastructure spend.",
            "Headcount plan assumes a hiring freeze through the second quarter.",
        ),
    ),
    SeedResource(
        "Invoice Template",
        "Standard invoice layout for vendors and contractors.",
        "finance.fy26.invoice_template", ADMIN, "text/plain",
        parent="finance.fy26",
        tags=("finance", "template", "approved"),
        body=(
            "Bill to: <organisation>",
            "Payment terms: net 30 from receipt.",
        ),
    ),
    # ── Design ────────────────────────────────────────────────
    SeedResource(
        "Design", "Brand, product design, and shared assets.",
        "design", MEMBER1, DIRECTORY_TYPE, tags=("design",),
    ),
    SeedResource(
        "Brand Guidelines",
        "Logo usage, colour tokens, and typography rules.",
        "design.brand_guidelines", MEMBER1, "application/pdf",
        parent="design",
        tags=("design", "guide", "approved"),
        body=(
            "Clear space around the mark is equal to the height of the mark itself.",
            "Never recolour the logo outside the approved token set.",
        ),
    ),
    SeedResource(
        "Q1 Campaign Deck",
        "Early concepts for the Q1 campaign. Superseded by the Q2 direction.",
        "design.q1_campaign_deck", MEMBER1, "text/markdown",
        parent="design",
        tags=("design", "draft"),
        body=("Three directions explored; the third tested best with existing customers.",),
    ),
    # ── Anonymous uploads ─────────────────────────────────────
    SeedResource(
        "Incident Notes — Payment Outage",
        "Timeline and contributing factors, posted without attribution.",
        "incidents.payment_outage_notes", MEMBER2, "text/markdown",
        tags=("incident", "report", "engineering"),
        is_anonymous=True,
        body=(
            "The outage began when the payment provider rotated a certificate without notice.",
            "Detection took eleven minutes; the alert threshold was too permissive.",
            "No customer data was exposed at any point.",
        ),
    ),
    SeedResource(
        "Team Health Feedback",
        "Candid feedback collected ahead of the quarterly review.",
        "feedback.team_health", MEMBER1, "text/plain",
        tags=("meeting-notes", "people-ops"),
        is_anonymous=True,
        body=(
            "Delivery pressure is high and review cycles are the main bottleneck.",
            "People want clearer ownership boundaries between the two platform teams.",
        ),
    ),
    # ── Material for the moderation queue ─────────────────────
    SeedResource(
        "Old Expenses Sheet",
        "Superseded expense export that still contained personal details.",
        "shared.old_expenses_sheet", MEMBER2, "text/plain",
        tags=("finance", "report"),
        body=("Export retained for reference. Contains personal reimbursement lines.",),
    ),
    SeedResource(
        "Vendor Shortlist (Draft)",
        "Working notes on vendor selection, shared before review.",
        "procurement.vendor_shortlist", MEMBER2, "text/markdown",
        tags=("draft", "report"),
        body=("Three vendors shortlisted; pricing not yet negotiated.",),
    ),
]


# Whitelist punches through the private `finance` directory for one person;
# blacklist hides an otherwise-public document from another.
VISIBILITY: list[tuple[str, str, int]] = [
    # (resource hierarchy, user email, access type)
    ("finance", MEMBER1, int(AccessType.WHITELIST)),
    ("engineering.architecture", MEMBER1, int(AccessType.WHITELIST)),
    ("engineering.runbooks.oncall_handover", MEMBER2, int(AccessType.BLACKLIST)),
]


REPORTS: list[SeedReport] = [
    SeedReport(
        MEMBER1, "shared.old_expenses_sheet",
        "This export still has people's reimbursement lines in it. Should not be in a shared folder.",
        int(ReportStatus.RESOLVED),
    ),
    SeedReport(
        MEMBER1, "incidents.payment_outage_notes",
        "Posted anonymously but names the on-call engineer in the timeline.",
    ),
    SeedReport(
        MOD, "procurement.vendor_shortlist",
        "Vendor pricing shared before the review round has closed.",
    ),
]


ARCHIVES: list[SeedArchive] = [
    SeedArchive(
        "shared.old_expenses_sheet", int(ArchiveKind.MODERATION), MOD,
        "Taken down after report: contained personal reimbursement details.", days_ago=2,
    ),
    SeedArchive(
        "design.q1_campaign_deck", int(ArchiveKind.SELF), MEMBER1,
        "Superseded by the Q2 direction.", days_ago=9,
    ),
]


BOOKMARKS: list[tuple[str, str]] = [
    (MEMBER1, "engineering.runbooks.deploy"),
    (MEMBER1, "people.policies.leave_policy"),
    (MEMBER2, "people.onboarding.welcome_packet"),
    (MEMBER2, "engineering.onboarding.setup_guide"),
    (MOD, "people.policies.code_of_conduct"),
]


# Drives the AI tag suggestions, which read a member's stated interests
# alongside what they bookmark and upload.
INTERESTS: list[tuple[str, tuple[str, ...]]] = [
    (MEMBER1, ("engineering", "runbook", "spec")),
    (MEMBER2, ("people-ops", "policy", "onboarding")),
    (MOD, ("incident", "security", "policy")),
]


# ── Sample file generation ────────────────────────────────────


def _build_pdf(title: str, lines: tuple[str, ...]) -> bytes:
    """
    A genuinely valid single-page PDF with the title and body drawn on it.

    Byte offsets in the xref table are computed from the assembled objects
    rather than hardcoded: a PDF with a wrong xref opens in some viewers and
    fails in others, and the thumbnail pipeline (PyMuPDF) is one of the
    strict ones. A seeded library whose previews are all broken is worse
    than no seed at all.
    """

    def esc(text: str) -> str:
        return text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")

    content = ["BT", "/F1 18 Tf", "72 720 Td", f"({esc(title)}) Tj", "ET"]
    y = 690
    for line in lines:
        content += ["BT", "/F1 11 Tf", f"72 {y} Td", f"({esc(line[:95])}) Tj", "ET"]
        y -= 18
    stream = "\n".join(content).encode("latin-1", "replace")

    objects = [
        b"<</Type/Catalog/Pages 2 0 R>>",
        b"<</Type/Pages/Kids[3 0 R]/Count 1>>",
        b"<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]"
        b"/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>",
        b"<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
        b"<</Length " + str(len(stream)).encode() + b">>\nstream\n" + stream + b"\nendstream",
    ]

    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"

    xref_at = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += (
        f"trailer\n<</Size {len(objects) + 1}/Root 1 0 R>>\n"
        f"startxref\n{xref_at}\n%%EOF\n"
    ).encode()
    return bytes(out)


def generate_sample_file(spec: SeedResource) -> tuple[bytes, str, str]:
    """Build sample content for a resource. Returns (bytes, object_name, filename)."""
    slug = spec.hierarchy.replace(".", "-")
    body = spec.body or (spec.description,)

    if spec.content_type == "application/pdf":
        data, ext = _build_pdf(spec.title, body), "pdf"
    elif spec.content_type == "text/markdown":
        text = f"# {spec.title}\n\n_{spec.description}_\n\n" + "\n".join(body) + "\n"
        data, ext = text.encode("utf-8"), "md"
    else:
        text = f"{spec.title}\n{'=' * len(spec.title)}\n\n" + "\n".join(body) + "\n"
        data, ext = text.encode("utf-8"), "txt"

    return data, f"seeded/{uuid.uuid4().hex}/{slug}.{ext}", f"{slug}.{ext}"


# ── Seeding steps ─────────────────────────────────────────────


def reset_all(db: Session) -> None:
    """Wipe all data from the database and the MinIO bucket."""
    logger.info("Resetting all data...")

    # FK-safe order, children first. Reports come before resources: the
    # reports.resource_id FK has no ON DELETE, so deleting resources while a
    # report still points at one aborts the whole reset.
    db.query(Report).delete()
    db.query(Visibility).delete()
    db.execute(resource_tags.delete())
    db.execute(user_tags.delete())
    db.execute(user_bookmarks.delete())
    # Clear self-referencing and user-referencing FKs before their targets go
    db.query(Resource).update(
        {"parent_id": None, "archived_by_id": None}, synchronize_session=False
    )
    db.query(Resource).delete()
    db.query(Tag).delete()
    db.query(User).update({"banned_by_id": None}, synchronize_session=False)
    db.query(User).delete()

    try:
        client = get_minio_client()
        objects = list(client.list_objects(MINIO_BUCKET_NAME, recursive=True))
        for obj in objects:
            client.remove_object(MINIO_BUCKET_NAME, obj.object_name)
        logger.info(f"Removed {len(objects)} objects from MinIO")
    except Exception as e:
        logger.warning(f"Failed to clear MinIO bucket (continuing anyway): {e}")

    db.commit()
    logger.info("Reset complete")


def seed_users(db: Session) -> dict[str, User]:
    """Create the demo users. Returns every user by email, seeded or pre-existing."""
    created = 0
    for spec in USERS:
        if db.query(User).filter(User.email == spec.email).first():
            continue
        db.add(
            User(
                email=spec.email,
                full_name=spec.full_name,
                role=spec.role,
                hashed_password=pwd_context.hash(spec.password),
                is_active=spec.is_active,
                must_change_password=spec.must_change_password,
            )
        )
        created += 1
    db.flush()

    users = {u.email: u for u in db.query(User).all()}

    # Ban metadata needs the banning user's id, so it is a second pass.
    for spec in USERS:
        if spec.ban_reason is None:
            continue
        user = users.get(spec.email)
        banned_by = users.get(spec.banned_by) if spec.banned_by else None
        if user is None or user.ban_reason:
            continue
        user.ban_reason = spec.ban_reason
        user.banned_at = NOW - timedelta(days=6)
        user.banned_by_id = banned_by.id if banned_by else None
        user.banned_until = None  # Indefinite; a temp ban would set a date here

    logger.info(f"Users: {created} created, {len(users)} total")
    return users


def seed_tags(db: Session) -> dict[str, Tag]:
    """Create the demo tag vocabulary. Returns every tag by name."""
    created = 0
    for name, description, category in TAGS:
        if db.query(Tag).filter(Tag.name == name).first():
            continue
        db.add(Tag(name=name, description=description, category=category))
        created += 1
    db.flush()

    tags = {t.name: t for t in db.query(Tag).all()}
    logger.info(f"Tags: {created} created, {len(tags)} total")
    return tags


def seed_resources(
    db: Session, users: dict[str, User], tags: dict[str, Tag]
) -> dict[str, Resource]:
    """Create the demo tree, uploading a real file per non-directory resource."""
    by_path: dict[str, Resource] = {
        r.hierarchy: r for r in db.query(Resource).filter(Resource.hierarchy != "").all()
    }
    client = get_minio_client()
    created = uploaded = skipped = 0

    for spec in RESOURCES:
        if spec.hierarchy in by_path:
            continue

        owner = users.get(spec.owner)
        if owner is None:
            logger.warning(f"Skipping {spec.hierarchy}: owner {spec.owner} not found")
            skipped += 1
            continue

        parent = by_path.get(spec.parent) if spec.parent else None
        if spec.parent and parent is None:
            logger.warning(f"Skipping {spec.hierarchy}: parent {spec.parent} not found")
            skipped += 1
            continue

        file_path = filename = None
        size = None
        if not spec.is_directory:
            try:
                data, object_name, filename = generate_sample_file(spec)
                client.put_object(
                    MINIO_BUCKET_NAME,
                    object_name,
                    io.BytesIO(data),
                    length=len(data),
                    content_type=spec.content_type,
                )
            except Exception as e:
                # Deliberately broad: MinIO surfaces connection trouble as
                # urllib3 errors that are neither S3Error nor OSError. One
                # unreachable object should cost one resource, not abort the
                # whole run — main() rolls the entire transaction back.
                logger.error(f"Upload failed for {spec.hierarchy}: {e}")
                skipped += 1
                continue
            file_path, size = object_name, len(data)
            uploaded += 1

        resource = Resource(
            title=spec.title,
            description=spec.description,
            file_path=file_path,
            hierarchy=spec.hierarchy,
            parent_id=parent.id if parent else None,
            filename=filename,
            size=size,
            type=spec.content_type,
            is_public=spec.is_public,
            is_anonymous=spec.is_anonymous,
            uploader_id=owner.id,
            owner_id=owner.id,
            tags=[tags[t] for t in spec.tags if t in tags],
        )
        db.add(resource)
        db.flush()
        by_path[spec.hierarchy] = resource
        created += 1

    logger.info(
        f"Resources: {created} created ({uploaded} files uploaded)"
        + (f", {skipped} skipped" if skipped else "")
    )
    return by_path


def seed_visibility(
    db: Session, users: dict[str, User], resources: dict[str, Resource]
) -> None:
    """Apply the per-user access lists."""
    created = 0
    for path, email, access_type in VISIBILITY:
        resource, user = resources.get(path), users.get(email)
        if resource is None or user is None:
            continue
        exists = (
            db.query(Visibility)
            .filter(Visibility.resource_id == resource.id, Visibility.user_id == user.id)
            .first()
        )
        if exists:
            continue
        db.add(
            Visibility(resource_id=resource.id, user_id=user.id, access_type=access_type)
        )
        created += 1
    logger.info(f"Visibility entries: {created} created")


def seed_reports(
    db: Session, users: dict[str, User], resources: dict[str, Resource]
) -> None:
    """Populate the moderation queue with open and resolved reports."""
    created = 0
    for spec in REPORTS:
        resource, reporter = resources.get(spec.resource), users.get(spec.reporter)
        if resource is None or reporter is None:
            continue
        exists = (
            db.query(Report)
            .filter(Report.resource_id == resource.id, Report.reported_by == reporter.id)
            .first()
        )
        if exists:
            continue
        db.add(
            Report(
                reported_by=reporter.id,
                resource_id=resource.id,
                reason=spec.reason,
                status=spec.status,
                resolved_at=(
                    NOW - timedelta(days=2)
                    if spec.status == int(ReportStatus.RESOLVED)
                    else None
                ),
            )
        )
        created += 1
    logger.info(f"Reports: {created} created")


def seed_archives(
    db: Session, users: dict[str, User], resources: dict[str, Resource]
) -> None:
    """Archive a moderation takedown and an owner's own housekeeping."""
    created = 0
    for spec in ARCHIVES:
        resource, actor = resources.get(spec.resource), users.get(spec.archived_by)
        if resource is None or actor is None or resource.is_archived:
            continue
        resource.is_archived = True
        resource.archive_kind = spec.kind
        resource.archive_reason = spec.reason
        resource.archived_by_id = actor.id
        resource.archived_at = NOW - timedelta(days=spec.days_ago)
        created += 1
    logger.info(f"Archived resources: {created}")


def seed_bookmarks_and_interests(
    db: Session, users: dict[str, User], resources: dict[str, Resource], tags: dict[str, Tag]
) -> None:
    """Give members a profile — what they saved and what they care about."""
    bookmarked = 0
    for email, path in BOOKMARKS:
        user, resource = users.get(email), resources.get(path)
        if user is None or resource is None or resource in user.bookmarked_resources:
            continue
        user.bookmarked_resources.append(resource)
        bookmarked += 1

    interested = 0
    for email, tag_names in INTERESTS:
        user = users.get(email)
        if user is None or user.interest_tags:
            continue
        user.interest_tags = [tags[t] for t in tag_names if t in tags]
        interested += 1

    logger.info(f"Bookmarks: {bookmarked} created; interest profiles: {interested} set")


# ── Entry point ───────────────────────────────────────────────


def parse_args() -> Namespace:
    parser = ArgumentParser(description="Seed the UniShelf database with demo data")
    parser.add_argument(
        "--reset", action="store_true", help="Wipe all existing data before seeding"
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    logger.info("Starting UniShelf seed" + (" (RESET)" if args.reset else ""))

    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            if args.reset:
                reset_all(db)

            users = seed_users(db)
            tags = seed_tags(db)
            resources = seed_resources(db, users, tags)
            seed_visibility(db, users, resources)
            seed_reports(db, users, resources)
            seed_archives(db, users, resources)
            seed_bookmarks_and_interests(db, users, resources, tags)

            db.commit()
            logger.info("Seeding completed successfully")
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
