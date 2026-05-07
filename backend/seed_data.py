from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.bootstrap import bootstrap_database
from app.db.session import SessionLocal
from app.models.member import ProjectMember
from app.models.project import (
    ProjectBase,
    ProjectExternalDatabaseItem,
    ProjectExternalMiddlewareItem,
    ProjectExternalOssItem,
    ProjectExternalOtherItem,
    ProjectExternalRedisItem,
    ProjectExternalResource,
    ProjectResource,
    project_leader_assignment,
    project_resource_developer_assignment,
)


EXTERNAL_SECTION_CONFIG = {
    "aliyun_oss": (
        "aliyun_oss_notes",
        "aliyun_oss_items",
        ProjectExternalOssItem,
    ),
    "database_config": (
        "database_config_notes",
        "database_config_items",
        ProjectExternalDatabaseItem,
    ),
    "redis_config": (
        "redis_config_notes",
        "redis_config_items",
        ProjectExternalRedisItem,
    ),
    "middleware_config": (
        "middleware_config_notes",
        "middleware_config_items",
        ProjectExternalMiddlewareItem,
    ),
    "other_config": (
        "other_config_notes",
        "other_config_items",
        ProjectExternalOtherItem,
    ),
}


def _days_ago(days: int) -> datetime:
    return datetime.utcnow() - timedelta(days=days)


def _create_project_resource(
    *,
    project_id: int,
    member_by_name: dict[str, ProjectMember],
    resource_type: str,
    developers: list[str],
    update_time: datetime,
    git_repo: str | None = None,
    deploy_branch: str | None = None,
    deploy_method: str | None = None,
    deploy_addr: str | None = None,
    deploy_steps: str | None = None,
    prod_domain: str | None = None,
    uat_domain: str | None = None,
    tech_framework: str | None = None,
    resource_remarks: str | None = None,
    special_note: str | None = None,
) -> ProjectResource:
    resolved_developers = [member_by_name[name] for name in developers]
    return ProjectResource(
        project_id=project_id,
        resource_type=resource_type,
        git_repo=git_repo,
        deploy_branch=deploy_branch,
        deploy_method=deploy_method,
        deploy_addr=deploy_addr,
        deploy_steps=deploy_steps,
        prod_domain=prod_domain,
        uat_domain=uat_domain,
        developer=", ".join(developers),
        developers=resolved_developers,
        tech_framework=tech_framework,
        resource_remarks=resource_remarks,
        special_note=special_note,
        update_time=update_time,
    )


def _create_external_resource(
    project_id: int,
    sections: dict[str, dict[str, object]],
) -> ProjectExternalResource:
    resource = ProjectExternalResource(project_id=project_id)

    for section_key, (notes_attr, items_attr, item_model) in EXTERNAL_SECTION_CONFIG.items():
        section = sections.get(section_key) or {}
        notes = str(section.get("notes") or "").strip()
        if notes:
            setattr(resource, notes_attr, notes)

        raw_items = section.get("items") or []
        items = [
            item_model(sort_order=index, **item_payload)
            for index, item_payload in enumerate(raw_items, start=1)
        ]
        setattr(resource, items_attr, items)

    return resource


