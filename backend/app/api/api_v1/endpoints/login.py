from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User as UserModel
from app.schemas.user import AuthSettings, User as UserSchema, UserRegister

router = APIRouter()


def _get_user_by_username(db: Session, username: str) -> UserModel | None:
    return db.query(UserModel).filter(UserModel.username == username).first()


def _get_user_by_email(db: Session, email: str) -> UserModel | None:
    return db.query(UserModel).filter(UserModel.email == email).first()


def _validate_user_uniqueness(
    db: Session,
    *,
    username: str,
    email: str,
) -> None:
    if _get_user_by_username(db, username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The username is already registered",
        )

    if _get_user_by_email(db, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The email is already registered",
        )


@router.get("/login/settings", response_model=AuthSettings)
def read_auth_settings() -> AuthSettings:
    return AuthSettings(
        allow_public_registration=settings.ALLOW_PUBLIC_REGISTRATION,
    )


@router.post("/login/access-token")
def login_access_token(
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    user = _get_user_by_username(db, form_data.username.strip())
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    user.last_login = datetime.utcnow()
    db.commit()

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id,
            expires_delta=access_token_expires,
        ),
        "token_type": "bearer",
    }


@router.post("/login/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def register_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserRegister,
):
    if not settings.ALLOW_PUBLIC_REGISTRATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public registration is disabled",
        )

    _validate_user_uniqueness(
        db,
        username=user_in.username,
        email=user_in.email,
    )

    user = UserModel(
        username=user_in.username,
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        is_active=True,
        is_superuser=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/login/me", response_model=UserSchema)
def read_current_user(
    current_user: UserModel = Depends(deps.get_current_active_user),
):
    return current_user
