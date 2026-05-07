from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.api import deps
from app.models import member as member_model
from app.models import project as project_model
from app.schemas import project as project_schema

router = APIRouter(dependencies=[Depends(deps.get_current_active_user)])

EXTERNAL_RESOURCE_SECTION_CONFIG: dict[str, dict[str, Any]] = {
    "aliyun_oss": {
        "notes_attr": "aliyun_oss_notes",
        "items_attr": "aliyun_oss_items",
        "item_model": project_model.ProjectExternalOssItem,
        "fields": (
            "name",
            "bucket_name",
            "endpoint",
            "region",
            "environment",
            "access_path",
            "notes",
        ),
    },
    "database_config": {
        "notes_attr": "database_config_notes",
        "items_attr": "database_config_items",
        "item_model": project_model.ProjectExternalDatabaseItem,
        "fields": (
            "name",
            "engine",
            "host",
            "port",
            "database_name",
            "account_name",
            "environment",
            "notes",
        ),
    },
    "redis_config": {
        "notes_attr": "redis_config_notes",
        "items_attr": "redis_config_items",
        "item_model": project_model.ProjectExternalRedisItem,
        "fields": (
            "name",
            "host",
            "port",
            "database_index",
            "environment",
            "notes",
        ),
    },
    "middleware_config": {
        "notes_attr": "middleware_config_notes",
        "items_attr": "middleware_config_items",
        "item_model": project_model.ProjectExternalMiddlewareItem,
        "fields": (
            "name",
            "middleware_type",
            "endpoint",
            "environment",
            "notes",
        ),
    },
    "other_config": {
        "notes_attr": "other_config_notes",
        "items_attr": "other_config_items",
        "item_model": project_model.ProjectExternalOtherItem,
        "fields": (
            "name",
            "config_summary",
            "environment",
            "notes",
        ),
    },
}


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


