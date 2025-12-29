@echo off
title BCA Balance Checker

echo ==========================================
echo    BCA Balance Checker v1.0.3
echo ==========================================
echo.

cd /d "%~dp0"

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js tidak ditemukan!
    echo Install dari https://nodejs.org
    pause
    exit /b 1
)

REM Check if balance checker script exists
if not exist "bca-balance-checker.js" (
    echo [ERROR] bca-balance-checker.js tidak ditemukan!
    echo Download ulang package dari dashboard.
    pause
    exit /b 1
)

REM Check config
if not exist "config.env" (
    echo [ERROR] config.env tidak ditemukan!
    echo Jalankan install-windows.bat terlebih dahulu.
    pause
    exit /b 1
)

echo [INFO] Starting BCA Balance Checker...
echo [INFO] Press Ctrl+C to stop.
echo.

node bca-balance-checker.js

echo.
echo [INFO] Balance Checker stopped.
pause
