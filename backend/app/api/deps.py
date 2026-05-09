from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.core.security import ALGORITHM
from app.db.session import SessionLocal
from app.models.user import User

def get_db() -> Generator:
    """
    数据库会话生成器
    用于 FastAPI 的依赖注入，确保每个请求结束后会话都能正确关闭
    """
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


# OAuth2 密码模式配置，指定获取令牌的 URL
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/login/access-token")


def get_current_user(
    db=Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    """
    获取当前登录用户
    1. 从令牌中解析用户 ID 或用户名
    2. 在数据库中查询对应用户
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="登录状态已失效，请重新登录",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # 解码 JWT 令牌
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        subject = payload.get("sub")
        if not subject:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc

    user = None
    subject_text = str(subject)
    # 支持通过 ID (数字) 或 用户名 (字符串) 查询
    if subject_text.isdigit():
        user = db.query(User).filter(User.id == int(subject_text)).first()
    else:
        user = db.query(User).filter(User.username == subject_text).first()

    if user is None:
        raise credentials_exception
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """验证用户是否处于激活状态"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="该账户已被禁用")
    return current_user


def get_current_active_superuser(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """验证用户是否具有管理员权限"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限才能执行此操作",
        )
    return current_user
