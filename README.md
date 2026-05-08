# IT-Project-Console

## 项目背景

通常在企业中一个完整的项目会先有一个项目的基本信息（包括项目名称、项目类型、项目状态、项目描述、技术框架、业务方、 业务类型 、所属系统 、项目负责人 、更新时间等） 和 下面的子项目构成。

**子项目**又分为： 前端 + 后端 + 外部资源

**前端和后端**包括的基本信息是一致的：有 git仓库、发布分支、发布方式、域名、部署步骤等

**外部资源**又有阿里云OSS、Redis、数据库、中间件等子资源。

企业内部 IT 项目台账与交付信息管理平台，用于把项目基础信息、前后端资源、成员、外部依赖和账号权限收口到一个控制台里，方便日常维护、交接和审计。

![项目架构图](./imgs/overview.png)

## 功能概览

- 项目总览仪表盘，集中展示项目状态、类型分布和最近活跃项目。
- 项目管理，维护项目基础信息、前后端资源、部署信息和备注。
- 成员管理，维护成员职责、技术栈、联系方式，并支持项目负责人与资源开发者关联。
- 外部资源管理，维护 OSS、数据库、Redis、中间件和其他依赖。
- 账号管理，管理员可创建账号、调整角色与状态、重置其他用户密码、删除账号。
- 登录与注册，公开注册可通过后端配置开关控制，默认关闭。

## 项目截图

**登录页**
![登录页](./imgs/login.png)

**仪表盘**
![仪表盘](./imgs/dashboard.png)

**项目列表**
![项目列表](./imgs/project_list.png)

**项目列表-展开**
![项目列表-展开](./imgs/project_list_expand.png)

## 技术栈

### 前端

- React 18 + TypeScript
- Vite
- Ant Design 5
- Tailwind CSS
- React Router v6
- Axios
- ECharts

### 后端

- FastAPI
- SQLAlchemy 2.0
- MySQL 5.7/8.0
- Pydantic v2
- JWT (`python-jose`)
- `passlib[bcrypt]`

## 当前目录结构

```text
it-project-console/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── api_v1/
│   │   │   │   ├── endpoints/      # 登录、项目、成员、账号管理接口
│   │   │   │   └── api.py
│   │   │   └── deps.py
│   │   ├── core/                   # 配置、安全、启动引导
│   │   ├── db/                     # 数据库连接与基类
│   │   ├── models/                 # SQLAlchemy 模型
│   │   ├── schemas/                # Pydantic schema
│   │   └── main.py                 # FastAPI 入口
│   ├── .env.example                # 后端环境变量模板
│   ├── create_db.py
│   ├── init_db.py
│   ├── reset_db.py
│   ├── seed_data.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/             # 布局与通用组件
│   │   ├── constants/
│   │   ├── contexts/               # 认证上下文
│   │   ├── pages/                  # 登录、仪表盘、项目、成员、账号页面
│   │   ├── services/               # API 请求封装
│   │   ├── types/
│   │   └── utils/
│   ├── .env.development.example    # 本地开发登录页管理员展示示例
│   ├── .env.development.local      # 本地开发登录页管理员展示配置（本地文件，不提交）
│   ├── package.json
│   └── vite.config.ts
├── imgs/
├── setup_and_start.bat             # 初始化依赖、同步本地管理员配置并启动
├── start_dev.bat                   # 仅启动前后端服务
└── README.md
```

## 认证、账号与安全

