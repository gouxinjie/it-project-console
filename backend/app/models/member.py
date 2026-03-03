from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from app.db.base_class import Base

class ProjectMember(Base):
    """
    项目成员表 (project_member)
    """
    __tablename__ = "project_member"

    member_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    member_name = Column(String(50), unique=True, nullable=False, index=True)
    position = Column(String(100), nullable=False, index=True)
    tech_stack = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    create_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    update_time = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
