"""
USMAN AI GTM - Searches & Search History API Router
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Response
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from backend.app.services.search_history_service import SearchHistoryService
from backend.app.core.security import get_current_user

router = APIRouter(prefix="/searches", tags=["Search History"])

def get_effective_workspace_id(current_user: Dict[str, Any], requested_ws_id: Optional[int] = None) -> int:
    user_role = str(current_user.get("role", "USER")).upper()
    user_ws = int(current_user.get("workspace_id", 1))
    if user_role == "ADMIN" and requested_ws_id is not None:
        return int(requested_ws_id)
    return user_ws

class SearchRecordCreateRequest(BaseModel):
    keyword: str
    country: str = "United States"
    city: str = ""
    sources: List[str] = []
    requested_quantity: int = 50
    qualified_leads: List[Dict[str, Any]] = []
    search_record_id: Optional[str] = None
    workspace_id: Optional[int] = None

class ExportHistoryRecordRequest(BaseModel):
    export_target: str
    format: str
    record_count: int
    search_record_id: Optional[str] = None
    export_date_filter: Optional[str] = None
    workspace_id: Optional[int] = None

@router.get("")
def list_search_records(
    date: Optional[str] = None,
    keyword: Optional[str] = None,
    workspace_id: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = get_effective_workspace_id(current_user, workspace_id)
    records = SearchHistoryService.get_search_records(ws_id, date_filter=date, keyword_filter=keyword)
    return {"status": "success", "workspace_id": ws_id, "count": len(records), "records": records}

@router.post("")
def create_search_record(
    req: SearchRecordCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = get_effective_workspace_id(current_user, req.workspace_id)
    user_id = int(current_user.get("id", 1))
    record = SearchHistoryService.create_search_record(
        workspace_id=ws_id,
        user_id=user_id,
        keyword=req.keyword,
        country=req.country,
        city=req.city,
        sources=req.sources,
        requested_quantity=req.requested_quantity,
        qualified_leads=req.qualified_leads,
        search_record_id=req.search_record_id
    )
    return {"status": "success", "message": "Search record and leads saved successfully", "search_record": record}

@router.get("/dates")
def get_search_dates(
    workspace_id: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = get_effective_workspace_id(current_user, workspace_id)
    dates = SearchHistoryService.get_distinct_dates(ws_id)
    return {"status": "success", "workspace_id": ws_id, "dates": dates}

@router.get("/{record_id}")
def get_search_record_detail(
    record_id: str,
    workspace_id: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = get_effective_workspace_id(current_user, workspace_id)
    record = SearchHistoryService.get_search_record_by_id(record_id, ws_id)
    if not record:
        raise HTTPException(status_code=404, detail="Search record not found or access denied")
    return {"status": "success", "workspace_id": ws_id, "search_record": record}

@router.get("/date/{date_str}/leads")
def get_leads_for_date(
    date_str: str,
    workspace_id: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = get_effective_workspace_id(current_user, workspace_id)
    leads = SearchHistoryService.get_leads_for_date(date_str, ws_id)
    return {"status": "success", "workspace_id": ws_id, "date": date_str, "count": len(leads), "leads": leads}
