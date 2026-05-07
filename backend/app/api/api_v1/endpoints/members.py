from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api import deps
from app.models import member as member_model
from app.schemas import member as member_schema

router = APIRouter(dependencies=[Depends(deps.get_current_active_user)])


@router.get("/", response_model=member_schema.MemberPage)
def read_members(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    search: Optional[str] = None,
) -> Any:
    query = db.query(member_model.ProjectMember)

    if search:
        query = query.filter(member_model.ProjectMember.member_name.contains(search))

    total = query.order_by(None).count()
    members = (
        query.order_by(member_model.ProjectMember.member_id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return member_schema.MemberPage(items=members, total=total, skip=skip, limit=limit)


@router.post("/", response_model=member_schema.Member)
def create_member(
    *,
    db: Session = Depends(deps.get_db),
    member_in: member_schema.MemberCreate,
) -> Any:
    member = db.query(member_model.ProjectMember).filter(
        member_model.ProjectMember.member_name == member_in.member_name
    ).first()
    if member:
        raise HTTPException(status_code=400, detail="The member with this name already exists")

    db_obj = member_model.ProjectMember(**member_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.put("/{member_id}", response_model=member_schema.Member)
def update_member(
    *,
    db: Session = Depends(deps.get_db),
    member_id: int,
    member_in: member_schema.MemberUpdate,
) -> Any:
    member = db.query(member_model.ProjectMember).filter(
        member_model.ProjectMember.member_id == member_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    update_data = member_in.model_dump(exclude_unset=True)
    if "member_name" in update_data:
        existing_member = db.query(member_model.ProjectMember).filter(
            member_model.ProjectMember.member_name == update_data["member_name"],
            member_model.ProjectMember.member_id != member_id,
        ).first()
        if existing_member:
            raise HTTPException(status_code=400, detail="The member with this name already exists")

    for field, value in update_data.items():
        setattr(member, field, value)

    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{member_id}", response_model=member_schema.Member)
def delete_member(
    *,
    db: Session = Depends(deps.get_db),
    member_id: int,
) -> Any:
    member = db.query(member_model.ProjectMember).filter(
        member_model.ProjectMember.member_id == member_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if member.lead_projects or member.developed_resources:
        raise HTTPException(
            status_code=400,
            detail="Member is still assigned to projects or resources",
        )

    db.delete(member)
    db.commit()
    return member
