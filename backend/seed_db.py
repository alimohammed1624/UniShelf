#!/usr/bin/env python3
"""Seed script for UniShelf database.

Usage:
    docker compose exec backend python seed_db.py
    docker compose exec backend python seed_db.py --reset
"""

import io
import sys
import uuid
import logging
from argparse import ArgumentParser, Namespace
from sqlalchemy.orm import Session

from app.models import User, Resource, Tag
from app.controllers.auth.helpers import pwd_context
from app.utils.minio_client import get_minio_client, MINIO_BUCKET_NAME
from minio.error import S3Error

if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

from app.database import SessionLocal, engine
from app.models import Base


def parse_args() -> Namespace:
    parser = ArgumentParser(description="Seed UniShelf database with sample data")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Wipe all existing data before seeding",
    )
    return parser.parse_args()


def reset_all(db: Session) -> None:
    """Wipe all data from the database and MinIO bucket."""
    logger.info("Resetting all data...")

    # Delete in FK-safe order (children first)
    from app.models import Visibility, resource_tags, user_tags

    db.query(Visibility).delete()
    db.execute(resource_tags.delete())
    db.execute(user_tags.delete())
    db.query(Resource).delete()
    db.query(Tag).delete()
    db.query(User).delete()

    # Clear MinIO bucket contents (best-effort)
    try:
        client = get_minio_client()
        objects = list(client.list_objects(MINIO_BUCKET_NAME, recursive=True))
        if objects:
            for obj in objects:
                client.remove_object(MINIO_BUCKET_NAME, obj.object_name)
            logger.info(f"Deleted {len(objects)} objects from MinIO bucket")
        else:
            logger.info("MinIO bucket is already empty")
    except Exception as e:
        logger.warning(f"Failed to clear MinIO bucket (continuing anyway): {e}")

    db.commit()
    logger.info("Reset complete")


def seed_users(db: Session) -> None:
    """Create seeded users with different roles."""
    from app.models.enums import UserRole

    users_data = [
        {
            "email": "admin@unishelf.edu",
            "full_name": "Admin User",
            "role": int(UserRole.ADMIN),
            "password": "Admin123!",
        },
        {
            "email": "mod@unishelf.edu",
            "full_name": "Moderator User",
            "role": int(UserRole.MODERATOR),
            "password": "Mod123!",
        },
        {
            "email": "student1@unishelf.edu",
            "full_name": "Student One",
            "role": int(UserRole.STUDENT),
            "password": "Student123!",
        },
        {
            "email": "student2@unishelf.edu",
            "full_name": "Student Two",
            "role": int(UserRole.STUDENT),
            "password": "Student123!",
        },
    ]

    created = 0
    for data in users_data:
        existing = db.query(User).filter(User.email == data["email"]).first()
        if existing:
            logger.info(f"User already exists: {data['email']}")
            continue

        user = User(
            email=data["email"],
            full_name=data["full_name"],
            role=data["role"],
            hashed_password=pwd_context.hash(data["password"]),
            is_active=True,
        )
        db.add(user)
        created += 1
        logger.info(
            f"Created user: {data['email']} (role={UserRole(data['role']).name})"
        )

    if created:
        logger.info(f"Seeded {created} users")


