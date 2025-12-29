@echo off
title BCA Balance Checker - Installer

echo ==========================================
echo    BCA Balance Checker - Installer
echo ==========================================
echo.

cd /d "%~dp0"

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js tidak ditemukan!
    echo.
    echo Download dan install dari: https://nodejs.org
    echo Pilih versi LTS ^(Long Term Support^)
    echo.
    echo Setelah install, restart Command Prompt dan jalankan lagi installer ini.
    pause
    exit /b 1
)

echo [OK] Node.js ditemukan
node --version

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm tidak ditemukan!
    pause
    exit /b 1
)

echo [OK] npm ditemukan
npm --version

echo.
echo [INFO] Installing puppeteer...
call npm install puppeteer --save

echo.
echo [INFO] Installing puppeteer-extra and stealth plugin...
call npm install puppeteer-extra puppeteer-extra-plugin-stealth --save

echo.
if not exist "config.env" (
    if exist "config.env.template" (
        copy "config.env.template" "config.env"
        echo [OK] config.env created from template
    ) else (
        echo [WARN] config.env.template not found
    )
)

if not exist "debug" mkdir debug

echo.
echo ==========================================
echo    Installation Complete!
echo ==========================================
echo.
echo NEXT STEPS:
echo 1. Edit config.env dengan User ID dan PIN BCA Anda
echo 2. Pastikan VPN Indonesia aktif
echo 3. Jalankan run-balance-checker.bat untuk testing
echo.
pause
