from collections.abc import Iterable

from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.member import ProjectMember
from app.models.project import ProjectBase, ProjectResource
from app.models.user import User


PLACEHOLDER_MEMBER_POSITION = "待补充"


def ensure_default_admin(db: Session) -> User:
    admin = db.query(User).filter(User.username == settings.DEFAULT_ADMIN_USERNAME).first()
    if admin:
        return admin

    admin = User(
        username=settings.DEFAULT_ADMIN_USERNAME,
        email=settings.DEFAULT_ADMIN_EMAIL,
        hashed_password=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
        is_active=True,
        is_superuser=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def _parse_member_names(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []

    unique_names: list[str] = []
    seen: set[str] = set()
    for name in raw_value.split(","):
        normalized = name.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        unique_names.append(normalized)
    return unique_names


def _join_member_names(members: Iterable[ProjectMember]) -> str | None:
    names = [member.member_name for member in members]
    if not names:
        return None
    return ", ".join(names)


def _get_or_create_member(
    db: Session,
    member_by_name: dict[str, ProjectMember],
    member_name: str,
) -> ProjectMember:
    member = member_by_name.get(member_name)
    if member:
        return member

    member = ProjectMember(member_name=member_name, position=PLACEHOLDER_MEMBER_POSITION)
    db.add(member)
    db.flush()
    member_by_name[member_name] = member
    return member


def sync_legacy_member_assignments(db: Session) -> bool:
    member_by_name = {
        member.member_name: member for member in db.query(ProjectMember).all()
    }
    changed = False

    projects = (
        db.query(ProjectBase)
        .options(selectinload(ProjectBase.project_leaders))
        .all()
    )
    for project in projects:
        if project.project_leaders:
            normalized = _join_member_names(project.project_leaders)
            if project.project_leader != normalized:
                project.project_leader = normalized
                changed = True
            continue

        legacy_names = _parse_member_names(project.project_leader)
        if not legacy_names:
            continue

        project.project_leaders = [
            _get_or_create_member(db, member_by_name, member_name)
            for member_name in legacy_names
        ]
        project.project_leader = _join_member_names(project.project_leaders)
        changed = True

    resources = (
        db.query(ProjectResource)
        .options(selectinload(ProjectResource.developers))
        .all()
    )
    for resource in resources:
        if resource.developers:
            normalized = _join_member_names(resource.developers)
            if resource.developer != normalized:
                resource.developer = normalized
                changed = True
            continue

        legacy_names = _parse_member_names(resource.developer)
        if not legacy_names:
            continue

        resource.developers = [
            _get_or_create_member(db, member_by_name, member_name)
            for member_name in legacy_names
        ]
        resource.developer = _join_member_names(resource.developers)
        changed = True

    if changed:
        db.commit()

    return changed


def bootstrap_database(db: Session) -> User:
    admin = ensure_default_admin(db)
    sync_legacy_member_assignments(db)
    return admin
