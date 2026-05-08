@echo off
setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "BACKEND_ENV=%BACKEND_DIR%\.env"
set "BACKEND_ENV_EXAMPLE=%BACKEND_DIR%\.env.example"
set "FRONTEND_ENV_DEV=%FRONTEND_DIR%\.env.development.local"
set "FRONTEND_ENV_TEMP=%FRONTEND_DIR%\.env.development.local.tmp"
set "FRONTEND_PM=npm"
set "ADMIN_USERNAME=admin"
set "ADMIN_PASSWORD="

echo ==========================================
echo   IT-Project-Console - Setup And Start
echo ==========================================

call :prepare_env_files
if %errorlevel% neq 0 (
    pause
    exit /b 1
)

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
echo   Step 2/5: Install backend dependencies
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
echo   Step 3/5: Initialize database
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
echo   Step 4/5: Install frontend dependencies
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
echo   Step 5/5: Start services
echo ------------------------------------------
cd /d "%ROOT_DIR%"

echo [START] Backend (FastAPI)...
start "IT-Project-Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo [START] Frontend (Vite/React, %FRONTEND_PM%)...
start "IT-Project-Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && %FRONTEND_PM% run dev"

echo.
echo ==========================================
echo   Setup complete. Services started in separate windows.
echo   Backend docs:  http://127.0.0.1:8000/docs
echo   Frontend:      http://127.0.0.1:3000
echo   Package mgr:   %FRONTEND_PM%
if defined ADMIN_PASSWORD (
    echo   Display admin: %ADMIN_USERNAME% / %ADMIN_PASSWORD% (bootstrap value from backend/.env)
) else (
    echo   Display admin: %ADMIN_USERNAME% / [empty in backend/.env]
)
echo   Login config:  frontend/.env.development.local
echo   Note: if the admin already exists in DB, the actual login password may differ.
echo ==========================================
echo.
pause
goto :eof

:prepare_env_files
echo.
echo ------------------------------------------
echo   Step 1/5: Prepare local env files
echo ------------------------------------------

if not exist "%BACKEND_DIR%" (
    echo [ERROR] backend directory was not found.
    exit /b 1
)

if not exist "%FRONTEND_DIR%" (
    echo [ERROR] frontend directory was not found.
    exit /b 1
)

if not exist "%BACKEND_ENV%" (
    if not exist "%BACKEND_ENV_EXAMPLE%" (
        echo [ERROR] backend/.env was not found and backend/.env.example is missing.
        exit /b 1
    )

    copy /y "%BACKEND_ENV_EXAMPLE%" "%BACKEND_ENV%" >nul
    if errorlevel 1 (
        echo [ERROR] Failed to create backend/.env from .env.example.
        exit /b 1
    )
    echo [OK] Created backend/.env from .env.example
    echo [INFO] Review backend/.env and update database credentials if needed.
) else (
    echo [OK] backend/.env detected
)

call :load_admin_settings
if %errorlevel% neq 0 exit /b 1

call :sync_frontend_dev_env
if %errorlevel% neq 0 exit /b 1

echo [OK] frontend/.env.development.local synced from backend/.env bootstrap admin settings
if defined ADMIN_PASSWORD (
    echo [OK] Login-page display password prepared: %ADMIN_USERNAME% / %ADMIN_PASSWORD%
    echo [INFO] Existing admin accounts are not auto-reset; actual DB password may differ.
) else (
    echo [WARN] DEFAULT_ADMIN_PASSWORD is empty in backend/.env
    echo [WARN] A fresh default admin cannot be created until you set it
)

exit /b 0

:load_admin_settings
set "ADMIN_USERNAME=admin"
set "ADMIN_PASSWORD="

for /f "usebackq tokens=1,* delims==" %%A in ("%BACKEND_ENV%") do (
    if /I "%%A"=="DEFAULT_ADMIN_USERNAME" set "ADMIN_USERNAME=%%B"
    if /I "%%A"=="DEFAULT_ADMIN_PASSWORD" set "ADMIN_PASSWORD=%%B"
)

if not defined ADMIN_USERNAME set "ADMIN_USERNAME=admin"
exit /b 0

:sync_frontend_dev_env
(
    echo VITE_DEV_ADMIN_USERNAME=%ADMIN_USERNAME%
    echo VITE_DEV_ADMIN_PASSWORD=%ADMIN_PASSWORD%
) > "%FRONTEND_ENV_TEMP%"

if exist "%FRONTEND_ENV_DEV%" (
    for /f "usebackq delims=" %%L in ("%FRONTEND_ENV_DEV%") do (
        set "LINE=%%L"
        echo(!LINE!| findstr /B /I /C:"VITE_DEV_ADMIN_USERNAME=" /C:"VITE_DEV_ADMIN_PASSWORD=" >nul
        if errorlevel 1 >> "%FRONTEND_ENV_TEMP%" echo(!LINE!
    )
)

move /y "%FRONTEND_ENV_TEMP%" "%FRONTEND_ENV_DEV%" >nul
if errorlevel 1 (
    echo [ERROR] Failed to write frontend/.env.development.local.
    exit /b 1
)

exit /b 0
