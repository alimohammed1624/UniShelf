import re
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional, Callable
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.models import User
from app.models.enums import UserRole
from app.database import get_db
from .schemas import TokenData
from app.config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

# Compiled regex: must be a valid email at a .edu domain
EDU_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu$", re.IGNORECASE)

# Shell- and URL-safe punctuation for generated passwords
_TEMP_PASSWORD_SYMBOLS = "!@#$%^&*-_=+"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def generate_temp_password(length: int = 16) -> str:
    """
    Cryptographically-random password containing at least one lowercase,
    uppercase, digit and symbol. Length is clamped to the 8..128 range
    accepted by UserCreate so the recipient can change it via PUT /users/me.
    """
    length = max(8, min(length, 128))
    alphabets = [
        string.ascii_lowercase,
        string.ascii_uppercase,
        string.digits,
        _TEMP_PASSWORD_SYMBOLS,
    ]
    chars = [secrets.choice(a) for a in alphabets]
    pool = "".join(alphabets)
    chars += [secrets.choice(pool) for _ in range(length - len(chars))]
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def clear_expired_ban(user: User, db: Session) -> None:
    """
    Lift a temporary ban whose `banned_until` has passed. No-op otherwise.

    There is no scheduler in this stack, so temp bans expire lazily — this is
    called on every authenticated request, at login, and (in bulk) by the
    admin user listing.
    """
    if user.banned_until is None:
        return
    if user.banned_until > datetime.now(timezone.utc):
        return

    user.is_active = True
    user.banned_until = None
    user.ban_reason = None
    user.banned_at = None
    user.banned_by_id = None
    db.commit()
    db.refresh(user)


def assert_can_manage(actor: User, target: User) -> None:
    """
    Raise unless `actor` may perform a management action (ban, restore,
    password reset) on `target`.

    Any strictly-lower role is allowed, so a superadmin can reach a student
    directly when they need to. The dashboards deliberately present a narrower
    chain of command (see `canManageAccount` in frontend/lib/roles.ts) — that
    is a presentation choice, not this boundary.
    """
    if actor.id == target.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot perform this action on yourself",
        )
    if target.role >= actor.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot act on a user with equal or higher role",
        )


def assert_can_change_role(actor: User, target: User, new_role: int, db: Session) -> None:
    """
    Raise unless `actor` may set `target` to `new_role`.

    Superadmins are untouchable by their peers: the equal-or-higher rule means
    only roles strictly below the actor can be modified. An actor may grant any
    role up to and including their own, so a superadmin can promote to
    superadmin but can never demote one.
    """
    assert_can_manage(actor, target)

    if not 0 <= new_role <= actor.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot grant a role higher than your own",
        )

    # Defensive: unreachable while the equal-or-higher rule above holds, but
    # keeps the invariant if that rule is ever relaxed.
    if target.role == int(UserRole.SUPERADMIN) and new_role < int(UserRole.SUPERADMIN):
        remaining = (
            db.query(User)
            .filter(
                User.role == int(UserRole.SUPERADMIN),
                User.id != target.id,
                User.is_active.is_(True),
            )
            .count()
        )
        if remaining == 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot demote the last remaining superadmin",
            )


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        role: int = payload.get("role")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email, user_id=user_id, role=role)
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception

    # Check if user is banned (lifting the ban first if it has expired)
    clear_expired_ban(user, db)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended",
        )

    return user


def require_role(min_role: UserRole) -> Callable:
    """
    Dependency factory that returns a FastAPI dependency checking
    that the current user's role is >= min_role.

    Usage:
        @router.post("/admin-only", dependencies=[Depends(require_role(UserRole.ADMIN))])
        def admin_endpoint(...): ...

    Or inject directly:
        current_user: User = Depends(require_role(UserRole.ADMIN))
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role < int(min_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return role_checker
