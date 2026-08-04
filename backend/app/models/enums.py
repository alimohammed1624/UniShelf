"""
Integer enums for type-safe database columns.
Values are stored as integers in the DB, validated in Python.
"""

from enum import IntEnum


class UserRole(IntEnum):
    STUDENT = 0
    MODERATOR = 1
    ADMIN = 2
    SUPERADMIN = 3


class AccessType(IntEnum):
    WHITELIST = 0
    BLACKLIST = 1


class ReportStatus(IntEnum):
    OPEN = 0
    RESOLVED = 1


class ArchiveKind(IntEnum):
    """
    Why a resource was archived. Drives who may reverse it: SELF archives are
    the owner's own housekeeping and the owner may restore them; MODERATION
    archives are takedowns and only a moderator+ may lift them.

    Stored explicitly rather than inferred from `archived_by_id` so the policy
    survives ownership transfer and admins archiving on an owner's behalf.
    """
    SELF = 0
    MODERATION = 1
