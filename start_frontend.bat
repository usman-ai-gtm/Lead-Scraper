@echo off
title USMAN AI GTM - Next.js Website & SaaS
cd /d "%~dp0"
if exist "%LOCALAPPDATA%\Programs\nodejs" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
if exist "C:\Program Files\nodejs" set "PATH=C:\Program Files\nodejs;%PATH%"

echo ===================================================
echo Starting USMAN AI GTM SaaS Website (Next.js 14)
echo URL: http://localhost:3000
echo App: http://localhost:3000/app
echo ===================================================
call npm run dev
pause
