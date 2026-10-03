"""
USMAN AI GTM - AI Research Studio API Endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any

from backend.app.schemas.leads import AIResearchRequest, AIResearchResponse
from backend.app.services.research_service import ResearchService
from backend.app.core.security import get_current_user

router = APIRouter(prefix="/research", tags=["AI Research Studio"])

@router.post("", response_model=AIResearchResponse)
def perform_research(
    req: AIResearchRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id") or req.workspace_id or 1
    result = ResearchService.perform_research(
        company_name=req.company_name,
        website=req.website,
        lead_id=req.lead_id,
        workspace_id=ws_id
    )
    return AIResearchResponse(**result)
