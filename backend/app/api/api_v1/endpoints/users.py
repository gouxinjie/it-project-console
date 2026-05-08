from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api import deps
from app.core.security import get_password_hash, verify_password
from app.models.user import User as UserModel
from app.schemas.user import (
    AdminPasswordReset,
    User,
    UserCreate,
    UserPage,
    UserPasswordUpdate,
    UserUpdate,
)

router = APIRouter()
admin_router = APIRouter(dependencies=[Depends(deps.get_current_active_superuser)])
self_router = APIRouter(dependencies=[Depends(deps.get_current_active_user)])


def _get_user_or_404(db: Session, user_id: int) -> UserModel:
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def _validate_unique_fields(
    db: Session,
    *,
    username: str | None = None,
    email: str | None = None,
    exclude_user_id: int | None = None,
) -> None:
    if username is not None:
        query = db.query(UserModel).filter(UserModel.username == username)
        if exclude_user_id is not None:
            query = query.filter(UserModel.id != exclude_user_id)
        if query.first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The username is already in use",
            )

    if email is not None:
        query = db.query(UserModel).filter(UserModel.email == email)
        if exclude_user_id is not None:
            query = query.filter(UserModel.id != exclude_user_id)
        if query.first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The email is already in use",
            )


def _active_superuser_count(db: Session) -> int:
    return (
        db.query(UserModel)
        .filter(
            UserModel.is_superuser.is_(True),
            UserModel.is_active.is_(True),
        )
        .count()
    )


def _ensure_superuser_safety(
    db: Session,
    *,
    user: UserModel,
    next_is_active: bool,
    next_is_superuser: bool,
) -> None:
    if not user.is_superuser or not user.is_active:
        return

    if next_is_active and next_is_superuser:
        return

    if _active_superuser_count(db) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one active administrator must remain",
        )


@self_router.put("/me/password")
def update_my_password(
    *,
    db: Session = Depends(deps.get_db),
    password_in: UserPasswordUpdate,
    current_user: UserModel = Depends(deps.get_current_active_user),
) -> dict[str, str]:
    if not verify_password(password_in.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.hashed_password = get_password_hash(password_in.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Password updated successfully"}


@admin_router.get("/", response_model=UserPage)
def read_users(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    search: str | None = None,
    is_active: bool | None = None,
) -> Any:
    query = db.query(UserModel)

    if search:
        normalized_search = search.strip()
        if normalized_search:
            query = query.filter(
                or_(
                    UserModel.username.contains(normalized_search),
                    UserModel.email.contains(normalized_search),
                )
            )

    if is_active is not None:
        query = query.filter(UserModel.is_active.is_(is_active))

    total = query.order_by(None).count()
    users = (
        query.order_by(UserModel.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return UserPage(items=users, total=total, skip=skip, limit=limit)


@admin_router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    _validate_unique_fields(
        db,
        username=user_in.username,
        email=user_in.email,
    )

    user = UserModel(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        is_active=user_in.is_active,
        is_superuser=user_in.is_superuser,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@admin_router.put("/{user_id}", response_model=User)
def update_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    user = _get_user_or_404(db, user_id)
    update_data = user_in.model_dump(exclude_unset=True)

    if user.id == current_user.id and {"is_active", "is_superuser"} & update_data.keys():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use another administrator to change your own role or status",
        )

    if "email" in update_data:
        _validate_unique_fields(
            db,
            email=update_data["email"],
            exclude_user_id=user_id,
        )

    next_is_active = update_data.get("is_active", user.is_active)
    next_is_superuser = update_data.get("is_superuser", user.is_superuser)
    _ensure_superuser_safety(
        db,
        user=user,
        next_is_active=next_is_active,
        next_is_superuser=next_is_superuser,
    )

    for field, value in update_data.items():
        setattr(user, field, value)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@admin_router.put("/{user_id}/password")
def reset_user_password(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    password_in: AdminPasswordReset,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> dict[str, str]:
    user = _get_user_or_404(db, user_id)
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use the personal password change flow for your own account",
        )

    user.hashed_password = get_password_hash(password_in.new_password)
    db.add(user)
    db.commit()
    return {"message": "Password reset successfully"}


@admin_router.delete("/{user_id}")
def delete_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> dict[str, str]:
    user = _get_user_or_404(db, user_id)
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    _ensure_superuser_safety(
        db,
        user=user,
        next_is_active=False,
        next_is_superuser=False,
    )

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


router.include_router(self_router)
router.include_router(admin_router)
