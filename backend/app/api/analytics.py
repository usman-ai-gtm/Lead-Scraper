"""
USMAN AI GTM - Analytics & Metrics API Endpoints
"""

from fastapi import APIRouter, Depends
from typing import Dict, Any

from backend.app.schemas.analytics import DashboardStatsResponse
from backend.app.services.analytics_service import AnalyticsService
from backend.app.core.security import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics & Telemetry"])

@router.get("/dashboard", response_model=DashboardStatsResponse)
def get_dashboard_metrics(current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id") or 1
    metrics = AnalyticsService.get_dashboard_metrics(workspace_id=ws_id)
    return DashboardStatsResponse(**metrics)
