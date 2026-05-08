@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "FRONTEND_PM=npm"

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found. Install Python 3.10+ and add it to PATH.
    pause
    exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found. Install Node.js 16+ and add it to PATH.
    pause
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm was not found. Check your Node.js installation.
    pause
    exit /b 1
)

where pnpm >nul 2>&1
if %errorlevel% equ 0 (
    set "FRONTEND_PM=pnpm"
)

echo ==========================================
echo   IT-Project-Console - Dev Startup
echo ==========================================
echo [INFO] Frontend package manager: %FRONTEND_PM%
echo.

echo [1/2] Starting backend (FastAPI)...
start "IT-Project-Backend" cmd /k "cd /d ""%ROOT_DIR%backend"" && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo [2/2] Starting frontend (Vite/React)...
start "IT-Project-Frontend" cmd /k "cd /d ""%ROOT_DIR%frontend"" && %FRONTEND_PM% run dev"

echo.
echo ==========================================
echo   Services started in separate windows.
echo   Backend:  http://127.0.0.1:8000
echo   Frontend: http://127.0.0.1:3000
echo   Package manager: %FRONTEND_PM%
echo ==========================================
echo.
pause
