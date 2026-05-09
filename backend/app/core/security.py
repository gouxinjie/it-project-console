from datetime import datetime, timedelta
import re
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

# 密码哈希上下文，使用 bcrypt 算法
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT 签名算法
ALGORITHM = "HS256"
# 密码最小长度限制
PASSWORD_MIN_LENGTH = 6

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    """
    生成 JWT 访问令牌
    :param subject: 令牌主题（通常是用户 ID）
    :param expires_delta: 有效期时长
    :return: 加密后的 JWT 字符串
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
    验证明文密码与数据库存储的哈希值是否匹配
    """
    return pwd_context.verify(plain_password, hashed_password)

def validate_password_strength(password: str) -> str:
    """
    验证密码强度
    要求：最小长度 6 位，仅限字母数字，必须同时包含字母和数字
    """
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(f"密码长度至少为 {PASSWORD_MIN_LENGTH} 位")
    if not re.fullmatch(r"[A-Za-z0-9]+", password):
        raise ValueError("密码只能包含字母和数字")
    if not re.search(r"[A-Za-z]", password):
        raise ValueError("密码必须包含至少一个字母")
    if not re.search(r"\d", password):
        raise ValueError("密码必须包含至少一个数字")
    return password

def get_password_hash(password: str) -> str:
    """
    使用 bcrypt 对密码进行哈希加密
    """
    return pwd_context.hash(password)
