@echo off
title USMAN AI GTM - Backend API Server
cd /d "%~dp0"
echo ===================================================
echo Starting USMAN AI GTM Backend API Server (FastAPI)
echo URL: http://127.0.0.1:8000
echo Docs: http://127.0.0.1:8000/docs
echo ===================================================
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
pause
