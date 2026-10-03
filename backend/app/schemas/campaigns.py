"""
Pydantic Schemas for Campaigns, Outreach, Email, WhatsApp, and Connected Accounts
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class CampaignCreateRequest(BaseModel):
    name: str
    channel: str = "email" # 'email', 'whatsapp', 'omnichannel'
    account_id: Optional[int] = None
    audience_filter: Optional[Dict[str, Any]] = None
    sequence_steps: Optional[List[Dict[str, Any]]] = None # [{day: 1, subject: "...", body: "..."}]
    daily_limit: int = 50
    approval_required: bool = True
    workspace_id: Optional[int] = 1

class CampaignUpdateRequest(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None # 'Draft', 'Active', 'Paused', 'Completed'
    daily_limit: Optional[int] = None
    approval_required: Optional[bool] = None

class ConnectedAccountCreateRequest(BaseModel):
    account_type: str # 'email', 'whatsapp'
    provider: str # 'gmail', 'smtp', 'meta_whatsapp'
    display_name: str
    external_identity: str
    extra_config: Optional[Dict[str, Any]] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    workspace_id: Optional[int] = 1

class TestMessageSendRequest(BaseModel):
    account_id: int
    channel: str # 'email', 'whatsapp'
    recipient: str
    subject: Optional[str] = "USMAN AI GTM - Outbound Connection Test"
    message_body: str = "This is a verified test delivery message from your USMAN AI GTM platform."
    workspace_id: Optional[int] = 1

class WhatsAppSetupWizardRequest(BaseModel):
    display_name: str
    phone_number: str
    phone_number_id: str
    waba_id: str
    permanent_token: str
    workspace_id: Optional[int] = 1
