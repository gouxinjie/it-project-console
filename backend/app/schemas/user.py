from typing import Optional
from pydantic import BaseModel, EmailStr

# 共享属性
class UserBase(BaseModel):
    username: str
    email: EmailStr
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False

# 创建时需要的属性
class UserCreate(UserBase):
    password: str

# 更新时需要的属性
class UserUpdate(BaseModel):
    password: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None

# 数据库响应模型
class User(UserBase):
    id: int

    class Config:
        from_attributes = True