def _ensure_project_exists(db: Session, project_id: int) -> None:
    exists = (
        db.query(project_model.ProjectBase.project_id)
        .filter(project_model.ProjectBase.project_id == project_id)
        .first()
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Project not found")


def _project_external_resource_loads() -> tuple[Any, ...]:
    return (
        selectinload(project_model.ProjectBase.external_resources).selectinload(
            project_model.ProjectExternalResource.aliyun_oss_items
        ),
        selectinload(project_model.ProjectBase.external_resources).selectinload(
            project_model.ProjectExternalResource.database_config_items
        ),
        selectinload(project_model.ProjectBase.external_resources).selectinload(
            project_model.ProjectExternalResource.redis_config_items
        ),
        selectinload(project_model.ProjectBase.external_resources).selectinload(
            project_model.ProjectExternalResource.middleware_config_items
        ),
        selectinload(project_model.ProjectBase.external_resources).selectinload(
            project_model.ProjectExternalResource.other_config_items
        ),
    )


def _external_resource_loads() -> tuple[Any, ...]:
    return (
        selectinload(project_model.ProjectExternalResource.aliyun_oss_items),
        selectinload(project_model.ProjectExternalResource.database_config_items),
        selectinload(project_model.ProjectExternalResource.redis_config_items),
        selectinload(project_model.ProjectExternalResource.middleware_config_items),
        selectinload(project_model.ProjectExternalResource.other_config_items),
    )


def _get_external_resource(
    db: Session,
    project_id: int,
) -> project_model.ProjectExternalResource | None:
    return (
        db.query(project_model.ProjectExternalResource)
        .options(*_external_resource_loads())
        .filter(project_model.ProjectExternalResource.project_id == project_id)
        .first()
    )


def _clean_text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip()
    return normalized or None


def _normalize_external_section(section: Any) -> dict[str, Any]:
    normalized_items: list[dict[str, Any]] = []
    for item in getattr(section, "items", []):
        cleaned_item: dict[str, Any] = {}
        for key, value in item.model_dump(exclude_none=True).items():
            if isinstance(value, str):
                cleaned_value = value.strip()
                if cleaned_value:
                    cleaned_item[key] = cleaned_value
                continue
            if value is not None:
                cleaned_item[key] = value
        if cleaned_item:
            normalized_items.append(cleaned_item)

    return {
        "items": normalized_items,
        "notes": _clean_text(getattr(section, "notes", None)) or "",
    }


def _normalize_external_resource_payload(
    resource_in: project_schema.ProjectExternalResourceBase,
) -> dict[str, dict[str, Any]]:
    return {
        section_key: _normalize_external_section(getattr(resource_in, section_key))
        for section_key in EXTERNAL_RESOURCE_SECTION_CONFIG
    }


def _has_external_resource_content(normalized_sections: dict[str, dict[str, Any]]) -> bool:
    return any(
        section["items"] or section["notes"]
        for section in normalized_sections.values()
    )


def _apply_external_resource_payload(
    resource: project_model.ProjectExternalResource,
    normalized_sections: dict[str, dict[str, Any]],
) -> None:
    for section_key, config in EXTERNAL_RESOURCE_SECTION_CONFIG.items():
        normalized_section = normalized_sections[section_key]
        setattr(resource, config["notes_attr"], normalized_section["notes"] or None)
        setattr(
            resource,
            config["items_attr"],
            [
                config["item_model"](sort_order=index, **item_data)
                for index, item_data in enumerate(normalized_section["items"], start=1)
            ],
        )


def _empty_external_resource_payload(project_id: int) -> dict[str, Any]:
    now = datetime.utcnow()
    return {
        "external_id": 0,
        "project_id": project_id,
        "aliyun_oss": {"items": [], "notes": ""},
        "database_config": {"items": [], "notes": ""},
        "redis_config": {"items": [], "notes": ""},
        "middleware_config": {"items": [], "notes": ""},
        "other_config": {"items": [], "notes": ""},
        "create_time": now,
        "update_time": now,
    }


def _serialize_external_resource(
    resource: project_model.ProjectExternalResource | None,
    project_id: int,
) -> dict[str, Any]:
    if not resource:
        return _empty_external_resource_payload(project_id)

    payload: dict[str, Any] = {
        "external_id": resource.external_id,
        "project_id": resource.project_id,
        "create_time": resource.create_time,
        "update_time": resource.update_time,
    }

    for section_key, config in EXTERNAL_RESOURCE_SECTION_CONFIG.items():
        items: list[dict[str, Any]] = []
        for item in getattr(resource, config["items_attr"]):
            item_payload: dict[str, Any] = {}
            for field in config["fields"]:
                value = getattr(item, field)
                if isinstance(value, str):
                    value = value.strip()
                if value:
                    item_payload[field] = value
            items.append(item_payload)
        payload[section_key] = {
            "items": items,
            "notes": getattr(resource, config["notes_attr"]) or "",
        }

    return payload


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
            *_project_external_resource_loads(),
        )
        .filter(project_model.ProjectBase.project_id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project_schema.ProjectResources(
        resources=project.resources,
        external_resources=(
            _serialize_external_resource(project.external_resources, project.project_id)
            if project.external_resources
            else None
        ),
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
    _ensure_project_exists(db, project_id)
    resource = _get_external_resource(db, project_id)
    return _serialize_external_resource(resource, project_id)


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

    normalized_sections = _normalize_external_resource_payload(resource_in)
    resource = _get_external_resource(db, project_id)
    if not _has_external_resource_content(normalized_sections):
        if resource:
            db.delete(resource)
            db.commit()
        return _empty_external_resource_payload(project_id)

    if not resource:
        resource = project_model.ProjectExternalResource(project_id=project_id)

    _apply_external_resource_payload(resource, normalized_sections)

    db.add(resource)
    db.commit()
    return _serialize_external_resource(_get_external_resource(db, project_id), project_id)


@router.delete("/{project_id}/external-resources")
def delete_project_external_resources(
    *,
    db: Session = Depends(deps.get_db),
    project_id: int,
) -> Any:
    _ensure_project_exists(db, project_id)
    resource = _get_external_resource(db, project_id)
    if resource:
        db.delete(resource)
        db.commit()

    return {"message": "External resources deleted successfully"}