def seed_tags(db: Session) -> None:
    """Create seeded tags across various academic categories."""
    tags_data = [
        # Computer Science
        {
            "name": "data-structures",
            "description": "Data structures and algorithms fundamentals",
            "category": "cs",
        },
        {
            "name": "algorithms",
            "description": "Algorithm design and analysis",
            "category": "cs",
        },
        {
            "name": "operating-systems",
            "description": "OS concepts, process management, memory",
            "category": "cs",
        },
        {
            "name": "computer-networks",
            "description": "Network protocols and architecture",
            "category": "cs",
        },
        {
            "name": "databases",
            "description": "Database systems and SQL",
            "category": "cs",
        },
        {
            "name": "oop",
            "description": "Object-oriented programming principles",
            "category": "cs",
        },
        {
            "name": "compiler-design",
            "description": "Compiler construction and theory",
            "category": "cs",
        },
        {
            "name": "web-dev",
            "description": "Web development frameworks and tools",
            "category": "cs",
        },
        # Mathematics
        {
            "name": "calculus",
            "description": "Single and multivariable calculus",
            "category": "math",
        },
        {
            "name": "linear-algebra",
            "description": "Vector spaces, matrices, transformations",
            "category": "math",
        },
        {
            "name": "probability",
            "description": "Probability theory and distributions",
            "category": "math",
        },
        {
            "name": "discrete-math",
            "description": "Logic, sets, combinatorics, graph theory",
            "category": "math",
        },
        # Engineering
        {
            "name": "digital-logic",
            "description": "Digital circuit design and logic gates",
            "category": "engineering",
        },
        {
            "name": "electronics",
            "description": "Electronic devices and circuits",
            "category": "engineering",
        },
        {
            "name": "thermodynamics",
            "description": "Heat, energy, and thermodynamic laws",
            "category": "engineering",
        },
        # General
        {
            "name": "notes",
            "description": "Class notes and study materials",
            "category": "general",
        },
        {
            "name": "assignments",
            "description": "Homework and lab assignments",
            "category": "general",
        },
        {
            "name": "previous-papers",
            "description": "Past exam papers and solutions",
            "category": "general",
        },
    ]

    created = 0
    for data in tags_data:
        existing = db.query(Tag).filter(Tag.name == data["name"]).first()
        if existing:
            logger.info(f"Tag already exists: {data['name']}")
            continue

        tag = Tag(
            name=data["name"],
            description=data["description"],
            category=data["category"],
        )
        db.add(tag)
        created += 1
        logger.info(f"Created tag: {data['name']} (category={data['category']})")

    if created:
        logger.info(f"Seeded {created} tags")


