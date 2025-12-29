@echo off
REM ============================================
REM BCA Scraper Windows - Installer v4.1.5
REM ============================================

echo.
echo ============================================
echo    BCA Scraper Windows - Installer v4.1.5
echo ============================================
echo.

REM Check if running as Administrator (optional but recommended)
REM net session >nul 2>&1
REM if %ERRORLEVEL% neq 0 (
REM     echo [WARN] Not running as Administrator. Some features may not work.
REM )

REM Check Node.js installation
echo [1/4] Checking Node.js installation...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Node.js is NOT installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/
    echo.
    echo After installation, restart Command Prompt and run this script again.
    echo.
    pause
    exit /b 1
)

REM Display Node.js version
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

REM Check npm
echo.
echo [2/4] Checking npm...
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is NOT installed!
    echo Please reinstall Node.js from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm found: v%NPM_VERSION%

REM Install Puppeteer
echo.
echo [3/4] Installing Puppeteer (this may take a few minutes)...
npm install puppeteer
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install Puppeteer!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)
echo [OK] Puppeteer installed successfully!

REM Create config.env from template
echo.
echo [4/4] Setting up configuration...
if not exist config.env (
    if exist config.env.template (
        copy config.env.template config.env >nul
        echo [OK] config.env created from template
        echo.
        echo ============================================
        echo IMPORTANT: Edit config.env with your BCA credentials!
        echo ============================================
    ) else (
        echo [WARN] config.env.template not found
        echo Please create config.env manually
    )
) else (
    echo [OK] config.env already exists
)

REM Create debug folder
if not exist debug (
    mkdir debug
    echo [OK] Created debug folder
)

REM Display completion message
echo.
echo ============================================
echo    Installation Complete!
echo ============================================
echo.
echo NEXT STEPS:
echo.
echo 1. Edit config.env with Notepad:
echo    notepad config.env
echo.
echo 2. Fill in these values:
echo    - BCA_USER_ID     : Your KlikBCA User ID
echo    - BCA_PIN         : Your KlikBCA PIN
echo    - BCA_ACCOUNT_NUMBER : Your BCA account number
echo    - SECRET_KEY      : Get from Bank Scraper Settings
echo    - WEBHOOK_URL     : Already filled (don't change)
echo.
echo 3. Test the scraper:
echo    run-windows.bat
echo.
echo 4. For auto-start on login:
echo    setup-autostart.bat
echo.
echo ============================================
echo.
pause
