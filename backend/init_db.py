from app.core.bootstrap import bootstrap_database
from app.db.base_class import Base
from app.db.session import SessionLocal, engine
from app.models.member import ProjectMember
from app.models.project import ProjectBase, ProjectExternalResource, ProjectResource
from app.models.user import User


def init_db() -> None:
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables are ready.")

    db = SessionLocal()
    try:
        admin = bootstrap_database(db)
        print(f"Default administrator is ready: {admin.username}")
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
