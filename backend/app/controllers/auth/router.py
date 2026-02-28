import re
import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models import User
from app.models.enums import UserRole
from app.database import get_db
from .schemas import UserCreate, UserSchema, Token
from .helpers import (
    get_password_hash,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.utils.metrics import AUTH_ATTEMPTS

logger = logging.getLogger(__name__)

# Compiled regex: must be a valid email at a .edu domain
_EDU_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu$", re.IGNORECASE)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Validate .edu email with proper regex
    if not _EDU_EMAIL_RE.match(user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must use a valid university email address (.edu)",
        )

    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email.lower().strip(),
        hashed_password=hashed_password,
        full_name=user.full_name.strip(),
        role=int(UserRole.STUDENT),
        is_active=True,
    )
    db.add(db_user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        AUTH_ATTEMPTS.labels(method="register", status="failure").inc()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    db.refresh(db_user)
    AUTH_ATTEMPTS.labels(method="register", status="success").inc()
    return db_user


@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username.lower().strip()).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        AUTH_ATTEMPTS.labels(method="login", status="failure").inc()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is banned
    if not user.is_active:
        AUTH_ATTEMPTS.labels(method="login", status="failure").inc()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "role": user.role,
        },
        expires_delta=access_token_expires,
    )
    AUTH_ATTEMPTS.labels(method="login", status="success").inc()
    return {"access_token": access_token, "token_type": "bearer"}
