@echo off
title USMAN AI GTM - Backend API Server
cd /d "%~dp0"
if exist "%LOCALAPPDATA%\Programs\Python\Python311" set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"
if exist "C:\Python311" set "PATH=C:\Python311;C:\Python311\Scripts;%PATH%"

echo ===================================================
echo Starting USMAN AI GTM Backend API Server (FastAPI)
echo URL: http://127.0.0.1:8000
echo Docs: http://127.0.0.1:8000/docs
echo ===================================================
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
pause
