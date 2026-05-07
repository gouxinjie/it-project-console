from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.constants import (
    BUSINESS_TYPES,
    BUSINESS_UNITS,
    PROJECT_STATUSES,
    PROJECT_TYPES,
    RESOURCE_TYPES,
)
from app.schemas.member import MemberBrief


def _validate_choice(value: Optional[str], choices: tuple[str, ...], field_name: str) -> Optional[str]:
    if value is None:
        return value
    if value not in choices:
        raise ValueError(f"{field_name} must be one of {list(choices)}")
    return value


class ProjectFields(BaseModel):
    project_name: str
    project_type: str
    project_status: str
    project_desc: Optional[str] = None
    tech_framework: Optional[str] = None
    business_unit: str
    business_type: str
    belong_system: str
    remarks: Optional[str] = None

    @field_validator("project_type")
    @classmethod
    def validate_project_type(cls, value: str) -> str:
        return _validate_choice(value, PROJECT_TYPES, "project_type")

    @field_validator("project_status")
    @classmethod
    def validate_project_status(cls, value: str) -> str:
        return _validate_choice(value, PROJECT_STATUSES, "project_status")

    @field_validator("business_unit")
    @classmethod
    def validate_business_unit(cls, value: str) -> str:
        return _validate_choice(value, BUSINESS_UNITS, "business_unit")

    @field_validator("business_type")
    @classmethod
    def validate_business_type(cls, value: str) -> str:
        return _validate_choice(value, BUSINESS_TYPES, "business_type")


class ProjectCreate(ProjectFields):
    project_leader_ids: list[int] = Field(default_factory=list)


class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    project_type: Optional[str] = None
    project_status: Optional[str] = None
    project_desc: Optional[str] = None
    tech_framework: Optional[str] = None
    business_unit: Optional[str] = None
    business_type: Optional[str] = None
    belong_system: Optional[str] = None
    remarks: Optional[str] = None
    project_leader_ids: Optional[list[int]] = None

    @field_validator("project_type")
    @classmethod
    def validate_project_type(cls, value: Optional[str]) -> Optional[str]:
        return _validate_choice(value, PROJECT_TYPES, "project_type")

    @field_validator("project_status")
    @classmethod
    def validate_project_status(cls, value: Optional[str]) -> Optional[str]:
        return _validate_choice(value, PROJECT_STATUSES, "project_status")

    @field_validator("business_unit")
    @classmethod
    def validate_business_unit(cls, value: Optional[str]) -> Optional[str]:
        return _validate_choice(value, BUSINESS_UNITS, "business_unit")

    @field_validator("business_type")
    @classmethod
    def validate_business_type(cls, value: Optional[str]) -> Optional[str]:
        return _validate_choice(value, BUSINESS_TYPES, "business_type")


class ProjectResourceFields(BaseModel):
    resource_type: str
    git_repo: Optional[str] = None
    deploy_branch: Optional[str] = None
    deploy_method: Optional[str] = None
    deploy_addr: Optional[str] = None
    deploy_steps: Optional[str] = None
    prod_domain: Optional[str] = None
    uat_domain: Optional[str] = None
    tech_framework: Optional[str] = None
    resource_remarks: Optional[str] = None
    special_note: Optional[str] = None

    @field_validator("resource_type")
    @classmethod
    def validate_resource_type(cls, value: str) -> str:
        return _validate_choice(value, RESOURCE_TYPES, "resource_type")


class ProjectResourceCreate(ProjectResourceFields):
    developer_ids: list[int] = Field(default_factory=list)


class ProjectResourceUpdate(BaseModel):
    resource_type: Optional[str] = None
    git_repo: Optional[str] = None
    deploy_branch: Optional[str] = None
    deploy_method: Optional[str] = None
    deploy_addr: Optional[str] = None
    deploy_steps: Optional[str] = None
    prod_domain: Optional[str] = None
    uat_domain: Optional[str] = None
    tech_framework: Optional[str] = None
    resource_remarks: Optional[str] = None
    special_note: Optional[str] = None
    developer_ids: Optional[list[int]] = None

    @field_validator("resource_type")
    @classmethod
    def validate_resource_type(cls, value: Optional[str]) -> Optional[str]:
        return _validate_choice(value, RESOURCE_TYPES, "resource_type")


class ProjectResource(ProjectResourceFields):
    resource_id: int
    project_id: int
    update_time: datetime
    developers: list[MemberBrief] = Field(default_factory=list)
    developer_ids: list[int] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ProjectExternalResourceBase(BaseModel):
    aliyun_oss: Optional[str] = None
    database_config: Optional[str] = None
    redis_config: Optional[str] = None
    middleware_config: Optional[str] = None
    other_config: Optional[str] = None


class ProjectExternalResourceCreate(ProjectExternalResourceBase):
    pass


class ProjectExternalResourceUpdate(ProjectExternalResourceBase):
    pass


class ProjectExternalResource(ProjectExternalResourceBase):
    external_id: int
    project_id: int
    create_time: datetime
    update_time: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectSummary(ProjectFields):
    project_id: int
    update_time: datetime
    has_external_resources: bool = False
    project_leaders: list[MemberBrief] = Field(default_factory=list)
    project_leader_ids: list[int] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ProjectPage(BaseModel):
    items: list[ProjectSummary] = Field(default_factory=list)
    total: int
    skip: int = 0
    limit: int


class ProjectResources(BaseModel):
    resources: list[ProjectResource] = Field(default_factory=list)
    external_resources: Optional[ProjectExternalResource] = None

    model_config = ConfigDict(from_attributes=True)


class Project(ProjectSummary):
    resources: list[ProjectResource] = Field(default_factory=list)
    external_resources: Optional[ProjectExternalResource] = None