def seed_resources(db: Session) -> None:
    """Create seeded resources with real MinIO uploads and tag assignments."""

    # Ensure uncommitted changes from seed_users/seed_tags are visible
    db.flush()

    # Fetch all seeded users and tags for reference
    users = {u.email: u for u in db.query(User).all()}
    tags_by_name = {t.name: t for t in db.query(Tag).all()}

    if not users or not tags_by_name:
        logger.error(
            "Cannot seed resources: missing users or tags. Run seed_users and seed_tags first."
        )
        return

    client = get_minio_client()

    # Resource definitions: (title, description, hierarchy, parent_hierarchy_or_none, owner_email, tag_names, content_type)
    resource_defs = [
        # Directory: cse.sem1
        (
            "CSE Semester 1",
            "First semester CSE materials",
            "cse.sem1",
            None,
            "admin@unishelf.edu",
            [],
            "directory",
        ),
        (
            "CS Fundamentals",
            "Introduction to computer science concepts",
            "cse.sem1.cs-fundamentals",
            "cse.sem1",
            "admin@unishelf.edu",
            ["data-structures", "notes"],
            "application/pdf",
        ),
        (
            "Math Basics",
            "Basic mathematics for CSE students",
            "cse.sem1.math-basics",
            "cse.sem1",
            "admin@unishelf.edu",
            ["calculus", "notes"],
            "text/plain",
        ),
        # Directory: cse.sem3
        (
            "CSE Semester 3",
            "Third semester CSE materials",
            "cse.sem3",
            None,
            "mod@unishelf.edu",
            [],
            "directory",
        ),
        (
            "DBMS",
            "Database Management Systems course material",
            "cse.sem3.dbms",
            "cse.sem3",
            "mod@unishelf.edu",
            ["databases", "notes"],
            "application/pdf",
        ),
        (
            "DBMS Lab Notes",
            "Lab notes for DBMS practical sessions",
            "cse.sem3.dbms.lab-notes",
            "cse.sem3",
            "mod@unishelf.edu",
            ["databases", "assignments"],
            "text/markdown",
        ),
        (
            "Algorithms",
            "Algorithm design and analysis notes",
            "cse.sem3.algorithms",
            "cse.sem3",
            "student1@unishelf.edu",
            ["algorithms", "data-structures"],
            "application/pdf",
        ),
        # Directory: math.calculus
        (
            "Math Calculus",
            "Calculus course materials",
            "math.calculus",
            None,
            "admin@unishelf.edu",
            [],
            "directory",
        ),
        (
            "Calculus Notes",
            "Lecture notes for calculus",
            "math.calculus.notes",
            "math.calculus",
            "mod@unishelf.edu",
            ["calculus", "notes"],
            "application/pdf",
        ),
        (
            "Calculus Exercises",
            "Practice problems and solutions",
            "math.calculus.exercises",
            "math.calculus",
            "admin@unishelf.edu",
            ["calculus", "assignments"],
            "text/plain",
        ),
        # Additional resources at root level
        (
            "Computer Networks Guide",
            "Complete networking reference guide",
            "computer-networks.guide",
            None,
            "mod@unishelf.edu",
            ["computer-networks", "notes"],
            "application/pdf",
        ),
        (
            "Linear Algebra Summary",
            "Key concepts and formulas",
            "linear-algebra.summary",
            None,
            "student1@unishelf.edu",
            ["linear-algebra", "notes"],
            "text/markdown",
        ),
        (
            "Digital Logic Lab",
            "Lab experiments and results",
            "digital-logic.lab",
            None,
            "admin@unishelf.edu",
            ["digital-logic", "assignments"],
            "text/plain",
        ),
        # Private resources for visibility testing
        (
            "Private Assignment 1",
            "Confidential assignment",
            "private.assignments.p1",
            None,
            "student2@unishelf.edu",
            ["assignments"],
            "text/plain",
        ),
        (
            "Internal Exam Paper",
            "Not for public distribution",
            "internal.exam.paper",
            None,
            "mod@unishelf.edu",
            ["previous-papers"],
            "application/pdf",
        ),
        # More resources under existing directories
        (
            "Operating Systems Notes",
            "Process scheduling and memory management",
            "cse.sem3.os-notes",
            "cse.sem3",
            "student1@unishelf.edu",
            ["operating-systems", "notes"],
            "text/markdown",
        ),
        (
            "Web Dev Project",
            "Full-stack web application code notes",
            "web-dev.project",
            None,
            "admin@unishelf.edu",
            ["web-dev", "oop"],
            "text/plain",
        ),
        (
            "Compiler Design Basics",
            "Lexical analysis and parsing intro",
            "compiler-design.basics",
            None,
            "mod@unishelf.edu",
            ["compiler-design", "algorithms"],
            "application/pdf",
        ),
        (
            "Thermodynamics Summary",
            "Laws of thermodynamics cheat sheet",
            "thermodynamics.summary",
            None,
            "student2@unishelf.edu",
            ["thermodynamics", "notes"],
            "text/plain",
        ),
        (
            "Probability Examples",
            "Worked probability problems",
            "probability.examples",
            None,
            "admin@unishelf.edu",
            ["probability", "assignments"],
            "text/markdown",
        ),
        (
            "Electronics Lab Manual",
            "Circuit experiments guide",
            "electronics.lab-manual",
            None,
            "student1@unishelf.edu",
            ["electronics", "assignments"],
            "application/pdf",
        ),
    ]

    # Build a lookup of existing resources by hierarchy for parent resolution
    existing_by_hierarchy = {
        r.hierarchy: r
        for r in db.query(Resource).filter(Resource.hierarchy != "").all()
    }

    created = 0
    uploaded = 0
    errors = []

    for (
        title,
        description,
        hierarchy,
        parent_hierarchy,
        owner_email,
        tag_names,
        content_type,
    ) in resource_defs:
        # Skip if already exists (non-reset run)
        existing = db.query(Resource).filter(Resource.hierarchy == hierarchy).first()
        if existing:
            logger.info(f"Resource already exists: {hierarchy}")
            continue

        # Resolve parent
        parent_id = None
        if parent_hierarchy:
            parent = existing_by_hierarchy.get(parent_hierarchy)
            if not parent:
                parent = (
                    db.query(Resource)
                    .filter(Resource.hierarchy == parent_hierarchy)
                    .first()
                )
                if parent:
                    existing_by_hierarchy[parent_hierarchy] = parent
            if parent:
                parent_id = parent.id

        # Get owner
        owner = users.get(owner_email)
        if not owner:
            errors.append(f"Owner not found: {owner_email}")
            continue

        # Handle directory-type resources (no file upload)
        if content_type == "directory":
            resource = Resource(
                title=title,
                description=description,
                hierarchy=hierarchy,
                parent_id=parent_id,
                filename=None,
                size=None,
                type="directory",
                is_public=True,
                is_anonymous=False,
                uploader_id=owner.id,
                owner_id=owner.id,
            )
            db.add(resource)
            db.flush()
            existing_by_hierarchy[hierarchy] = resource
            created += 1
            logger.info(f"Created directory: {hierarchy}")
            continue

        # Generate file content and upload to MinIO
        file_bytes = b""
        try:
            file_bytes, object_name = generate_sample_file(
                title.replace(" ", "-").lower(), content_type
            )
            client.put_object(
                MINIO_BUCKET_NAME,
                object_name,
                io.BytesIO(file_bytes),
                length=len(file_bytes),
                content_type=content_type,
            )
            uploaded += 1
        except S3Error as e:
            logger.error(f"Failed to upload file for '{title}' to MinIO: {e}")
            errors.append(f"MinIO upload failed for '{title}': {e}")
            continue
        except Exception as e:
            logger.error(f"Unexpected error uploading file for '{title}': {e}")
            errors.append(f"Upload error for '{title}': {e}")
            continue

        # Resolve tags
        resource_tags_list = []
        for tag_name in tag_names:
            tag = tags_by_name.get(tag_name)
            if tag:
                resource_tags_list.append(tag)
            else:
                logger.warning(f"Tag not found for '{title}': {tag_name}")

        # Determine public visibility (private resources for testing)
        is_public = not title.startswith("Private") and not title.startswith("Internal")

        resource = Resource(
            title=title,
            description=description,
            file_path=object_name,
            hierarchy=hierarchy,
            parent_id=parent_id,
            filename=title.replace(" ", "-").lower(),
            size=len(file_bytes),
            type=content_type,
            is_public=is_public,
            is_anonymous=False,
            uploader_id=owner.id,
            owner_id=owner.id,
            tags=resource_tags_list,
        )
        db.add(resource)
        existing_by_hierarchy[hierarchy] = resource
        created += 1
        logger.info(
            f"Created resource: {hierarchy} ({content_type}, public={is_public})"
        )

    if errors:
        logger.warning(
            f"{len(errors)} resources had errors (files not uploaded): {errors[:3]}..."
        )

    logger.info(f"Seeded {created} resources ({uploaded} files uploaded to MinIO)")


