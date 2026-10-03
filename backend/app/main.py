"""
USMAN AI GTM - Production FastAPI Backend Application
Powers the complete SaaS application with REST APIs, WebSockets,
real authentication, non-destructive database integration, and high-performance routing.
"""

import sys
import os

# Ensure project root is in sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from backend.app.core.config import settings
from backend.app.core.database import init_app_database, get_db_connection
from backend.app.api import (
    auth, leads, research, crm, campaigns, analytics, copilot, providers, features_lab, admin, universal_features, agents, integrations
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("USMAN_API")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Enterprise AI-Powered B2B Revenue Operations, Lead Intelligence & Autonomous GTM Platform",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, lock down to settings.CORS_ORIGINS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Core API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(leads.router, prefix=settings.API_V1_STR)
app.include_router(research.router, prefix=settings.API_V1_STR)
app.include_router(crm.router, prefix=settings.API_V1_STR)
app.include_router(campaigns.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(copilot.router, prefix=settings.API_V1_STR)
app.include_router(providers.router, prefix=settings.API_V1_STR)
app.include_router(features_lab.router, prefix=settings.API_V1_STR)
app.include_router(universal_features.router, prefix=settings.API_V1_STR)
app.include_router(agents.router, prefix=settings.API_V1_STR)
app.include_router(integrations.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def startup_event():
    logger.info("Initializing USMAN AI GTM database and tables...")
    init_app_database()
    logger.info("USMAN AI GTM Backend is running and ready for traffic.")

@app.get("/api/health")
def health_check():
    """
    Production health check monitoring database reachability and version.
    """
    db_ok = False
    try:
        conn = get_db_connection()
        conn.execute("SELECT 1").fetchone()
        conn.close()
        db_ok = True
    except Exception as e:
        logger.error(f"Health check DB error: {e}")

    return {
        "status": "HEALTHY" if db_ok else "DEGRADED",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "database_connected": db_ok,
        "environment": settings.ENV
    }

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """
    Real-time WebSocket connection for live search progress, campaigns, and notifications.
    """
    await websocket.accept()
    try:
        await websocket.send_json({
            "type": "connection_established",
            "message": "Connected to USMAN AI GTM live telemetry stream"
        })
        while True:
            data = await websocket.receive_text()
            # Echo or process incoming commands
            await websocket.send_json({
                "type": "telemetry_ack",
                "received": data
            })
    except WebSocketDisconnect:
        logger.info("Telemetry client disconnected")
