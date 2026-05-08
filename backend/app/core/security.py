from datetime import datetime, timedelta
import re
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
PASSWORD_MIN_LENGTH = 6

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    """
    生成 JWT 访问令牌
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证明文密码与哈希值是否匹配
    """
    return pwd_context.verify(plain_password, hashed_password)

def validate_password_strength(password: str) -> str:
    """
    Validate password complexity for user-facing password operations.
    """
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(f"Password must be at least {PASSWORD_MIN_LENGTH} characters long")
    if not re.fullmatch(r"[A-Za-z0-9]+", password):
        raise ValueError("Password may only contain letters and numbers")
    if not re.search(r"[A-Za-z]", password):
        raise ValueError("Password must include at least one letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must include at least one number")
    return password

def get_password_hash(password: str) -> str:
    """
    获取密码的哈希值
    """
    return pwd_context.hash(password)
