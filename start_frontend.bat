@echo off
title USMAN AI GTM - Next.js Website & SaaS
cd /d "%~dp0frontend"
set "PATH=C:\Users\hp\AppData\Local\Programs\nodejs;%PATH%"
echo ===================================================
echo Starting USMAN AI GTM SaaS Website (Next.js 14)
echo URL: http://localhost:3000
echo App: http://localhost:3000/app
echo ===================================================
call npm run dev
pause