def seed_data() -> None:
    db: Session = SessionLocal()
    try:
        print("Cleaning existing seed data...")
        db.execute(project_resource_developer_assignment.delete())
        db.execute(project_leader_assignment.delete())
        db.query(ProjectExternalOssItem).delete()
        db.query(ProjectExternalDatabaseItem).delete()
        db.query(ProjectExternalRedisItem).delete()
        db.query(ProjectExternalMiddlewareItem).delete()
        db.query(ProjectExternalOtherItem).delete()
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
                tech_stack="React, TypeScript, Ant Design, Vite",
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
                tech_stack="Vue, Node.js, Spring Boot, MySQL",
                phone="13800138003",
                email="wangqiang@example.com",
            ),
            ProjectMember(
                member_name="赵敏",
                position="产品设计经理",
                tech_stack="Figma, Axure, Design System",
                phone="13800138004",
                email="zhaomin@example.com",
            ),
            ProjectMember(
                member_name="孙悟空",
                position="运维架构师",
                tech_stack="Kubernetes, Jenkins, Aliyun, Terraform",
                phone="13800138005",
                email="wukong@example.com",
            ),
            ProjectMember(
                member_name="陈晨",
                position="项目经理",
                tech_stack="Scrum, Jira, Milestone Planning",
                phone="13800138006",
                email="chenchen@example.com",
            ),
            ProjectMember(
                member_name="刘洋",
                position="测试工程师",
                tech_stack="Playwright, Pytest, Postman",
                phone="13800138007",
                email="liuyang@example.com",
            ),
            ProjectMember(
                member_name="周倩",
                position="数据库管理员",
                tech_stack="MySQL, PostgreSQL, SQL Tuning",
                phone="13800138008",
                email="zhouqian@example.com",
            ),
            ProjectMember(
                member_name="吴迪",
                position="数据平台工程师",
                tech_stack="Spark, Airflow, Elasticsearch",
                phone="13800138009",
                email="wudi@example.com",
            ),
            ProjectMember(
                member_name="郑洁",
                position="业务产品经理",
                tech_stack="BPM, Process Design, PRD",
                phone="13800138010",
                email="zhengjie@example.com",
            ),
        ]
        db.add_all(members)
        db.flush()
        member_by_name = {member.member_name: member for member in members}

        project_specs = [
            {
                "project_name": "电商运营中台",
                "project_type": "web应用",
                "project_status": "已上线",
                "project_desc": "承接活动配置、商品投放、运营看板和订单运营规则的统一管理。",
                "leaders": ["郑洁", "李娜"],
                "tech_framework": "React 18 + FastAPI + PostgreSQL",
                "business_unit": "集团总部",
                "business_type": "运营",
                "belong_system": "电商中台",
                "remarks": "2026 Q2 已完成会员域与订单域拆分。",
                "updated_at": _days_ago(2),
                "resources": [
                    {
                        "resource_type": "前端",
                        "developers": ["张伟"],
                        "git_repo": "https://github.com/example/ecom-ops-web",
                        "deploy_branch": "main",
                        "deploy_method": "K8s",
                        "deploy_addr": "ack-prod/ns-ops/web",
                        "deploy_steps": "pnpm install\npnpm build\nhelm upgrade --install ops-web",
                        "prod_domain": "https://ops.example.com",
                        "uat_domain": "https://ops-uat.example.com",
                        "tech_framework": "React 18 + Ant Design Pro",
                        "resource_remarks": "使用静态资源分层缓存。",
                    },
                    {
                        "resource_type": "后端",
                        "developers": ["李娜", "孙悟空"],
                        "git_repo": "https://github.com/example/ecom-ops-api",
                        "deploy_branch": "main",
                        "deploy_method": "K8s",
                        "deploy_addr": "ack-prod/ns-ops/api",
                        "deploy_steps": "docker build\nhelm upgrade --install ops-api",
                        "prod_domain": "https://api-ops.example.com",
                        "uat_domain": "https://api-ops-uat.example.com",
                        "tech_framework": "FastAPI + PostgreSQL + Redis",
                        "special_note": "生产环境接入统一 API 网关。",
                    },
                ],
                "external_resources": {
                    "aliyun_oss": {
                        "items": [
                            {
                                "name": "商品素材桶",
                                "bucket_name": "ops-asset-prod",
                                "endpoint": "oss-cn-shanghai.aliyuncs.com",
                                "region": "cn-shanghai",
                                "environment": "生产",
                                "access_path": "https://static.example.com/ops",
                                "notes": "用于商品图片和导出文件。",
                            },
                            {
                                "name": "运营报表桶",
                                "bucket_name": "ops-report-prod",
                                "endpoint": "oss-cn-shanghai.aliyuncs.com",
                                "region": "cn-shanghai",
                                "environment": "生产",
                                "access_path": "内网报表归档",
                                "notes": "日报和活动复盘归档。",
                            },
                        ],
                        "notes": "凭据由运维统一托管在 KMS。",
                    },
                    "database_config": {
                        "items": [
                            {
                                "name": "订单运营主库",
                                "engine": "PostgreSQL",
                                "host": "pg-ops-prod.rds.aliyuncs.com",
                                "port": "5432",
                                "database_name": "ops_center",
                                "account_name": "ops_app",
                                "environment": "生产",
                                "notes": "只读账号通过堡垒机分发。",
                            },
                            {
                                "name": "分析报表库",
                                "engine": "MySQL",
                                "host": "mysql-report-prod.rds.aliyuncs.com",
                                "port": "3306",
                                "database_name": "ops_report",
                                "account_name": "ops_report_ro",
                                "environment": "生产",
                                "notes": "仅供报表任务访问。",
                            },
                        ]
                    },
                    "redis_config": {
                        "items": [
                            {
                                "name": "业务缓存",
                                "host": "redis-ops-prod.rds.aliyuncs.com",
                                "port": "6379",
                                "database_index": "1",
                                "environment": "生产",
                                "notes": "密码存放于 Vault/proman/ops。",
                            }
                        ]
                    },
                    "middleware_config": {
                        "items": [
                            {
                                "name": "订单事件总线",
                                "middleware_type": "MQ",
                                "endpoint": "topic:ops-order-events",
                                "environment": "生产",
                                "notes": "消费订单状态和库存变化事件。",
                            },
                            {
                                "name": "运营配置中心",
                                "middleware_type": "配置中心",
                                "endpoint": "https://nacos.example.com/ops",
                                "environment": "生产",
                                "notes": "命名空间 ops-prod。",
                            },
                        ]
                    },
                    "other_config": {
                        "items": [
                            {
                                "name": "OpenSearch 商品检索",
                                "environment": "生产",
                                "config_summary": "索引 ops-goods-v2",
                                "notes": "索引模板由数据平台统一维护。",
                            }
                        ]
                    },
                },
            },
            {
                "project_name": "会员增长小程序",
                "project_type": "小程序",
                "project_status": "已上线",
                "project_desc": "服务拉新、积分任务、优惠券触达和会员转化的营销小程序。",
                "leaders": ["陈晨", "王强"],
                "tech_framework": "微信小程序原生 + Node.js",
                "business_unit": "投管",
                "business_type": "新需求",
                "belong_system": "会员增长平台",
                "remarks": "已接入企业微信导流和短信投放。",
                "updated_at": _days_ago(4),
                "resources": [
                    {
                        "resource_type": "前端",
                        "developers": ["王强"],
                        "git_repo": "https://github.com/example/member-growth-miniapp",
                        "deploy_branch": "release",
                        "deploy_method": "云托管",
                        "deploy_addr": "wechat-cloud/member-growth",
                        "deploy_steps": "npm ci\nnpm run build:mini\n上传微信云托管",
                        "prod_domain": "https://mini-member.example.com",
                        "uat_domain": "https://mini-member-uat.example.com",
                        "tech_framework": "微信小程序原生",
                    },
                    {
                        "resource_type": "后端",
                        "developers": ["李娜"],
                        "git_repo": "https://github.com/example/member-growth-api",
                        "deploy_branch": "release",
                        "deploy_method": "K8s",
                        "deploy_addr": "ack-prod/ns-growth/api",
                        "deploy_steps": "docker build\nhelm upgrade --install member-growth-api",
                        "prod_domain": "https://api-member.example.com",
                        "uat_domain": "https://api-member-uat.example.com",
                        "tech_framework": "Node.js + NestJS + Redis",
                    },
                ],
                "external_resources": {
                    "aliyun_oss": {
                        "items": [
                            {
                                "name": "活动素材桶",
                                "bucket_name": "growth-asset-prod",
                                "endpoint": "oss-cn-hangzhou.aliyuncs.com",
                                "region": "cn-hangzhou",
                                "environment": "生产",
                                "access_path": "https://growth-static.example.com",
                                "notes": "承载活动 H5 素材和分享图。",
                            }
                        ]
                    },
                    "database_config": {
                        "items": [
                            {
                                "name": "会员主库",
                                "engine": "MySQL",
                                "host": "mysql-growth-prod.rds.aliyuncs.com",
                                "port": "3306",
                                "database_name": "member_growth",
                                "account_name": "growth_app",
                                "environment": "生产",
                                "notes": "主从库切换由 DBA 统一维护。",
                            }
                        ]
                    },
                    "redis_config": {
                        "items": [
                            {
                                "name": "积分缓存",
                                "host": "redis-growth-prod.rds.aliyuncs.com",
                                "port": "6379",
                                "database_index": "2",
                                "environment": "生产",
                                "notes": "积分任务计数缓存。",
                            }
                        ]
                    },
                    "middleware_config": {
                        "items": [
                            {
                                "name": "营销任务调度",
                                "middleware_type": "任务调度",
                                "endpoint": "https://scheduler.example.com/growth",
                                "environment": "生产",
                                "notes": "定时发券和失效清理。",
                            }
                        ]
                    },
                    "other_config": {
                        "items": [
                            {
                                "name": "短信服务",
                                "environment": "生产",
                                "config_summary": "阿里云短信模板组 growth-*",
                                "notes": "模板审批由运营统一管理。",
                            }
                        ]
                    },
                },
            },
            {
                "project_name": "设备维护钉钉助手",
                "project_type": "钉钉微应用",
                "project_status": "已上线",
                "project_desc": "支撑设备巡检、故障报修、工单流转和备件申请的钉钉微应用。",
                "leaders": ["孙悟空", "王强"],
                "tech_framework": "DingTalk H5 + Spring Boot",
                "business_unit": "投融资",
                "business_type": "B端业务",
                "belong_system": "设备运维平台",
                "remarks": "已完成和企业内部工单系统的单点整合。",
                "updated_at": _days_ago(7),
                "resources": [
                    {
                        "resource_type": "前端",
                        "developers": ["张伟"],
                        "git_repo": "https://github.com/example/device-dingtalk-web",
                        "deploy_branch": "main",
                        "deploy_method": "Docker",
                        "deploy_addr": "ecs-device-prod-web-01",
                        "deploy_steps": "pnpm install\npnpm build\ndocker compose up -d",
                        "prod_domain": "https://device-app.example.com",
                        "uat_domain": "https://device-app-uat.example.com",
                        "tech_framework": "Vue 3 + Vant",
                    },
                    {
                        "resource_type": "后端",
                        "developers": ["王强", "孙悟空"],
                        "git_repo": "https://github.com/example/device-dingtalk-api",
                        "deploy_branch": "main",
                        "deploy_method": "Docker",
                        "deploy_addr": "ecs-device-prod-api-01",
                        "deploy_steps": "mvn package\ndocker build\ndocker compose up -d",
                        "prod_domain": "https://api-device.example.com",
                        "uat_domain": "https://api-device-uat.example.com",
                        "tech_framework": "Spring Boot + MySQL + Redis",
                    },
                ],
                "external_resources": {
                    "database_config": {
                        "items": [
                            {
                                "name": "设备工单库",
                                "engine": "MySQL",
                                "host": "mysql-device-prod.rds.aliyuncs.com",
                                "port": "3306",
                                "database_name": "device_center",
                                "account_name": "device_app",
                                "environment": "生产",
                                "notes": "与 CMDB 同机房部署。",
                            }
                        ]
                    },
                    "redis_config": {
                        "items": [
                            {
                                "name": "工单状态缓存",
                                "host": "redis-device-prod.rds.aliyuncs.com",
                                "port": "6379",
                                "database_index": "4",
                                "environment": "生产",
                                "notes": "用于 DingTalk 回调幂等处理。",
                            }
                        ]
                    },
                    "middleware_config": {
                        "items": [
                            {
                                "name": "维修工单网关",
                                "middleware_type": "网关",
                                "endpoint": "https://gateway.example.com/device",
                                "environment": "生产",
                                "notes": "统一鉴权和限流。",
                            }
                        ]
                    },
                    "other_config": {
                        "items": [
                            {
                                "name": "钉钉开放平台",
                                "environment": "生产",
                                "config_summary": "使用自建企业内部应用 appKey",
                                "notes": "回调地址已加入钉钉白名单。",
                            }
                        ]
                    },
                },
            },
            {
                "project_name": "董事办事项看板",
                "project_type": "低代码",
                "project_status": "已上线",
                "project_desc": "汇总董事会待办、批示跟踪和关键节点提醒的低代码看板。",
                "leaders": ["郑洁", "赵敏"],
                "tech_framework": "宜搭 + 自定义 API",
                "business_unit": "董事办",
                "business_type": "运营",
                "belong_system": "董事办办公域",
                "remarks": "已纳入每周经营例会固定使用场景。",
                "updated_at": _days_ago(5),
                "resources": [
                    {
                        "resource_type": "前端",
                        "developers": ["赵敏"],
                        "git_repo": "https://github.com/example/board-dashboard-ui",
                        "deploy_branch": "main",
                        "deploy_method": "SaaS",
                        "deploy_addr": "yida-app/board-dashboard",
                        "deploy_steps": "发布宜搭应用版本并同步自定义组件。",
                        "prod_domain": "https://board-dashboard.example.com",
                        "uat_domain": "https://board-dashboard-uat.example.com",
                        "tech_framework": "低代码页面 + 自定义组件",
                    },
                    {
                        "resource_type": "后端",
                        "developers": ["吴迪"],
                        "git_repo": "https://github.com/example/board-dashboard-service",
                        "deploy_branch": "main",
                        "deploy_method": "Serverless",
                        "deploy_addr": "fc-board-dashboard-service",
                        "deploy_steps": "serverless deploy",
                        "prod_domain": "https://api-board.example.com",
                        "uat_domain": "https://api-board-uat.example.com",
                        "tech_framework": "Python Function Compute",
                    },
                ],
                "external_resources": {
                    "database_config": {
                        "items": [
                            {
                                "name": "事项归档库",
                                "engine": "PostgreSQL",
                                "host": "pg-board-prod.rds.aliyuncs.com",
                                "port": "5432",
                                "database_name": "board_dashboard",
                                "account_name": "board_ro",
                                "environment": "生产",
                                "notes": "以只读方式接入经营分析仓。",
                            }
                        ]
                    },
                    "middleware_config": {
                        "items": [
                            {
                                "name": "待办同步任务",
                                "middleware_type": "任务调度",
                                "endpoint": "https://scheduler.example.com/board",
                                "environment": "生产",
                                "notes": "每小时同步一次事项状态。",
                            }
                        ]
                    },
                    "other_config": {
                        "items": [
                            {
                                "name": "经营分析数据集",
                                "environment": "生产",
                                "config_summary": "从数据平台同步核心指标快照",
                                "notes": "每日 08:10 自动刷新。",
                            }
                        ]
                    },
                },
            },
            {
                "project_name": "风控审核工作台",
                "project_type": "web应用",
                "project_status": "开发中",
                "project_desc": "聚合命中规则、审核记录和人工复核流程的风控业务工作台。",
                "leaders": ["李娜", "刘洋"],
                "tech_framework": "React + FastAPI + Rule Engine",
                "business_unit": "风控",
                "business_type": "B端业务",
                "belong_system": "风险控制平台",
                "remarks": "当前进行 UAT 联调。",
                "updated_at": _days_ago(9),
                "resources": [
                    {
                        "resource_type": "前端",
                        "developers": ["张伟"],
                        "git_repo": "https://github.com/example/risk-review-web",
                        "deploy_branch": "develop",
                        "deploy_method": "K8s",
                        "deploy_addr": "ack-uat/ns-risk/web",
                        "deploy_steps": "pnpm build:uat\nhelm upgrade --install risk-web",
                        "uat_domain": "https://risk-uat.example.com",
                        "tech_framework": "React 18 + TanStack Query",
                    },
                    {
                        "resource_type": "后端",
                        "developers": ["李娜"],
                        "git_repo": "https://github.com/example/risk-review-api",
                        "deploy_branch": "develop",
                        "deploy_method": "K8s",
                        "deploy_addr": "ack-uat/ns-risk/api",
                        "deploy_steps": "docker build\nhelm upgrade --install risk-api",
                        "uat_domain": "https://risk-api-uat.example.com",
                        "tech_framework": "FastAPI + PostgreSQL",
                    },
                ],
                "external_resources": {
                    "database_config": {
                        "items": [
                            {
                                "name": "审核工作台库",
                                "engine": "PostgreSQL",
                                "host": "pg-risk-uat.rds.aliyuncs.com",
                                "port": "5432",
                                "database_name": "risk_review",
                                "account_name": "risk_app",
                                "environment": "预发/UAT",
                                "notes": "UAT 白名单已开放。",
                            }
                        ]
                    },
                    "redis_config": {
                        "items": [
                            {
                                "name": "规则缓存",
                                "host": "redis-risk-uat.rds.aliyuncs.com",
                                "port": "6379",
                                "database_index": "5",
                                "environment": "预发/UAT",
                                "notes": "用于审核规则热加载。",
                            }
                        ]
                    },
                    "middleware_config": {
                        "items": [
                            {
                                "name": "风控规则配置中心",
                                "middleware_type": "配置中心",
                                "endpoint": "https://nacos.example.com/risk-uat",
                                "environment": "预发/UAT",
                                "notes": "规则版本按日切换。",
                            }
                        ]
                    },
                },
            },
            {
                "project_name": "仓储巡检钉钉助手",
                "project_type": "钉钉微应用",
                "project_status": "开发中",
                "project_desc": "支持仓库现场巡检、拍照留痕、缺陷派单和整改闭环跟踪。",
                "leaders": ["陈晨", "孙悟空"],
                "tech_framework": "DingTalk H5 + Go",
                "business_unit": "投融资",
                "business_type": "运营",
                "belong_system": "仓储协同平台",
                "remarks": "当前聚焦拍照上传链路优化。",
                "updated_at": _days_ago(12),
                "resources": [
                    {
                        "resource_type": "前端",
                        "developers": ["张伟"],
                        "git_repo": "https://github.com/example/warehouse-inspection-h5",
                        "deploy_branch": "develop",
                        "deploy_method": "Docker",
                        "deploy_addr": "ecs-warehouse-dev-web",
                        "deploy_steps": "pnpm dev-build\ndocker compose up -d",
                        "uat_domain": "https://warehouse-uat.example.com",
                        "tech_framework": "Vue 3 + Vant",
                    },
                    {
                        "resource_type": "后端",
                        "developers": ["王强"],
                        "git_repo": "https://github.com/example/warehouse-inspection-api",
                        "deploy_branch": "develop",
                        "deploy_method": "Docker",
                        "deploy_addr": "ecs-warehouse-dev-api",
                        "deploy_steps": "go build\ndocker build\ndocker compose up -d",
                        "uat_domain": "https://warehouse-api-uat.example.com",
                        "tech_framework": "Go + MySQL",
                    },
                ],
                "external_resources": {
                    "aliyun_oss": {
                        "items": [
                            {
                                "name": "巡检照片桶",
                                "bucket_name": "warehouse-inspection-uat",
                                "endpoint": "oss-cn-shanghai.aliyuncs.com",
                                "region": "cn-shanghai",
                                "environment": "预发/UAT",
                                "access_path": "内网专线访问",
                                "notes": "用于现场照片和整改附件。",
                            }
                        ]
                    },
                    "database_config": {
                        "items": [
                            {
                                "name": "巡检业务库",
                                "engine": "MySQL",
                                "host": "mysql-warehouse-uat.rds.aliyuncs.com",
                                "port": "3306",
                                "database_name": "warehouse_inspection",
                                "account_name": "inspection_app",
                                "environment": "预发/UAT",
                                "notes": "准生产数据脱敏后回灌。",
                            }
                        ]
                    },
                    "middleware_config": {
                        "items": [
                            {
                                "name": "整改消息队列",
                                "middleware_type": "MQ",
                                "endpoint": "topic:warehouse-rectify",
                                "environment": "预发/UAT",
                                "notes": "整改单状态变更通知。",
                            }
                        ]
                    },
                    "other_config": {
                        "notes": "钉钉消息卡片模板由企业内部应用统一维护。",
                    },
                },
            },
            {
                "project_name": "财务共享报表工坊",
                "project_type": "低代码",
                "project_status": "开发中",
                "project_desc": "为财务共享中心搭建自助报表、指标订阅和导出编排能力。",
                "leaders": ["吴迪", "周倩"],
                "tech_framework": "低代码编排 + Python ETL",
                "business_unit": "财务",
                "business_type": "报表分析",
                "belong_system": "财务分析平台",
                "remarks": "一期已完成模板市场设计。",
                "updated_at": _days_ago(15),
                "resources": [
                    {
                        "resource_type": "前端",
                        "developers": ["赵敏"],
                        "git_repo": "https://github.com/example/finance-workshop-ui",
                        "deploy_branch": "develop",
                        "deploy_method": "SaaS",
                        "deploy_addr": "yida-app/finance-workshop",
                        "deploy_steps": "发布模板并同步页面变量。",
                        "uat_domain": "https://finance-workshop-uat.example.com",
                        "tech_framework": "低代码报表页面",
                    },
                    {
                        "resource_type": "后端",
                        "developers": ["吴迪"],
                        "git_repo": "https://github.com/example/finance-workshop-service",
                        "deploy_branch": "develop",
                        "deploy_method": "Serverless",
                        "deploy_addr": "fc-finance-workshop",
                        "deploy_steps": "serverless deploy --stage uat",
                        "uat_domain": "https://api-finance-workshop-uat.example.com",
                        "tech_framework": "Python + Airflow API",
                    },
                ],
                "external_resources": {
                    "database_config": {
                        "items": [
                            {
                                "name": "财务分析仓",
                                "engine": "PostgreSQL",
                                "host": "pg-finance-ana.rds.aliyuncs.com",
                                "port": "5432",
                                "database_name": "finance_analytics",
                                "account_name": "finance_ro",
                                "environment": "预发/UAT",
                                "notes": "每日同步 T-1 账务数据。",
                            }
                        ]
                    },
                    "middleware_config": {
                        "items": [
                            {
                                "name": "任务调度平台",
                                "middleware_type": "任务调度",
                                "endpoint": "https://airflow.example.com/finance",
                                "environment": "预发/UAT",
                                "notes": "报表导出和刷新任务统一编排。",
                            }
                        ]
                    },
                    "other_config": {
                        "items": [
                            {
                                "name": "BI 主题集市",
                                "environment": "预发/UAT",
                                "config_summary": "对接财务共享主题域",
                                "notes": "由数据团队维护指标口径。",
                            }
                        ]
                    },
                },
            },
            {
                "project_name": "招商线索小程序",
                "project_type": "小程序",
                "project_status": "待启动",
                "project_desc": "用于线索收集、预约洽谈和招商主管跟进的小程序项目。",
                "leaders": ["陈晨"],
                "tech_framework": "微信小程序 + CRM API",
                "business_unit": "投管",
                "business_type": "新需求",
                "belong_system": "招商 CRM",
                "remarks": "待完成立项评审和预算确认。",
                "updated_at": _days_ago(3),
                "resources": [],
            },
            {
                "project_name": "人事自助服务门户",
                "project_type": "web应用",
                "project_status": "待启动",
                "project_desc": "整合入转调离、证明开具和员工自助查询的人事门户。",
                "leaders": ["赵敏", "郑洁"],
                "tech_framework": "React + BPM",
                "business_unit": "人力资源",
                "business_type": "运维",
                "belong_system": "人力服务中心",
                "remarks": "等待 HR 业务流程梳理完成。",
                "updated_at": _days_ago(6),
                "resources": [],
                "external_resources": {
                    "other_config": {
                        "notes": "计划对接现有 BPM 平台与电子签章服务，待采购确认后再录入具体实例。",
                    }
                },
            },
            {
                "project_name": "供应商协同门户",
                "project_type": "web应用",
                "project_status": "已下线",
                "project_desc": "历史供应商入驻、对账和资料提交流程门户，现已由新平台替代。",
                "leaders": ["王强"],
                "tech_framework": "Vue 2 + Spring Boot",
                "business_unit": "集团总部",
                "business_type": "运维",
                "belong_system": "供应商管理平台",
                "remarks": "保留只读环境供审计追溯。",
                "updated_at": _days_ago(180),
                "resources": [
                    {
                        "resource_type": "前端",
                        "developers": ["张伟"],
                        "deploy_branch": "archive",
                        "deploy_method": "Jenkins",
                        "deploy_addr": "archive-web-01",
                        "tech_framework": "Vue 2",
                        "resource_remarks": "代码仓库已迁入冷存档。",
                    },
                    {
                        "resource_type": "后端",
                        "developers": ["王强"],
                        "deploy_branch": "archive",
                        "deploy_method": "Jenkins",
                        "deploy_addr": "archive-api-01",
                        "tech_framework": "Spring Boot + MySQL",
                        "resource_remarks": "仅保留只读接口供审计导出。",
                    },
                ],
                "external_resources": {
                    "database_config": {
                        "items": [
                            {
                                "name": "历史归档库",
                                "engine": "MySQL",
                                "host": "mysql-supplier-archive.rds.aliyuncs.com",
                                "port": "3306",
                                "database_name": "supplier_archive",
                                "account_name": "audit_ro",
                                "environment": "生产",
                                "notes": "仅审计账号可访问。",
                            }
                        ]
                    },
                    "other_config": {
                        "notes": "历史文件已迁移至离线归档盘，不再接入在线对象存储。",
                    },
                },
            },
            {
                "project_name": "采购合同归档平台",
                "project_type": "web应用",
                "project_status": "开发中",
                "project_desc": "规范采购合同在线归档、版本留痕和审批追踪的协同平台。",
                "leaders": ["郑洁", "周倩"],
                "tech_framework": "React + Java + PostgreSQL",
                "business_unit": "集团总部",
                "business_type": "B端业务",
                "belong_system": "采购协同平台",
                "remarks": "当前已完成合同模板和归档目录设计。",
                "updated_at": _days_ago(11),
                "resources": [
                    {
                        "resource_type": "前端",
                        "developers": ["张伟"],
                        "git_repo": "https://github.com/example/contract-archive-web",
                        "deploy_branch": "develop",
                        "deploy_method": "K8s",
                        "deploy_addr": "ack-dev/ns-contract/web",
                        "uat_domain": "https://contract-archive-uat.example.com",
                        "tech_framework": "React 18 + TypeScript",
                    },
                    {
                        "resource_type": "后端",
                        "developers": ["王强"],
                        "git_repo": "https://github.com/example/contract-archive-api",
                        "deploy_branch": "develop",
                        "deploy_method": "K8s",
                        "deploy_addr": "ack-dev/ns-contract/api",
                        "uat_domain": "https://contract-archive-api-uat.example.com",
                        "tech_framework": "Spring Boot + PostgreSQL",
                    },
                ],
                "external_resources": {
                    "aliyun_oss": {
                        "items": [
                            {
                                "name": "合同附件桶",
                                "bucket_name": "contract-archive-uat",
                                "endpoint": "oss-cn-beijing.aliyuncs.com",
                                "region": "cn-beijing",
                                "environment": "预发/UAT",
                                "access_path": "专有域名待申请",
                                "notes": "用于合同扫描件和盖章回执。",
                            }
                        ]
                    },
                    "database_config": {
                        "items": [
                            {
                                "name": "合同归档库",
                                "engine": "PostgreSQL",
                                "host": "pg-contract-uat.rds.aliyuncs.com",
                                "port": "5432",
                                "database_name": "contract_archive",
                                "account_name": "contract_app",
                                "environment": "预发/UAT",
                                "notes": "已接入审计日志。",
                            }
                        ]
                    },
                },
            },
        ]

        print("Creating projects, resources and external dependencies...")
        created_projects = 0
        for spec in project_specs:
            leaders = [member_by_name[name] for name in spec["leaders"]]
            project = ProjectBase(
                project_name=spec["project_name"],
                project_type=spec["project_type"],
                project_status=spec["project_status"],
                project_desc=spec["project_desc"],
                project_leader=", ".join(spec["leaders"]),
                project_leaders=leaders,
                tech_framework=spec.get("tech_framework"),
                business_unit=spec["business_unit"],
                business_type=spec["business_type"],
                belong_system=spec["belong_system"],
                remarks=spec.get("remarks"),
                update_time=spec["updated_at"],
            )
            db.add(project)
            db.flush()

            for resource_spec in spec.get("resources", []):
                db.add(
                    _create_project_resource(
                        project_id=project.project_id,
                        member_by_name=member_by_name,
                        update_time=spec["updated_at"],
                        **resource_spec,
                    )
                )

            external_sections = spec.get("external_resources")
            if external_sections:
                db.add(_create_external_resource(project.project_id, external_sections))

            created_projects += 1

        db.commit()
        print(f"Seed data completed. Created {created_projects} projects and {len(members)} members.")
    except Exception as exc:
        print(f"Seed data failed: {exc}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
