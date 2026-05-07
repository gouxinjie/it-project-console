from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import relationship

from app.db.base_class import Base


project_leader_assignment = Table(
    "project_leader_assignment",
    Base.metadata,
    Column("project_id", Integer, ForeignKey("project_base.project_id", ondelete="CASCADE"), primary_key=True),
    Column("member_id", Integer, ForeignKey("project_member.member_id", ondelete="CASCADE"), primary_key=True),
)


project_resource_developer_assignment = Table(
    "project_resource_developer_assignment",
    Base.metadata,
    Column("resource_id", Integer, ForeignKey("project_resource.resource_id", ondelete="CASCADE"), primary_key=True),
    Column("member_id", Integer, ForeignKey("project_member.member_id", ondelete="CASCADE"), primary_key=True),
)


class ProjectBase(Base):
    __tablename__ = "project_base"

    project_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_name = Column(String(100), unique=True, nullable=False, index=True)
    project_type = Column(String(20), nullable=False, index=True)
    project_status = Column(String(20), nullable=False)
    project_desc = Column(Text, nullable=True)
    # Legacy mirror for older databases and scripts. New writes use relation tables.
    project_leader = Column(String(200), nullable=True, index=True)
    tech_framework = Column(String(200), nullable=True)
    update_time = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    business_unit = Column(String(50), nullable=False)
    business_type = Column(String(20), nullable=False)
    belong_system = Column(String(50), nullable=False)
    remarks = Column(Text, nullable=True)

    resources = relationship("ProjectResource", back_populates="project", cascade="all, delete-orphan")
    external_resources = relationship(
        "ProjectExternalResource",
        back_populates="project",
        uselist=False,
        cascade="all, delete-orphan",
    )
    project_leaders = relationship(
        "ProjectMember",
        secondary=project_leader_assignment,
        back_populates="lead_projects",
    )

    @property
    def has_external_resources(self) -> bool:
        return self.external_resources is not None

    @property
    def project_leader_ids(self) -> list[int]:
        return [member.member_id for member in self.project_leaders]


class ProjectResource(Base):
    __tablename__ = "project_resource"

    resource_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("project_base.project_id"), nullable=False, index=True)
    resource_type = Column(String(20), nullable=False, index=True)
    git_repo = Column(String(200), nullable=True)
    deploy_branch = Column(String(50), nullable=True)
    deploy_method = Column(String(20), nullable=True)
    deploy_addr = Column(String(100), nullable=True)
    deploy_steps = Column(Text, nullable=True)
    prod_domain = Column(String(100), nullable=True)
    uat_domain = Column(String(100), nullable=True)
    # Legacy mirror for older databases and scripts. New writes use relation tables.
    developer = Column(String(200), nullable=True)
    tech_framework = Column(String(200), nullable=True)
    resource_remarks = Column(Text, nullable=True)
    special_note = Column(Text, nullable=True)
    update_time = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    project = relationship("ProjectBase", back_populates="resources")
    developers = relationship(
        "ProjectMember",
        secondary=project_resource_developer_assignment,
        back_populates="developed_resources",
    )

    @property
    def developer_ids(self) -> list[int]:
        return [member.member_id for member in self.developers]


class ProjectExternalResource(Base):
    __tablename__ = "project_external_resource"

    external_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("project_base.project_id"), nullable=False, index=True)
    aliyun_oss = Column(Text, nullable=True)
    database_config = Column(Text, nullable=True)
    redis_config = Column(Text, nullable=True)
    middleware_config = Column(Text, nullable=True)
    other_config = Column(Text, nullable=True)
    create_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    update_time = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    project = relationship("ProjectBase", back_populates="external_resources")
