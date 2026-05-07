from sqlalchemy.orm import Session

from app.core.bootstrap import bootstrap_database
from app.db.session import SessionLocal
from app.models.member import ProjectMember
from app.models.project import (
    ProjectBase,
    ProjectExternalResource,
    ProjectResource,
    project_leader_assignment,
    project_resource_developer_assignment,
)


def seed_data() -> None:
    db: Session = SessionLocal()
    try:
        print("Cleaning existing seed data...")
        db.execute(project_resource_developer_assignment.delete())
        db.execute(project_leader_assignment.delete())
        db.query(ProjectExternalResource).delete()
        db.query(ProjectResource).delete()
        db.query(ProjectBase).delete()
        db.query(ProjectMember).delete()
        db.commit()

        print("Ensuring default administrator...")
        admin_user = bootstrap_database(db)
        print(f"Default administrator is ready: {admin_user.username}")

        print("Creating members...")
        members = [
            ProjectMember(
                member_name="张伟",
                position="高级前端开发工程师",
                tech_stack="React, TypeScript, Ant Design, Next.js",
                phone="13800138001",
                email="zhangwei@example.com",
            ),
            ProjectMember(
                member_name="李娜",
                position="资深后端开发工程师",
                tech_stack="FastAPI, Python, PostgreSQL, Redis",
                phone="13800138002",
                email="lina@example.com",
            ),
            ProjectMember(
                member_name="王强",
                position="全栈开发工程师",
                tech_stack="Vue, Spring Boot, MySQL, Docker",
                phone="13800138003",
                email="wangqiang@example.com",
            ),
            ProjectMember(
                member_name="赵敏",
                position="UI/UX 设计师",
                tech_stack="Figma, Adobe XD, Photoshop",
                phone="13800138004",
                email="zhaomin@example.com",
            ),
            ProjectMember(
                member_name="孙悟空",
                position="运维架构师",
                tech_stack="K8s, Jenkins, Aliyun, Terraform",
                phone="13800138005",
                email="wukong@example.com",
            ),
        ]
        db.add_all(members)
        db.flush()
        member_by_name = {member.member_name: member for member in members}

        print("Creating projects and resources...")
        p1 = ProjectBase(
            project_name="电商后台管理系统",
            project_type="web应用",
            project_status="开发中",
            project_desc="负责公司核心电商业务的后台数据管理、订单处理及报表分析。",
            project_leader="张伟, 李娜",
            project_leaders=[member_by_name["张伟"], member_by_name["李娜"]],
            tech_framework="React + FastAPI",
            business_unit="集团总部",
            business_type="运营",
            belong_system="中台系统",
            remarks="预计 Q2 完成一期迭代",
        )
        db.add(p1)
        db.flush()

        db.add_all(
            [
                ProjectResource(
                    project_id=p1.project_id,
                    resource_type="前端",
                    git_repo="https://github.com/example/mall-admin-web",
                    deploy_branch="develop",
                    deploy_method="Docker",
                    deploy_addr="192.168.1.10",
                    deploy_steps="1. npm install\n2. npm run build\n3. docker-compose up",
                    prod_domain="admin.mall.com",
                    uat_domain="uat-admin.mall.com",
                    developer="张伟",
                    developers=[member_by_name["张伟"]],
                    tech_framework="React 18 + TypeScript + Ant Design",
                    resource_remarks="Node 版本建议 16.x",
                ),
                ProjectResource(
                    project_id=p1.project_id,
                    resource_type="后端",
                    git_repo="https://github.com/example/mall-admin-api",
                    deploy_branch="main",
                    deploy_method="K8s",
                    deploy_addr="k8s-cluster-01",
                    prod_domain="api-admin.mall.com",
                    uat_domain="uat-api-admin.mall.com",
                    developer="李娜",
                    developers=[member_by_name["李娜"]],
                    tech_framework="FastAPI + Python 3.10 + PostgreSQL",
                ),
            ]
        )
        db.add(
            ProjectExternalResource(
                project_id=p1.project_id,
                database_config="RDS: rm-2ze6xxxx.mysql.rds.aliyuncs.com",
                aliyun_oss="OSS: mall-assets-bucket",
                redis_config="Host: r-2ze6xxxx.redis.rds.aliyuncs.com\nPort: 6379",
                middleware_config="RocketMQ: Topic-Order-Pay, Topic-Inventory-Update",
            )
        )

        p2 = ProjectBase(
            project_name="移动端客户小程序",
            project_type="小程序",
            project_status="已上线",
            project_desc="面向 C 端客户的在线下单小程序。",
            project_leader="王强",
            project_leaders=[member_by_name["王强"]],
            tech_framework="微信小程序原生 + Node.js",
            business_unit="投管",
            business_type="新需求",
            belong_system="营销系统",
        )
        db.add(p2)
        db.flush()
        db.add_all(
            [
                ProjectResource(
                    project_id=p2.project_id,
                    resource_type="前端",
                    git_repo="https://github.com/example/customer-mini-app-client",
                    deploy_branch="production",
                    deploy_method="云托管",
                    prod_domain="customer.example.com",
                    developer="王强",
                    developers=[member_by_name["王强"]],
                    tech_framework="微信小程序原生",
                ),
                ProjectResource(
                    project_id=p2.project_id,
                    resource_type="后端",
                    git_repo="https://github.com/example/customer-mini-app-server",
                    deploy_branch="production",
                    deploy_method="云托管",
                    prod_domain="api.customer.example.com",
                    developer="王强",
                    developers=[member_by_name["王强"]],
                    tech_framework="Node.js + Express",
                ),
            ]
        )

        p3 = ProjectBase(
            project_name="内部 OA 系统",
            project_type="web应用",
            project_status="已下线",
            project_desc="支持请假、审批、考勤等内部行政流程。",
            project_leader="李娜",
            project_leaders=[member_by_name["李娜"]],
            tech_framework="Vue + Spring Boot",
            business_unit="人力资源",
            business_type="运维",
            belong_system="办公系统",
            remarks="历史遗留系统，保持基本运行即可",
        )
        db.add(p3)
        db.flush()
        db.add_all(
            [
                ProjectResource(
                    project_id=p3.project_id,
                    resource_type="前端",
                    deploy_method="Jenkins",
                    deploy_addr="10.0.0.5",
                    developer="李娜",
                    developers=[member_by_name["李娜"]],
                    tech_framework="Vue 2",
                ),
                ProjectResource(
                    project_id=p3.project_id,
                    resource_type="后端",
                    deploy_method="Jenkins",
                    deploy_addr="10.0.0.5",
                    developer="李娜",
                    developers=[member_by_name["李娜"]],
                    tech_framework="Spring Boot + MySQL",
                ),
            ]
        )

        p4 = ProjectBase(
            project_name="物流追踪平台",
            project_type="钉钉微应用",
            project_status="开发中",
            project_desc="对接第三方物流 API，实时更新订单物流轨迹。",
            project_leader="赵敏, 孙悟空",
            project_leaders=[member_by_name["赵敏"], member_by_name["孙悟空"]],
            tech_framework="Flutter + Golang",
            business_unit="投融资",
            business_type="B端业务",
            belong_system="物流系统",
        )
        db.add(p4)
        db.flush()
        db.add(
            ProjectExternalResource(
                project_id=p4.project_id,
                aliyun_oss="OSS: proman-logs-bucket\nRegion: cn-shanghai",
                redis_config="Host: r-uf6xxxx.redis.rds.aliyuncs.com\nPort: 6379",
                middleware_config="RocketMQ: Topic-Logistics-Update",
            )
        )

        db.add(
            ProjectBase(
                project_name="财务报表生成器",
                project_type="低代码",
                project_status="待启动",
                project_desc="自动化生成月度财务分析报告及其图表。",
                tech_framework=None,
                business_unit="财务",
                business_type="报表分析",
                belong_system="财务系统",
                remarks="负责人待确认",
            )
        )

        db.commit()
        print("Seed data completed.")
    except Exception as exc:
        print(f"Seed data failed: {exc}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
