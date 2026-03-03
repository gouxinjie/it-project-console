from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, field_validator

# 共享属性
class ProjectBase(BaseModel):
    project_name: str
    project_type: str
    project_status: str
    project_desc: Optional[str] = None
    project_leader: Optional[str] = None
    tech_framework: Optional[str] = None
    business_unit: str

    @field_validator('business_unit')
    @classmethod
    def validate_business_unit(cls, v: str) -> str:
        valid_units = ['集团总部', '董事办', '风控', '投管', '财务', '人力资源', '投融资']
        if v not in valid_units:
            raise ValueError(f"business_unit must be one of {valid_units}")
        return v

    business_type: str
    belong_system: str
    remarks: Optional[str] = None

# 用于创建的属性
class ProjectCreate(ProjectBase):
    pass

# 用于更新的属性
class ProjectUpdate(ProjectBase):
    project_name: Optional[str] = None
    project_type: Optional[str] = None
    project_status: Optional[str] = None

# 开发/资源子表模型
class ProjectResourceBase(BaseModel):
    resource_type: str

    @field_validator('resource_type')
    @classmethod
    def validate_resource_type(cls, v: str) -> str:
        if v not in ['前端', '后端']:
            raise ValueError('resource_type must be either 前端 or 后端')
        return v

    git_repo: Optional[str] = None
    deploy_branch: Optional[str] = None
    deploy_method: Optional[str] = None
    deploy_addr: Optional[str] = None
    deploy_steps: Optional[str] = None
    prod_domain: Optional[str] = None
    uat_domain: Optional[str] = None
    developer: Optional[str] = None
    tech_framework: Optional[str] = None
    resource_remarks: Optional[str] = None
    special_note: Optional[str] = None
    
class ProjectResource(ProjectResourceBase):
    resource_id: int
    project_id: int
    update_time: datetime

    class Config:
        from_attributes = True

# 外部资源属性
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

    class Config:
        from_attributes = True

# 数据库中存储的属性 (响应模型)
class ProjectSummary(ProjectBase):
    project_id: int
    update_time: datetime
    has_external_resources: bool = False

    class Config:
        from_attributes = True

class ProjectResources(BaseModel):
    resources: List[ProjectResource] = []
    external_resources: Optional[ProjectExternalResource] = None

    class Config:
        from_attributes = True

# 保持 Project 模型兼容
class Project(ProjectSummary):
    resources: List[ProjectResource] = []
    external_resources: Optional[ProjectExternalResource] = None
