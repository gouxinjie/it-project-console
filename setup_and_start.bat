@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo   IT-Project-Console - 企业IT项目管理平台 一键部署与启动
echo ==========================================

:: 1. 检查 Python 环境
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Python，请先安装 Python 3.10+ 并添加到 PATH。
    pause
    exit /b 1
)
echo [OK] Python 环境检测通过

:: 2. 检查 Node.js 环境
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js v16+。
    pause
    exit /b 1
)
echo [OK] Node.js 环境检测通过

:: 3. 检查 pnpm 环境 (如果没有安装则尝试安装或提示)
call pnpm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [提示] 未检测到 pnpm，正在尝试通过 npm 安装...
    call npm install -g pnpm
    if %errorlevel% neq 0 (
        echo [错误] pnpm 安装失败，请手动安装 pnpm 或检查 npm 环境。
        pause
        exit /b 1
    )
    echo [OK] pnpm 安装成功
) else (
    echo [OK] pnpm 环境检测通过
)

echo.
echo ------------------------------------------
echo   步骤 1/4: 安装后端依赖
echo ------------------------------------------
cd /d %~dp0backend
if errorlevel 1 (
    echo [错误] 找不到 backend 目录
    pause
    exit /b 1
)
echo 正在安装 Python 依赖...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [错误] 后端依赖安装失败，请检查网络或 pip 配置。
    pause
    exit /b 1
)
echo [OK] 后端依赖安装完成

echo.
echo ------------------------------------------
echo   步骤 2/4: 初始化数据库
echo ------------------------------------------
echo 正在初始化数据库表结构...
python init_db.py
if %errorlevel% neq 0 (
    echo [错误] 数据库初始化失败，请检查数据库配置 (backend/app/core/config.py) 或 MySQL 服务是否启动。
    pause
    exit /b 1
)

set "SEED_DEMO_DATA="
if /I "%PROMAN_SEED_DEMO_DATA%"=="1" set "SEED_DEMO_DATA=1"

if not defined SEED_DEMO_DATA (
    set /p SEED_DEMO_DATA_INPUT=是否加载演示数据? 该操作会清空现有项目/成员数据 [y/N]:
    if /I "!SEED_DEMO_DATA_INPUT!"=="Y" set "SEED_DEMO_DATA=1"
    if /I "!SEED_DEMO_DATA_INPUT!"=="YES" set "SEED_DEMO_DATA=1"
)

if defined SEED_DEMO_DATA (
    echo 正在填充演示数据...
    python seed_data.py
    if %errorlevel% neq 0 (
        echo [警告] 数据填充脚本执行异常，请检查日志后重试。
    ) else (
        echo [OK] 演示数据填充完成
    )
) else (
    echo [OK] 已跳过演示数据填充，仅保留默认管理员账号。
)

echo.
echo ------------------------------------------
echo   步骤 3/4: 安装前端依赖
echo ------------------------------------------
cd /d %~dp0frontend
if errorlevel 1 (
    echo [错误] 找不到 frontend 目录
    pause
    exit /b 1
)
echo 正在安装前端依赖 (pnpm)...
call pnpm install
if %errorlevel% neq 0 (
    echo [错误] 前端依赖安装失败，请检查网络。
    pause
    exit /b 1
)
echo [OK] 前端依赖安装完成

echo.
echo ------------------------------------------
echo   步骤 4/4: 启动服务
echo ------------------------------------------

:: 返回根目录
cd /d %~dp0

:: 启动后端
echo [启动] 后端服务 (FastAPI)...
start "IT-Project-Backend" cmd /k "cd /d %~dp0backend && uvicorn app.main:app --reload --port 8000"

:: 启动前端
echo [启动] 前端服务 (Vite/React)...
start "IT-Project-Frontend" cmd /k "cd /d %~dp0frontend && pnpm run dev"

echo.
echo ==========================================
echo   全部就绪！服务已在独立窗口中启动。
echo   ------------------------------------------
echo   后端地址: http://127.0.0.1:8000/docs
echo   前端地址: http://localhost:3000 (请留意Vite输出端口)
echo   ------------------------------------------
echo   默认账户: admin / admin123!@#
echo ==========================================
echo.
pause
