"""
USMAN AI GTM - Features 501–600 & Ultra Command Center Endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from backend.app.services.features_501_600_service import Features501To600Service
from backend.app.core.security import get_current_user

router = APIRouter(prefix="/features-lab", tags=["Feature Lab (501–600)"])

class ExecuteFeatureRequest(BaseModel):
    params: Optional[Dict[str, Any]] = None

@router.get("/catalog")
def get_catalog(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "categories": Features501To600Service.CATEGORIES,
        "features": Features501To600Service.list_feature_catalog()
    }

@router.post("/{feature_id}/execute")
def execute_feature(
    feature_id: int,
    req: Optional[ExecuteFeatureRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id") or 1
    params = req.params if req else None
    return Features501To600Service.execute_feature(feature_id, workspace_id=ws_id, params=params)
