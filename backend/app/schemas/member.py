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


class MemberLeadProjectSummary(BaseModel):
    project_id: int
    project_name: str
    project_type: str
    project_status: str
    business_unit: str
    update_time: datetime

    model_config = ConfigDict(from_attributes=True)


class MemberResourceProjectSummary(BaseModel):
    project_id: int
    project_name: str
    project_type: str
    project_status: str
    business_unit: str

    model_config = ConfigDict(from_attributes=True)


class MemberDevelopedResourceSummary(BaseModel):
    resource_id: int
    resource_type: str
    git_repo: Optional[str] = None
    tech_framework: Optional[str] = None
    deploy_branch: Optional[str] = None
    prod_domain: Optional[str] = None
    update_time: datetime
    project: Optional[MemberResourceProjectSummary] = None

    model_config = ConfigDict(from_attributes=True)


class MemberDetail(Member):
    lead_projects: list[MemberLeadProjectSummary] = Field(default_factory=list)
    developed_resources: list[MemberDevelopedResourceSummary] = Field(default_factory=list)


class MemberPage(BaseModel):
    items: list[Member] = Field(default_factory=list)
    total: int
    skip: int = 0
    limit: int
