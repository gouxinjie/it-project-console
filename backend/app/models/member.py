from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class ProjectMember(Base):
    __tablename__ = "project_member"

    member_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    member_name = Column(String(50), unique=True, nullable=False, index=True)
    position = Column(String(100), nullable=False, index=True)
    tech_stack = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    create_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    update_time = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    lead_projects = relationship(
        "ProjectBase",
        secondary="project_leader_assignment",
        back_populates="project_leaders",
    )
    developed_resources = relationship(
        "ProjectResource",
        secondary="project_resource_developer_assignment",
        back_populates="developers",
    )
