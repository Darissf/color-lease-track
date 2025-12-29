@echo off
REM ============================================
REM BCA Scraper Windows - Run Script v4.2.0
REM ============================================

echo.
echo ============================================
echo    BCA Scraper Windows v4.2.0 STEALTH
echo ============================================
echo.
echo Starting scraper with anti-detection...
echo Press Ctrl+C to stop.
echo.

cd /d "%~dp0"
node bca-scraper-windows.js

echo.
echo Scraper stopped.
pause
