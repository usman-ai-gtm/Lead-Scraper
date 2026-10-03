"""
Pydantic Schemas for Analytics, Telemetry, and Dashboard Stats
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class DashboardStatsResponse(BaseModel):
    total_leads: int
    verified_leads: int
    high_intent_leads: int
    active_campaigns: int
    total_emails_sent: int
    open_rate: float
    reply_rate: float
    meetings_booked: int
    pipeline_value: float
    won_revenue: float
    conversion_rate: float
    health_score: int
    lead_growth_series: List[Dict[str, Any]]
    pipeline_by_stage: List[Dict[str, Any]]
    campaign_performance: List[Dict[str, Any]]
    recent_activities: List[Dict[str, Any]]
