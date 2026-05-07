from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.api import deps
from app.models import member as member_model
from app.models import project as project_model
from app.schemas import project as project_schema

router = APIRouter(dependencies=[Depends(deps.get_current_active_user)])


def _dedupe_ids(member_ids: list[int]) -> list[int]:
    return list(dict.fromkeys(member_ids))


def _member_names(members: list[member_model.ProjectMember]) -> str | None:
    if not members:
        return None
    return ", ".join(member.member_name for member in members)


def _load_members_by_ids(db: Session, member_ids: list[int]) -> list[member_model.ProjectMember]:
    unique_ids = _dedupe_ids(member_ids)
    if not unique_ids:
        return []

    members = (
        db.query(member_model.ProjectMember)
        .filter(member_model.ProjectMember.member_id.in_(unique_ids))
        .all()
    )
    member_map = {member.member_id: member for member in members}
    missing_ids = [member_id for member_id in unique_ids if member_id not in member_map]
    if missing_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Members not found: {missing_ids}",
        )

    return [member_map[member_id] for member_id in unique_ids]


def _sync_project_leaders(
    project: project_model.ProjectBase,
    leaders: list[member_model.ProjectMember],
) -> None:
    project.project_leaders = leaders
    project.project_leader = _member_names(leaders)


def _sync_resource_developers(
    resource: project_model.ProjectResource,
    developers: list[member_model.ProjectMember],
) -> None:
    resource.developers = developers
    resource.developer = _member_names(developers)


