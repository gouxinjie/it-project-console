from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.security import validate_password_strength


class UserIdentityBase(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Username cannot be empty")
        return normalized

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return value.lower()


class UserRoleBase(BaseModel):
    is_active: bool = True
    is_superuser: bool = False


class UserRegister(UserIdentityBase):
    password: str = Field(min_length=6, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)


class UserCreate(UserRegister, UserRoleBase):
    pass


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr | None) -> str | None:
        if value is None:
            return None
        return value.lower()


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)


class AdminPasswordReset(BaseModel):
    new_password: str = Field(min_length=6, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)


class AuthSettings(BaseModel):
    allow_public_registration: bool


class User(UserIdentityBase, UserRoleBase):
    id: int
    create_time: datetime
    last_login: datetime | None = None

    class Config:
        from_attributes = True


class UserPage(BaseModel):
    items: list[User]
    total: int
    skip: int
    limit: int
