"""
USMAN AI GTM - AI Copilot & Universal Search API Endpoints
"""

from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List

from backend.app.schemas.copilot import CopilotChatRequest, CopilotChatResponse, UniversalSearchResult
from backend.app.services.copilot_service import CopilotService
from backend.app.core.security import get_current_user

router = APIRouter(prefix="/copilot", tags=["AI Copilot & Search"])

@router.post("/chat", response_model=CopilotChatResponse)
def copilot_chat(
    req: CopilotChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id") or req.workspace_id or 1
    result = CopilotService.process_chat(req.message, workspace_id=ws_id)
    return CopilotChatResponse(**result)

@router.get("/search", response_model=List[UniversalSearchResult])
def universal_search(
    q: str = Query("", description="Universal query across pages, leads, and deals"),
    limit: int = Query(8, ge=1, le=25),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id") or 1
    results = CopilotService.universal_search(q, workspace_id=ws_id, limit=limit)
    return [UniversalSearchResult(**r) for r in results]