def _get_project_with_relations(db: Session, project_id: int) -> project_model.ProjectBase:
    project = (
        db.query(project_model.ProjectBase)
        .options(
            selectinload(project_model.ProjectBase.project_leaders),
            selectinload(project_model.ProjectBase.external_resources),
        )
        .filter(project_model.ProjectBase.project_id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_resource_with_relations(
    db: Session,
    project_id: int,
    resource_id: int,
) -> project_model.ProjectResource:
    resource = (
        db.query(project_model.ProjectResource)
        .options(selectinload(project_model.ProjectResource.developers))
        .filter(
            project_model.ProjectResource.project_id == project_id,
            project_model.ProjectResource.resource_id == resource_id,
        )
        .first()
    )
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource


@router.get("/", response_model=project_schema.ProjectPage)
def read_projects(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    project_type: Optional[str] = None,
    project_status: Optional[str] = None,
    business_unit: Optional[str] = None,
    business_type: Optional[str] = None,
    belong_system: Optional[str] = None,
    project_leader: Optional[str] = None,
    project_leader_id: Optional[int] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
) -> Any:
    query = db.query(project_model.ProjectBase)
    use_distinct = False

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
    if project_leader_id is not None:
        query = query.join(project_model.ProjectBase.project_leaders).filter(
            member_model.ProjectMember.member_id == project_leader_id
        )
        use_distinct = True
    elif project_leader:
        query = query.join(project_model.ProjectBase.project_leaders).filter(
            member_model.ProjectMember.member_name.contains(project_leader)
        )
        use_distinct = True
    if start_time:
        query = query.filter(project_model.ProjectBase.update_time >= start_time)
    if end_time:
        query = query.filter(project_model.ProjectBase.update_time <= end_time)

    if use_distinct:
        query = query.distinct()

    total = query.order_by(None).count()
    projects = (
        query.options(
            selectinload(project_model.ProjectBase.project_leaders),
            selectinload(project_model.ProjectBase.external_resources),
        )
        .order_by(
            project_model.ProjectBase.update_time.desc(),
            project_model.ProjectBase.project_id.desc(),
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    return project_schema.ProjectPage(items=projects, total=total, skip=skip, limit=limit)


@router.get("/{project_id}", response_model=project_schema.ProjectSummary)
def read_project(
    project_id: int,
    db: Session = Depends(deps.get_db),
) -> Any:
    return _get_project_with_relations(db, project_id)


@router.post("/", response_model=project_schema.ProjectSummary)
def create_project(
    *,
    db: Session = Depends(deps.get_db),
    project_in: project_schema.ProjectCreate,
) -> Any:
    existing_project = db.query(project_model.ProjectBase).filter(
        project_model.ProjectBase.project_name == project_in.project_name
    ).first()
    if existing_project:
        raise HTTPException(status_code=400, detail="Project name already exists")

    leaders = _load_members_by_ids(db, project_in.project_leader_ids)
    db_obj = project_model.ProjectBase(
        **project_in.model_dump(exclude={"project_leader_ids"})
    )
    _sync_project_leaders(db_obj, leaders)

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return _get_project_with_relations(db, db_obj.project_id)


@router.put("/{project_id}", response_model=project_schema.ProjectSummary)
def update_project(
    *,
    db: Session = Depends(deps.get_db),
    project_id: int,
    project_in: project_schema.ProjectUpdate,
) -> Any:
    project = db.query(project_model.ProjectBase).filter(
        project_model.ProjectBase.project_id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = project_in.model_dump(exclude_unset=True)
    if "project_name" in update_data:
        existing_project = db.query(project_model.ProjectBase).filter(
            project_model.ProjectBase.project_name == update_data["project_name"],
            project_model.ProjectBase.project_id != project_id,
        ).first()
        if existing_project:
            raise HTTPException(status_code=400, detail="Project name already exists")

    leader_ids = update_data.pop("project_leader_ids", None)
    for field, value in update_data.items():
        setattr(project, field, value)
    if leader_ids is not None:
        leaders = _load_members_by_ids(db, leader_ids)
        _sync_project_leaders(project, leaders)

    db.add(project)
    db.commit()
    db.refresh(project)
    return _get_project_with_relations(db, project_id)


@router.delete("/{project_id}")
def delete_project(
    *,
    db: Session = Depends(deps.get_db),
    project_id: int,
) -> Any:
    project = db.query(project_model.ProjectBase).filter(
        project_model.ProjectBase.project_id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    resource_count = db.query(project_model.ProjectResource).filter(
        project_model.ProjectResource.project_id == project_id
    ).count()
    external_count = db.query(project_model.ProjectExternalResource).filter(
        project_model.ProjectExternalResource.project_id == project_id
    ).count()
    if resource_count > 0 or external_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete project with existing resources")

    project.project_leaders = []
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}


@router.get("/{project_id}/resources", response_model=project_schema.ProjectResources)
def read_project_resources(
    project_id: int,
    db: Session = Depends(deps.get_db),
) -> Any:
    project = (
        db.query(project_model.ProjectBase)
        .options(
            selectinload(project_model.ProjectBase.resources).selectinload(
                project_model.ProjectResource.developers
            ),
            selectinload(project_model.ProjectBase.external_resources),
        )
        .filter(project_model.ProjectBase.project_id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project_schema.ProjectResources(
        resources=project.resources,
        external_resources=project.external_resources,
    )


@router.get("/{project_id}/resources/{resource_id}", response_model=project_schema.ProjectResource)
def read_project_resource(
    project_id: int,
    resource_id: int,
    db: Session = Depends(deps.get_db),
) -> Any:
    return _get_resource_with_relations(db, project_id, resource_id)


@router.post("/{project_id}/resources", response_model=project_schema.ProjectResource)
def create_project_resource(
    *,
    db: Session = Depends(deps.get_db),
    project_id: int,
    resource_in: project_schema.ProjectResourceCreate,
) -> Any:
    project = db.query(project_model.ProjectBase).filter(
        project_model.ProjectBase.project_id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing_resource = db.query(project_model.ProjectResource).filter(
        project_model.ProjectResource.project_id == project_id,
        project_model.ProjectResource.resource_type == resource_in.resource_type,
    ).first()
    if existing_resource:
        raise HTTPException(status_code=400, detail="Resource type already exists in this project")

    developers = _load_members_by_ids(db, resource_in.developer_ids)
    db_obj = project_model.ProjectResource(
        **resource_in.model_dump(exclude={"developer_ids"}),
        project_id=project_id,
    )
    _sync_resource_developers(db_obj, developers)

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return _get_resource_with_relations(db, project_id, db_obj.resource_id)


@router.put("/{project_id}/resources/{resource_id}", response_model=project_schema.ProjectResource)
def update_project_resource(
    *,
    db: Session = Depends(deps.get_db),
    project_id: int,
    resource_id: int,
    resource_in: project_schema.ProjectResourceUpdate,
) -> Any:
    resource = db.query(project_model.ProjectResource).filter(
        project_model.ProjectResource.project_id == project_id,
        project_model.ProjectResource.resource_id == resource_id,
    ).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    update_data = resource_in.model_dump(exclude_unset=True)
    new_resource_type = update_data.get("resource_type", resource.resource_type)
    existing_resource = db.query(project_model.ProjectResource).filter(
        project_model.ProjectResource.project_id == project_id,
        project_model.ProjectResource.resource_type == new_resource_type,
        project_model.ProjectResource.resource_id != resource_id,
    ).first()
    if existing_resource:
        raise HTTPException(status_code=400, detail="Resource type already exists in this project")

    developer_ids = update_data.pop("developer_ids", None)
    for field, value in update_data.items():
        setattr(resource, field, value)
    if developer_ids is not None:
        developers = _load_members_by_ids(db, developer_ids)
        _sync_resource_developers(resource, developers)

    db.add(resource)
    db.commit()
    db.refresh(resource)
    return _get_resource_with_relations(db, project_id, resource_id)


@router.delete("/resources/{resource_id}")
def delete_project_resource(
    *,
    db: Session = Depends(deps.get_db),
    resource_id: int,
) -> Any:
    resource = db.query(project_model.ProjectResource).filter(
        project_model.ProjectResource.resource_id == resource_id
    ).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    resource.developers = []
    db.delete(resource)
    db.commit()
    return {"message": "Resource deleted successfully"}


@router.get("/{project_id}/external-resources", response_model=project_schema.ProjectExternalResource)
def read_project_external_resources(
    project_id: int,
    db: Session = Depends(deps.get_db),
) -> Any:
    resource = db.query(project_model.ProjectExternalResource).filter(
        project_model.ProjectExternalResource.project_id == project_id
    ).first()

    if not resource:
        return project_schema.ProjectExternalResource(
            external_id=0,
            project_id=project_id,
            aliyun_oss=None,
            database_config=None,
            redis_config=None,
            middleware_config=None,
            other_config=None,
            create_time=datetime.utcnow(),
            update_time=datetime.utcnow(),
        )

    return resource


@router.put("/{project_id}/external-resources", response_model=project_schema.ProjectExternalResource)
def update_project_external_resources(
    *,
    db: Session = Depends(deps.get_db),
    project_id: int,
    resource_in: project_schema.ProjectExternalResourceUpdate,
) -> Any:
    project = db.query(project_model.ProjectBase).filter(
        project_model.ProjectBase.project_id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    resource = db.query(project_model.ProjectExternalResource).filter(
        project_model.ProjectExternalResource.project_id == project_id
    ).first()
    if not resource:
        db_obj = project_model.ProjectExternalResource(
            **resource_in.model_dump(),
            project_id=project_id,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

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
    resource = db.query(project_model.ProjectExternalResource).filter(
        project_model.ProjectExternalResource.project_id == project_id
    ).first()
    if resource:
        db.delete(resource)
        db.commit()

    return {"message": "External resources deleted successfully"}
