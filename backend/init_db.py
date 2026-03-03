from app.db.session import engine
from app.db.base_class import Base
# 导入所有模型以便 Base.metadata 能够找到它们
from app.models.project import ProjectBase, ProjectResource, ProjectExternalResource
from app.models.member import ProjectMember
from app.models.user import User


def init_db():
    print("正在创建数据库表...")
    Base.metadata.create_all(bind=engine)
    print("数据库表创建成功！")

if __name__ == "__main__":
    init_db()
