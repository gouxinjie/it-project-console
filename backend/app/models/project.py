from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base_class import Base

class ProjectBase(Base):
    """
    项目基本信息表 (project_base)
    """
    __tablename__ = "project_base"

    project_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_name = Column(String(100), unique=True, nullable=False, index=True)
    project_type = Column(String(20), nullable=False, index=True)
    project_status = Column(String(20), nullable=False)
    project_desc = Column(Text, nullable=True)
    project_leader = Column(String(200), nullable=True, index=True)  # 存储姓名，逗号分隔
    tech_framework = Column(String(200), nullable=True)
    update_time = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    business_unit = Column(String(50), nullable=False)
    business_type = Column(String(20), nullable=False)
    belong_system = Column(String(50), nullable=False)
    remarks = Column(Text, nullable=True)

    # 关联子资源
    resources = relationship("ProjectResource", back_populates="project", cascade="all, delete-orphan")
    external_resources = relationship("ProjectExternalResource", back_populates="project", uselist=False, cascade="all, delete-orphan")

    @property
    def has_external_resources(self):
        return self.external_resources is not None

class ProjectResource(Base):
    """
    项目资源信息表 (project_resource)
    """
    __tablename__ = "project_resource"

    resource_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("project_base.project_id"), nullable=False, index=True)
    resource_type = Column(String(20), nullable=False, index=True)  # 前端、后端
    git_repo = Column(String(200), nullable=True)
    deploy_branch = Column(String(50), nullable=True)
    deploy_method = Column(String(20), nullable=True)
    deploy_addr = Column(String(100), nullable=True)
    deploy_steps = Column(Text, nullable=True)
    prod_domain = Column(String(100), nullable=True)
    uat_domain = Column(String(100), nullable=True)
    developer = Column(String(200), nullable=True)
    tech_framework = Column(String(200), nullable=True)  # 技术框架
    resource_remarks = Column(Text, nullable=True)
    special_note = Column(Text, nullable=True)
    update_time = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    project = relationship("ProjectBase", back_populates="resources")

class ProjectExternalResource(Base):
    """
    外部资源表 (project_external_resource)
    """
    __tablename__ = "project_external_resource"

    external_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("project_base.project_id"), nullable=False, index=True)
    
    # 具体的外部资源字段
    aliyun_oss = Column(Text, nullable=True)      # 阿里云OSS配置
    database_config = Column(Text, nullable=True) # 数据库配置
    redis_config = Column(Text, nullable=True)    # Redis配置
    middleware_config = Column(Text, nullable=True) # 其他中间件配置
    other_config = Column(Text, nullable=True)    # 其他配置
    
    create_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    update_time = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    project = relationship("ProjectBase", back_populates="external_resources")
