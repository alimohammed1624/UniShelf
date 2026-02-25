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
