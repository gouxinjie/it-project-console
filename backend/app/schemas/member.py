from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class MemberBase(BaseModel):
    member_name: str
    position: str
    tech_stack: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class MemberCreate(MemberBase):
    pass


class MemberUpdate(BaseModel):
    member_name: Optional[str] = None
    position: Optional[str] = None
    tech_stack: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class MemberBrief(BaseModel):
    member_id: int
    member_name: str
    position: str

    model_config = ConfigDict(from_attributes=True)


class Member(MemberBase):
    member_id: int
    create_time: datetime
    update_time: datetime

    model_config = ConfigDict(from_attributes=True)


class MemberPage(BaseModel):
    items: list[Member] = Field(default_factory=list)
    total: int
    skip: int = 0
    limit: int
