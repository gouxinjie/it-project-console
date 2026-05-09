from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.api_v1.api import api_router
from app.core.bootstrap import bootstrap_database
from app.core.config import settings
from app.db.base_class import Base
from app.db.session import SessionLocal, engine
from app.models.member import ProjectMember
from app.models.project import ProjectBase, ProjectExternalResource, ProjectResource
from app.models.user import User

# 允许访问的本地地址，用于绕过 HTTPS 强制检查
LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1", "testserver"}


@asynccontextmanager
async def lifespan(_: FastAPI):
    """
    FastAPI 应用生命周期管理
    在应用启动时自动创建数据库表并执行基础数据初始化
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        bootstrap_database(db)
    finally:
        db.close()
    yield


# 初始化 FastAPI 实例
app = FastAPI(
    title="Enterprise IT Project Management API",
    description="企业 IT 项目管理平台后端接口文档。",
    version="1.0.0",
    docs_url="/docs",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# 配置 CORS 跨域中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _is_local_request(request: Request) -> bool:
    """检查是否为本地请求"""
    return request.url.hostname in LOCAL_HOSTS


def _is_secure_request(request: Request) -> bool:
    """检查请求是否安全（通过 HTTPS 或受信任的反向代理）"""
    if request.url.scheme == "https":
        return True

    if not settings.TRUST_X_FORWARDED_PROTO:
        return False

    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    primary_forwarded_proto = forwarded_proto.split(",")[0].strip().lower()
    return primary_forwarded_proto == "https"


@app.middleware("http")
async def enforce_https(request: Request, call_next):
    """
    强制 HTTPS 中间件
    在生产环境下要求所有非本地请求必须使用 HTTPS
    """
    if not settings.SECURE_TRANSPORT_REQUIRED or _is_local_request(request):
        return await call_next(request)

    if _is_secure_request(request):
        return await call_next(request)

    return JSONResponse(
        status_code=400,
        content={"detail": "HTTPS is required"},
    )


# 注册业务路由
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {"message": "Welcome to Enterprise IT Project Management API"}
