@echo off
REM ============================================
REM BCA Scraper Windows - Setup Auto-Start
REM ============================================

echo.
echo ============================================
echo    Setup Auto-Start (Task Scheduler)
echo ============================================
echo.

REM Get current directory
set SCRAPER_DIR=%~dp0
set SCRAPER_DIR=%SCRAPER_DIR:~0,-1%

REM Check if config exists
if not exist "%SCRAPER_DIR%\config.env" (
    echo [ERROR] config.env not found!
    echo Please run install-windows.bat first and configure config.env
    pause
    exit /b 1
)

echo This will create a Windows Task Scheduler task that:
echo - Runs the scraper automatically when you log in
echo - Restarts the scraper if it crashes
echo.
echo Scraper location: %SCRAPER_DIR%
echo.

set /p CONFIRM="Do you want to continue? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo Creating scheduled task...

REM Delete existing task if exists
schtasks /delete /tn "BCA-Scraper" /f >nul 2>&1

REM Create new task that runs on logon
schtasks /create /tn "BCA-Scraper" /tr "cmd /c cd /d \"%SCRAPER_DIR%\" && node bca-scraper-windows.js" /sc onlogon /rl highest /f

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to create scheduled task!
    echo You may need to run this script as Administrator.
    echo.
    echo Manual alternative:
    echo 1. Press Win+R, type: shell:startup
    echo 2. Create a shortcut to run-windows.bat in that folder
    pause
    exit /b 1
)

echo.
echo ============================================
echo    Auto-Start Setup Complete!
echo ============================================
echo.
echo Task "BCA-Scraper" created successfully.
echo.
echo The scraper will now start automatically when you log in.
echo.
echo To manage the task:
echo - Open Task Scheduler (taskschd.msc)
echo - Find "BCA-Scraper" in the task list
echo.
echo To remove auto-start:
echo   schtasks /delete /tn "BCA-Scraper" /f
echo.
pause
