"""
USMAN AI GTM - Multi-AI Provider Health & 29-API Registry Endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from backend.app.services.providers_service import ProvidersService
from backend.app.core.security import get_current_user, require_role

router = APIRouter(prefix="/providers", tags=["Multi-AI Providers"])

class UpdateKeyRequest(BaseModel):
    api_key: str
    model_name: Optional[str] = None

@router.get("")
@router.get("/health")
def list_providers(current_user: Dict[str, Any] = Depends(get_current_user)):
    return ProvidersService.get_providers()

@router.post("/{provider_id}/key")
def update_provider_key(
    provider_id: int,
    req: UpdateKeyRequest,
    current_user: Dict[str, Any] = Depends(require_role(["ADMIN"]))
):
    ProvidersService.update_provider_key(provider_id, req.api_key, req.model_name)
    return {"status": "success", "message": f"Provider #{provider_id} credentials updated securely"}

@router.post("/{provider_id}/test")
def test_provider(provider_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    return ProvidersService.test_provider(provider_id)