def generate_sample_file(filename: str, content_type: str) -> tuple[bytes, str]:
    """Generate sample file content programmatically.

    Returns:
        Tuple of (file_bytes, object_name_for_minio)
    """
    if content_type == "application/pdf":
        pdf_content = (
            b"%PDF-1.0\n"
            b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
            b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n"
            b"xref\n0 4\n"
            b"0000000000 65535 f \n"
            b"0000000009 00000 n \n"
            b"0000000058 00000 n \n"
            b"0000000115 00000 n \n"
            b"trailer<</Size 4/Root 1 0 R>>\n"
            b"startxref\n207\n%%EOF\n"
        )
        object_name = f"seeded/{uuid.uuid4().hex}/{filename}.pdf"
        return pdf_content, object_name

    elif content_type == "text/plain":
        text = (
            f"This is a sample file: {filename}\nGenerated by UniShelf seed script.\n"
        )
        object_name = f"seeded/{uuid.uuid4().hex}/{filename}.txt"
        return text.encode("utf-8"), object_name

    elif content_type == "text/markdown":
        md = f"# {filename}\n\nThis is a sample markdown file generated by the UniShelf seed script.\n"
        object_name = f"seeded/{uuid.uuid4().hex}/{filename}.md"
        return md.encode("utf-8"), object_name

    else:
        text = f"Sample content for {filename}\n"
        object_name = f"seeded/{uuid.uuid4().hex}/{filename}.bin"
        return text.encode("utf-8"), object_name


def main() -> None:
    """Entry point for the UniShelf database seeding script."""
    args = parse_args()
    logger.info("Starting UniShelf seed script" + (" (RESET)" if args.reset else ""))

    try:
        # Ensure tables exist
        Base.metadata.create_all(bind=engine)

        db = SessionLocal()
        try:
            if args.reset:
                reset_all(db)

            seed_users(db)
            seed_tags(db)
            seed_resources(db)

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
