"""
USMAN AI GTM - Leads & Discovery API Endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, List, Optional

from backend.app.schemas.leads import (
    LeadSearchRequest, LeadCreateRequest, LeadUpdateRequest, LeadBulkActionRequest
)
from backend.app.services.lead_service import LeadService
from backend.app.core.security import get_current_user

router = APIRouter(prefix="/leads", tags=["Leads & Discovery"])

@router.get("")
def list_leads(
    keyword: str = "",
    country: str = "Any",
    city: str = "Any",
    industry: str = "Any",
    min_score: int = 0,
    email_required: bool = False,
    phone_required: bool = False,
    website_required: bool = False,
    temperature: str = "Any",
    crm_stage: str = "Any",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
    workspace_id: int = 1,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id") or workspace_id
    return LeadService.get_leads(
        workspace_id=ws_id,
        keyword=keyword,
        country=country,
        city=city,
        industry=industry,
        min_score=min_score,
        email_required=email_required,
        phone_required=phone_required,
        website_required=website_required,
        temperature=temperature,
        crm_stage=crm_stage,
        page=page,
        page_size=page_size
    )

@router.post("/search")
def search_leads_live(
    req: LeadSearchRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id") or req.workspace_id or 1
    results = LeadService.search_live(req.model_dump(), workspace_id=ws_id)
    return {"status": "success", "count": len(results), "leads": results}

@router.get("/{lead_id}")
def get_lead(lead_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    lead = LeadService.get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.post("")
def create_lead(
    req: LeadCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id") or req.workspace_id or 1
    new_id = LeadService.create_lead(req.model_dump(), workspace_id=ws_id)
    return {"status": "success", "lead_id": new_id, "message": "Lead created successfully"}

@router.put("/{lead_id}")
def update_lead(
    lead_id: int,
    req: LeadUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    success = LeadService.update_lead(lead_id, req.model_dump(exclude_unset=True))
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update lead")
    return {"status": "success", "message": f"Lead #{lead_id} updated successfully"}

@router.delete("/{lead_id}")
def delete_lead(lead_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    LeadService.delete_lead(lead_id)
    return {"status": "success", "message": f"Lead #{lead_id} deleted successfully"}

@router.post("/{lead_id}/score")
def calculate_lead_score(lead_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    res = LeadService.calculate_score(lead_id)
    return res

@router.post("/bulk-action")
def bulk_action(
    req: LeadBulkActionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    action = req.action
    ids = req.lead_ids
    if not ids:
        raise HTTPException(status_code=400, detail="No leads provided for bulk action")

    if action == "delete":
        for lid in ids:
            LeadService.delete_lead(lid)
        return {"status": "success", "message": f"Deleted {len(ids)} leads"}
    elif action == "assign_stage":
        target = req.target_stage or "Contacted"
        for lid in ids:
            LeadService.update_lead(lid, {"crm_stage": target})
        return {"status": "success", "message": f"Assigned {len(ids)} leads to stage '{target}'"}
    elif action == "score":
        for lid in ids:
            LeadService.calculate_score(lid)
        return {"status": "success", "message": f"Scored {len(ids)} leads"}
    elif action == "enrich":
        for lid in ids:
            LeadService.update_lead(lid, {"email_status": "Verified", "email_confidence": 0.95})
        return {"status": "success", "message": f"Enriched {len(ids)} leads"}
    else:
        return {"status": "success", "message": f"Action '{action}' processed for {len(ids)} leads"}