- 登录、当前用户和注册接口位于 `/api/v1/login/*`。
- 管理员账号管理接口位于 `/api/v1/users/*`，前端管理页面为 `/users`。
- 公开注册由 `backend/.env` 中的 `ALLOW_PUBLIC_REGISTRATION` 控制，默认 `false`。
- 默认管理员账号只会在账号不存在时根据 `DEFAULT_ADMIN_USERNAME`、`DEFAULT_ADMIN_PASSWORD`、`DEFAULT_ADMIN_EMAIL` 创建一次，不会在每次启动时重置密码。
- 密码不会明文存储，后端会使用 `passlib[bcrypt]` 进行哈希后再入库。
- 当前密码规则为至少 6 位，只允许字母和数字，且必须同时包含至少 1 个字母和 1 个数字。
- 登录、注册、改密等敏感请求在非本地环境默认强制 HTTPS。`SECURE_TRANSPORT_REQUIRED=true` 时，除 `localhost`、`127.0.0.1` 外的 HTTP 请求会被后端直接拒绝。
- 如果部署在 Nginx 或网关之后由代理终止 HTTPS，需要显式设置 `TRUST_X_FORWARDED_PROTO=true`，并正确转发 `X-Forwarded-Proto` 请求头。
- 本地开发登录页会读取 `frontend/.env.development.local` 中的 `VITE_DEV_ADMIN_USERNAME` 和 `VITE_DEV_ADMIN_PASSWORD`，直接展示管理员账号密码。`setup_and_start.bat` 会自动把 `backend/.env` 中的默认管理员初始化配置同步到这个本地文件，仅用于展示和首次初始化。

## 环境准备

- Python 3.10+
- Node.js 16+
- pnpm（推荐）或 npm
- MySQL 5.7 / 8.0

先创建数据库：

```sql
CREATE DATABASE proman CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

然后准备后端配置：

1. 将 `backend/.env.example` 复制为 `backend/.env`。
2. 至少检查以下配置：

```env
SECRET_KEY=replace-with-a-real-secret
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_SERVER=localhost
MYSQL_PORT=3306
MYSQL_DB=proman

ALLOW_PUBLIC_REGISTRATION=false
SECURE_TRANSPORT_REQUIRED=true
TRUST_X_FORWARDED_PROTO=false

DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=ChangeMe123
DEFAULT_ADMIN_EMAIL=admin@proman.com
```

## 快速开始

### 方式一：Windows 一键初始化与启动

运行根目录下的 `setup_and_start.bat`：

```bat
setup_and_start.bat
```

该脚本会执行：

1. 检查并准备 `backend/.env`。
2. 读取 `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD`。
3. 同步 `frontend/.env.development.local`，让登录页直接展示默认管理员初始化账号密码。
4. 安装后端依赖。
5. 初始化数据库，并按需灌入演示数据。
6. 安装前端依赖。
7. 分别启动后端和前端开发服务。

默认地址：

- 前端：`http://127.0.0.1:3000`
- 后端文档：`http://127.0.0.1:8000/docs`

### 方式二：手动启动

#### 1. 后端

```bash
cd backend
pip install -r requirements.txt
python init_db.py
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

可选脚本：

- `python seed_data.py`：保留表结构，清空并重建演示项目、成员和外部资源数据。
- `python reset_db.py --confirm RESET`：删除当前管理表并重建后重新灌入演示数据，高风险操作。

#### 2. 前端

```bash
cd frontend
pnpm install
pnpm run dev
```

如果希望本地登录页直接展示管理员账号密码，请准备 `frontend/.env.development.local`：

```env
VITE_DEV_ADMIN_USERNAME=admin
VITE_DEV_ADMIN_PASSWORD=ChangeMe123
```

最简单的做法是直接运行一次 `setup_and_start.bat`，让脚本自动生成该本地文件。仓库中保留的是 `frontend/.env.development.example`，不要把实际管理员密码提交到版本库。

## 默认管理员说明

- 用户名默认读取 `DEFAULT_ADMIN_USERNAME`
- 密码默认读取 `DEFAULT_ADMIN_PASSWORD`
- 邮箱默认读取 `DEFAULT_ADMIN_EMAIL`
- 这些值只在首次创建默认管理员时使用
- 登录页展示的管理员密码来自 `backend/.env` 的默认管理员初始化配置，不会自动覆盖数据库里已存在管理员的真实密码
- 如果数据库里已经存在该管理员账号，后续修改 `backend/.env` 不会自动重置数据库中的密码

## 开发说明

- 前端开发服务器固定使用 `3000` 端口，并通过 Vite 代理 `/api` 到 `http://127.0.0.1:8000`。
- `start_dev.bat` 适合依赖和环境文件已经准备好的场景，只负责拉起前后端服务。
- `frontend/.env.development.local` 是本地专用文件，不应提交到版本库，也不应用于非本地环境展示管理员密码。

## License

MIT License. See [LICENSE](LICENSE) for details.
