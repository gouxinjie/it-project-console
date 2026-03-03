@echo off
setlocal

echo ==========================================
echo   IT-Project-Console - 企业IT项目管理平台 启动脚本 windows 版本
echo ==========================================

:: 启动后端
echo [1/2] 正在启动后端服务 (FastAPI)...
start "IT-Project-Backend" cmd /k "cd /d %~dp0backend && uvicorn app.main:app --reload --port 8000"

:: 启动前端
echo [2/2] 正在启动前端服务 (Vite/React)...
start "IT-Project-Frontend" cmd /k "cd /d %~dp0frontend && pnpm run dev"

echo.
echo ==========================================
echo   服务已在独立窗口中启动。
echo   后端地址: http://127.0.0.1:8000
echo   前端地址: http://localhost:5173 (请以Vite输出为准)
echo ==========================================
echo.
pause
