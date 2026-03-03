from typing import Optional
from datetime import datetime
from pydantic import BaseModel

# 共享属性
class MemberBase(BaseModel):
    member_name: str
    position: str
    tech_stack: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

# 用于创建的属性
class MemberCreate(MemberBase):
    pass

# 用于更新的属性
class MemberUpdate(BaseModel):
    member_name: Optional[str] = None
    position: Optional[str] = None
    tech_stack: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

# 数据库响应模型
class Member(MemberBase):
    member_id: int
    create_time: datetime
    update_time: datetime

    class Config:
        from_attributes = True
