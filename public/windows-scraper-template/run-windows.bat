@echo off
REM ============================================
REM BCA Scraper Windows - Run Script
REM ============================================

echo.
echo ============================================
echo    BCA Scraper Windows v4.1.7
echo ============================================
echo.
echo Starting scraper...
echo Press Ctrl+C to stop.
echo.

cd /d "%~dp0"
node bca-scraper-windows.js

echo.
echo Scraper stopped.
pause
