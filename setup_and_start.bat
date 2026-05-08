@echo off
setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "FRONTEND_PM=npm"

echo ==========================================
echo   IT-Project-Console - Setup And Start
echo ==========================================

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found. Install Python 3.10+ and add it to PATH.
    pause
    exit /b 1
)
echo [OK] Python detected

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found. Install Node.js 16+ and add it to PATH.
    pause
    exit /b 1
)
echo [OK] Node.js detected

call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm was not found. Check your Node.js installation.
    pause
    exit /b 1
)

call pnpm --version >nul 2>&1
if %errorlevel% equ 0 (
    set "FRONTEND_PM=pnpm"
    echo [OK] pnpm detected. Frontend will use pnpm.
) else (
    echo [INFO] pnpm not found. Frontend will fall back to npm.
)

echo.
echo ------------------------------------------
echo   Step 1/4: Install backend dependencies
echo ------------------------------------------
cd /d "%BACKEND_DIR%"
if errorlevel 1 (
    echo [ERROR] backend directory was not found.
    pause
    exit /b 1
)
echo Installing Python dependencies...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Backend dependency installation failed.
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed

echo.
echo ------------------------------------------
echo   Step 2/4: Initialize database
echo ------------------------------------------
set "RESET_DB="
if /I "%PROMAN_RESET_DB%"=="1" set "RESET_DB=1"

if not defined RESET_DB (
    set /p RESET_DB_INPUT=Rebuild database schema and reseed demo data? This deletes existing project/member/external resource data [y/N]:
    if /I "!RESET_DB_INPUT!"=="Y" set "RESET_DB=1"
    if /I "!RESET_DB_INPUT!"=="YES" set "RESET_DB=1"
)

if defined RESET_DB (
    echo Rebuilding database schema and reseeding demo data...
    python reset_db.py --confirm RESET
    if %errorlevel% neq 0 (
        echo [ERROR] Database rebuild failed. Check backend/.env and MySQL.
        pause
        exit /b 1
    )
    echo [OK] Database rebuilt and demo data reseeded
) else (
    echo Initializing database schema...
    python init_db.py
    if %errorlevel% neq 0 (
        echo [ERROR] Database initialization failed. Check backend/.env and MySQL.
        pause
        exit /b 1
    )

    set "SEED_DEMO_DATA="
    if /I "%PROMAN_SEED_DEMO_DATA%"=="1" set "SEED_DEMO_DATA=1"

    if not defined SEED_DEMO_DATA (
        set /p SEED_DEMO_DATA_INPUT=Load demo data without rebuilding schema? This clears existing project/member data [y/N]:
        if /I "!SEED_DEMO_DATA_INPUT!"=="Y" set "SEED_DEMO_DATA=1"
        if /I "!SEED_DEMO_DATA_INPUT!"=="YES" set "SEED_DEMO_DATA=1"
    )

    if defined SEED_DEMO_DATA (
        echo Seeding demo data...
        python seed_data.py
        if %errorlevel% neq 0 (
            echo [WARN] Demo data seeding failed. Check the output and retry.
        ) else (
            echo [OK] Demo data seeded
        )
    ) else (
        echo [OK] Demo data skipped. Default admin account remains available.
    )
)

echo.
echo ------------------------------------------
echo   Step 3/4: Install frontend dependencies
echo ------------------------------------------
cd /d "%FRONTEND_DIR%"
if errorlevel 1 (
    echo [ERROR] frontend directory was not found.
    pause
    exit /b 1
)
echo Installing frontend dependencies with %FRONTEND_PM%...
call %FRONTEND_PM% install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend dependency installation failed.
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed

echo.
echo ------------------------------------------
echo   Step 4/4: Start services
echo ------------------------------------------
cd /d "%ROOT_DIR%"

echo [START] Backend (FastAPI)...
start "IT-Project-Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo [START] Frontend (Vite/React, %FRONTEND_PM%)...
start "IT-Project-Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && %FRONTEND_PM% run dev"

echo.
echo ==========================================
echo   Setup complete. Services started in separate windows.
echo   Backend docs: http://127.0.0.1:8000/docs
echo   Frontend:     http://127.0.0.1:3000
echo   Package manager: %FRONTEND_PM%
echo   Admin: admin / admin123!@#
echo ==========================================
echo.
pause
