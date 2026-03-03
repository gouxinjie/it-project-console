from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.models import project as project_model
from app.schemas import project as project_schema

router = APIRouter()

# ==================== 项目相关 API ====================

@router.get("/", response_model=List[project_schema.ProjectSummary])
def read_projects(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    project_type: Optional[str] = None,
    project_status: Optional[str] = None,
    business_unit: Optional[str] = None,
    business_type: Optional[str] = None,
    belong_system: Optional[str] = None,
    project_leader: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
) -> Any:
    """
    获取项目列表（不包含子资源）
    """
    query = db.query(project_model.ProjectBase)

    if project_type:
        query = query.filter(project_model.ProjectBase.project_type == project_type)
    if project_status:
        query = query.filter(project_model.ProjectBase.project_status == project_status)
    if business_unit:
        query = query.filter(project_model.ProjectBase.business_unit == business_unit)
    if business_type:
        query = query.filter(project_model.ProjectBase.business_type == business_type)
    if belong_system:
        query = query.filter(project_model.ProjectBase.belong_system.contains(belong_system))
    if project_leader:
        query = query.filter(project_model.ProjectBase.project_leader.contains(project_leader))
    if start_time:
        query = query.filter(project_model.ProjectBase.update_time >= start_time)
    if end_time:
        query = query.filter(project_model.ProjectBase.update_time <= end_time)

    projects = query.offset(skip).limit(limit).all()
    return projects

@router.get("/{project_id}", response_model=project_schema.ProjectSummary)
def read_project(
    project_id: int,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    获取单个项目详情
    """
    project = db.query(project_model.ProjectBase).filter(
        project_model.ProjectBase.project_id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.post("/", response_model=project_schema.ProjectSummary)
def create_project(
    *,
    db: Session = Depends(deps.get_db),
    project_in: project_schema.ProjectCreate,
) -> Any:
    """
    创建新项目
    """
    db_obj = project_model.ProjectBase(**project_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.put("/{project_id}", response_model=project_schema.ProjectSummary)
def update_project(
    *,
    db: Session = Depends(deps.get_db),
    project_id: int,
    project_in: project_schema.ProjectUpdate,
) -> Any:
    """
    更新项目信息
    """
    project = db.query(project_model.ProjectBase).filter(
        project_model.ProjectBase.project_id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}")
def delete_project(
    *,
    db: Session = Depends(deps.get_db),
    project_id: int,
) -> Any:
    """
    删除项目（需要先删除所有子资源）
    """
    project = db.query(project_model.ProjectBase).filter(
        project_model.ProjectBase.project_id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 检查是否有子资源
    resource_count = db.query(project_model.ProjectResource).filter(
        project_model.ProjectResource.project_id == project_id
    ).count()
    external_count = db.query(project_model.ProjectExternalResource).filter(
        project_model.ProjectExternalResource.project_id == project_id
    ).count()

    if resource_count > 0 or external_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete project with existing resources")
    
    db.delete(project)
    db.commit()
    return project

# ==================== 项目子资源相关 API ====================

@router.get("/{project_id}/resources", response_model=project_schema.ProjectResources)
def read_project_resources(
    project_id: int,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    获取项目的所有子资源（包括开发资源和外部资源）
    """
    project = db.query(project_model.ProjectBase).filter(
        project_model.ProjectBase.project_id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 手动构建响应对象
    external_resource = db.query(project_model.ProjectExternalResource).filter(
        project_model.ProjectExternalResource.project_id == project_id
    ).first()

    return project_schema.ProjectResources(
        resources=project.resources,
        external_resources=external_resource
    )

@router.get("/{project_id}/resources/{resource_id}", response_model=project_schema.ProjectResource)
def read_project_resource(
    project_id: int,
    resource_id: int,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    获取单个开发资源详情
    """
    resource = db.query(project_model.ProjectResource).filter(
        project_model.ProjectResource.project_id == project_id,
        project_model.ProjectResource.resource_id == resource_id
    ).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource

@router.post("/{project_id}/resources", response_model=project_schema.ProjectResource)
def create_project_resource(
    *,
    db: Session = Depends(deps.get_db),
    project_id: int,
    resource_in: project_schema.ProjectResourceBase,
) -> Any:
    """
    创建开发资源
    """
    project = db.query(project_model.ProjectBase).filter(
        project_model.ProjectBase.project_id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    db_obj = project_model.ProjectResource(**resource_in.model_dump(), project_id=project_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.put("/{project_id}/resources/{resource_id}", response_model=project_schema.ProjectResource)
def update_project_resource(
    *,
    db: Session = Depends(deps.get_db),
    project_id: int,
    resource_id: int,
    resource_in: project_schema.ProjectResourceBase,
) -> Any:
    """
    更新开发资源
    """
    resource = db.query(project_model.ProjectResource).filter(
        project_model.ProjectResource.project_id == project_id,
        project_model.ProjectResource.resource_id == resource_id
    ).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    update_data = resource_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(resource, field, value)
        
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource

@router.delete("/resources/{resource_id}")
def delete_project_resource(
    *,
    db: Session = Depends(deps.get_db),
    resource_id: int,
) -> Any:
    """
    删除开发资源
    """
    resource = db.query(project_model.ProjectResource).filter(
        project_model.ProjectResource.resource_id == resource_id
    ).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    db.delete(resource)
    db.commit()
    return {"message": "Resource deleted successfully"}

# ==================== 外部资源相关 API ====================

@router.get("/{project_id}/external-resources", response_model=project_schema.ProjectExternalResource)
def read_project_external_resources(
    project_id: int,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    获取项目的所有外部资源配置（合并为一个对象返回）
    """
    resource = db.query(project_model.ProjectExternalResource).filter(
        project_model.ProjectExternalResource.project_id == project_id
    ).first()
    
    if not resource:
        # 如果不存在，返回空对象（前端处理为新建）
        # 或者直接创建一个空的并返回
        return project_schema.ProjectExternalResource(
            external_id=0,
            project_id=project_id,
            aliyun_oss=None,
            database_config=None,
            redis_config=None,
            middleware_config=None,
            other_config=None,
            create_time=datetime.utcnow(),
            update_time=datetime.utcnow()
        )
        
    return resource

@router.put("/{project_id}/external-resources", response_model=project_schema.ProjectExternalResource)
def update_project_external_resources(
    *,
    db: Session = Depends(deps.get_db),
    project_id: int,
    resource_in: project_schema.ProjectExternalResourceUpdate,
) -> Any:
    """
    更新项目的外部资源配置（创建或更新）
    """
    project = db.query(project_model.ProjectBase).filter(
        project_model.ProjectBase.project_id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    resource = db.query(project_model.ProjectExternalResource).filter(
        project_model.ProjectExternalResource.project_id == project_id
    ).first()
    
    if not resource:
        # 创建新记录
        db_obj = project_model.ProjectExternalResource(**resource_in.model_dump(), project_id=project_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    else:
        # 更新现有记录
        update_data = resource_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(resource, field, value)
            
        db.add(resource)
        db.commit()
        db.refresh(resource)
        return resource

@router.delete("/{project_id}/external-resources")
def delete_project_external_resources(
    *,
    db: Session = Depends(deps.get_db),
    project_id: int,
) -> Any:
    """
    删除项目的所有外部资源配置
    """
    resource = db.query(project_model.ProjectExternalResource).filter(
        project_model.ProjectExternalResource.project_id == project_id
    ).first()
    
    if resource:
        db.delete(resource)
        db.commit()
        
    return {"message": "External Resources deleted successfully"}

