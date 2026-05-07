from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api_v1.api import api_router
from app.core.bootstrap import bootstrap_database
from app.core.config import settings
from app.db.base_class import Base
from app.db.session import SessionLocal, engine
from app.models.member import ProjectMember
from app.models.project import ProjectBase, ProjectExternalResource, ProjectResource
from app.models.user import User


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        bootstrap_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Enterprise IT Project Management API",
    description="企业 IT 项目管理平台后端接口文档。",
    version="1.0.0",
    docs_url="/docs",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {"message": "Welcome to Enterprise IT Project Management API"}
