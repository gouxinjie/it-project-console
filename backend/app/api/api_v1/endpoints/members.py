from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.models import member as member_model
from app.schemas import member as member_schema

router = APIRouter()

@router.get("/", response_model=List[member_schema.Member])
def read_members(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
) -> Any:
    """
    获取成员列表
    """
    query = db.query(member_model.ProjectMember)
    
    if search:
        query = query.filter(member_model.ProjectMember.member_name.contains(search))
        
    members = query.offset(skip).limit(limit).all()
    return members

@router.post("/", response_model=member_schema.Member)
def create_member(
    *,
    db: Session = Depends(deps.get_db),
    member_in: member_schema.MemberCreate,
) -> Any:
    """
    创建新成员
    """
    # 检查是否存在同名成员
    member = db.query(member_model.ProjectMember).filter(
        member_model.ProjectMember.member_name == member_in.member_name
    ).first()
    if member:
        raise HTTPException(status_code=400, detail="The member with this name already exists")
        
    db_obj = member_model.ProjectMember(
        member_name=member_in.member_name,
        position=member_in.position,
        tech_stack=member_in.tech_stack,
        phone=member_in.phone,
        email=member_in.email
    )
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
    """
    更新成员信息
    """
    member = db.query(member_model.ProjectMember).filter(
        member_model.ProjectMember.member_id == member_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
        
    update_data = member_in.model_dump(exclude_unset=True)
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
    """
    删除成员
    """
    member = db.query(member_model.ProjectMember).filter(
        member_model.ProjectMember.member_id == member_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
        
    db.delete(member)
    db.commit()
    return member
