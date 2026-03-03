from datetime import datetime
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.project import ProjectBase, ProjectResource, ProjectExternalResource
from app.models.member import ProjectMember
from app.models.user import User
from app.core.security import get_password_hash

def seed_data():
    db: Session = SessionLocal()
    try:
        # 1. 清理旧数据 (可选, 如果您想重新开始)
        print("清理旧数据...")
        db.query(ProjectExternalResource).delete()
        db.query(ProjectResource).delete()
        db.query(ProjectBase).delete()
        db.query(ProjectMember).delete()
        
        # 仅当不存在 admin 用户时才清理用户表 (或者你可以选择清理)
        # db.query(User).delete() 
        
        db.commit()

        # 1.5 创建默认管理员用户
        print("创建默认管理员用户...")
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                email="admin@proman.com",
                hashed_password=get_password_hash("admin123!@#"),
                is_active=True,
                is_superuser=True
            )
            db.add(admin_user)
            db.commit()
            print("默认管理员已创建: admin / admin123!@#")
        else:
            print("默认管理员已存在")

        # 2. 创建成员数据
        print("创建模拟成员数据...")
        members = [
            ProjectMember(
                member_name="张伟",
                position="高级前端开发工程师",
                tech_stack="React, TypeScript, Ant Design, Next.js",
                phone="13800138001",
                email="zhangwei@example.com"
            ),
            ProjectMember(
                member_name="李娜",
                position="资深后端开发工程师",
                tech_stack="FastAPI, Python, PostgreSQL, Redis",
                phone="13800138002",
                email="lina@example.com"
            ),
            ProjectMember(
                member_name="王强",
                position="全栈开发工程师",
                tech_stack="Vue, Spring Boot, MySQL, Docker",
                phone="13800138003",
                email="wangqiang@example.com"
            ),
            ProjectMember(
                member_name="赵敏",
                position="UI/UX 设计师",
                tech_stack="Figma, Adobe XD, Photoshop",
                phone="13800138004",
                email="zhaomin@example.com"
            ),
            ProjectMember(
                member_name="孙悟空",
                position="运维架构师",
                tech_stack="K8s, Jenkins, Aliyun, Terraform",
                phone="13800138005",
                email="wukong@example.com"
            )
        ]
        db.add_all(members)
        db.commit()

        # 3. 创建项目数据
        print("创建模拟项目数据...")
        
        # 项目 1: 电商后台管理系统 (开发中)
        p1 = ProjectBase(
            project_name="电商后台管理系统",
            project_type="web应用",
            project_status="开发中",
            project_desc="负责公司核心电商业务的后台数据管理、订单处理及报表分析。",
            project_leader="张伟, 李娜",
            tech_framework="React + FastAPI",
            business_unit="集团总部",
            business_type="运营",
            belong_system="中台系统",
            remarks="预计 Q2 完成一期迭代"
        )
        db.add(p1)
        db.flush() # 获取 project_id

        # 项目 1 资源
        r1_1 = ProjectResource(
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
            tech_framework="React 18 + TypeScript + Ant Design",
            resource_remarks="Node版本建议16.x"
        )
        r1_2 = ProjectResource(
            project_id=p1.project_id,
            resource_type="后端",
            git_repo="https://github.com/example/mall-admin-api",
            deploy_branch="main",
            deploy_method="K8s",
            deploy_addr="k8s-cluster-01",
            prod_domain="api-admin.mall.com",
            uat_domain="uat-api-admin.mall.com",
            developer="李娜",
            tech_framework="FastAPI + Python 3.10 + PostgreSQL"
        )
        db.add_all([r1_1, r1_2])
        
        # 项目 1 外部资源
        ex1 = ProjectExternalResource(
            project_id=p1.project_id,
            database_config="RDS: rm-2ze6xxxx.mysql.rds.aliyuncs.com",
            aliyun_oss="OSS: mall-assets-bucket",
            redis_config="Host: r-2ze6xxxx.redis.rds.aliyuncs.com\nPort: 6379",
            middleware_config="RocketMQ: Topic-Order-Pay, Topic-Inventory-Update"
        )
        db.add(ex1)

        # 项目 2: 移动端客户小程序 (已上线)
        p2 = ProjectBase(
            project_name="移动端客户小程序",
            project_type="小程序",
            project_status="已上线",
            project_desc="面向 C 端客户的在线下单小程序。",
            project_leader="王强",
            tech_framework="微信小程序原生 + Node.js",
            business_unit="投管",
            business_type="新需求",
            belong_system="营销系统"
        )
        db.add(p2)
        db.flush()

        r2_1 = ProjectResource(
            project_id=p2.project_id,
            resource_type="前端",
            git_repo="https://github.com/example/customer-mini-app-client",
            deploy_branch="production",
            deploy_method="云托管",
            prod_domain="customer.example.com",
            developer="王强",
            tech_framework="微信小程序原生"
        )
        r2_2 = ProjectResource(
            project_id=p2.project_id,
            resource_type="后端",
            git_repo="https://github.com/example/customer-mini-app-server",
            deploy_branch="production",
            deploy_method="云托管",
            prod_domain="api.customer.example.com",
            developer="王强",
            tech_framework="Node.js + Express"
        )
        db.add_all([r2_1, r2_2])

        # 项目 3: 内部 OA 系统 (已下线)
        p3 = ProjectBase(
            project_name="内部 OA 系统",
            project_type="web应用",
            project_status="已下线",
            project_desc="支持请假、审批、考勤等内部行政流程。",
            project_leader="李娜",
            tech_framework="Vue + Spring Boot",
            business_unit="人力资源",
            business_type="运维",
            belong_system="办公系统",
            remarks="历史遗留系统，保持基本运行即可"
        )
        db.add(p3)
        db.flush()

        r3_1 = ProjectResource(
            project_id=p3.project_id,
            resource_type="前端",
            deploy_method="Jenkins",
            deploy_addr="10.0.0.5",
            developer="李娜",
            tech_framework="Vue 2"
        )
        r3_2 = ProjectResource(
            project_id=p3.project_id,
            resource_type="后端",
            deploy_method="Jenkins",
            deploy_addr="10.0.0.5",
            developer="李娜",
            tech_framework="Spring Boot + MySQL"
        )
        db.add_all([r3_1, r3_2])

        # 项目 4: 物流追踪平台 (开发中)
        p4 = ProjectBase(
            project_name="物流追踪平台",
            project_type="钉钉微应用",
            project_status="开发中",
            project_desc="对接第三方物流 API，实时更新订单物流轨迹。",
            project_leader="赵敏, 孙悟空",
            tech_framework="Flutter + Golang",
            business_unit="投融资",
            business_type="B端业务",
            belong_system="物流系统"
        )
        db.add(p4)
        db.flush()
        
        # 为项目 4 添加外部资源
        ex4 = ProjectExternalResource(
            project_id=p4.project_id,
            aliyun_oss="OSS: proman-logs-bucket\nRegion: cn-shanghai",
            redis_config="Host: r-uf6xxxx.redis.rds.aliyuncs.com\nPort: 6379",
            middleware_config="RocketMQ: Topic-Logistics-Update"
        )
        db.add(ex4)

        # 项目 5: 财务报表生成器 (待启动)
        p5 = ProjectBase(
            project_name="财务报表生成器",
            project_type="低代码",
            project_status="待启动",
            project_desc="自动化生成月度财务分析报告及其图表。",
            project_leader="不明",
            business_unit="财务",
            business_type="报表分析",
            belong_system="财务系统"
        )
        db.add(p5)

        db.commit()
        print("模拟数据填充完成！")

    except Exception as e:
        print(f"填充数据失败: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
