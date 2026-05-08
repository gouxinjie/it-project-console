from fastapi import APIRouter

from app.api.api_v1.endpoints import login, members, projects, users

api_router = APIRouter()

# 包含各个模块的路由
api_router.include_router(login.router, tags=["login"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(members.router, prefix="/members", tags=["members"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
