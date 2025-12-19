@echo off
REM Quick Deployment Launcher for Windows
REM Usage: deploy.bat 1.7.0

echo.
echo ========================================
echo   UE5 Question Generator Deployment
echo ========================================
echo.

if "%1"=="" (
    echo ERROR: Version number required
    echo Usage: deploy.bat [version]
    echo Example: deploy.bat 1.7.0
    exit /b 1
)

set VERSION=%1

echo Deploying version %VERSION%...
echo.

python tools\deploy\deploy_master.py --version %VERSION%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   Deployment Successful!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Monitor Firebase console
    echo 2. Test production site
    echo.
) else (
    echo.
    echo ========================================
    echo   Deployment Failed!
    echo ========================================
    echo.
    echo Check logs in tools/deploy/logs/
    echo.
)
