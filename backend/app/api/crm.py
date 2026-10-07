"""
USMAN AI GTM - CRM & Pipeline API Endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from pydantic import BaseModel

from backend.app.schemas.crm import DealCreateRequest, CompanyCreateRequest, ContactCreateRequest
from backend.app.services.crm_service import CRMService
from backend.app.core.security import get_current_user

router = APIRouter(prefix="/crm", tags=["CRM & Pipeline"])

class StageUpdateRequest(BaseModel):
    stage: str

@router.get("/pipeline")
def get_pipeline(current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id") or 1
    return CRMService.get_pipeline(workspace_id=ws_id)

@router.post("/deals")
def create_deal(
    req: DealCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id") or req.workspace_id or 1
    new_id = CRMService.create_deal(req.model_dump(), workspace_id=ws_id)
    return {"status": "success", "deal_id": new_id, "message": "Deal created successfully"}

@router.put("/deals/{deal_id}/stage")
def update_deal_stage(
    deal_id: int,
    req: StageUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    CRMService.update_deal_stage(deal_id, req.stage)
    return {"status": "success", "message": f"Deal #{deal_id} moved to {req.stage}"}

@router.get("/companies")
def list_companies(current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id") or 1
    return CRMService.get_companies(workspace_id=ws_id)

@router.get("/contacts")
def list_contacts(current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id") or 1
    return CRMService.get_contacts(workspace_id=ws_id)

@router.get("/deals")
def list_deals(current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id") or 1
    return CRMService.get_deals(workspace_id=ws_id)
