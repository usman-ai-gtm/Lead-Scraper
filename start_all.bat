@echo off
title USMAN AI GTM - Master Launcher
echo ========================================================
echo   USMAN AI GTM - FULL PRODUCTION WEB APPLICATION
echo ========================================================
echo.
echo [1/2] Starting Python FastAPI Backend Server (Port 8000)...
start "USMAN AI GTM - Backend API" cmd /k "%~dp0start_backend.bat"

echo [2/2] Starting Next.js 14 Frontend Application (Port 3000)...
start "USMAN AI GTM - Frontend SaaS" cmd /k "%~dp0start_frontend.bat"

echo.
echo ========================================================
echo   SUCCESS! Both services have been launched.
echo   - Frontend Website: http://localhost:3000
echo   - App Dashboard:    http://localhost:3000/app
echo   - Backend API Docs: http://127.0.0.1:8000/docs
echo ========================================================
echo.
pause
