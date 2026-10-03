"""
Pydantic Schemas for Leads, Search, Discovery, and Intelligence
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class LeadSearchRequest(BaseModel):
    keyword: str
    country: str = "United States"
    city: str = "All Cities"
    platform: str = "All Platforms"
    industry: str = "Any"
    business_type: str = "Any"
    target_count: int = 20
    workspace_id: Optional[int] = 1

class LeadFilterParams(BaseModel):
    workspace_id: Optional[int] = 1
    keyword: Optional[str] = ""
    country: Optional[str] = "Any"
    city: Optional[str] = "Any"
    industry: Optional[str] = "Any"
    min_score: int = 0
    email_required: bool = False
    phone_required: bool = False
    website_required: bool = False
    temperature: Optional[str] = "Any"
    crm_stage: Optional[str] = "Any"
    page: int = 1
    page_size: int = 25

class LeadCreateRequest(BaseModel):
    business_name: str
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    category: Optional[str] = None
    industry: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    ai_summary: Optional[str] = None
    crm_stage: Optional[str] = "Not Contacted"
    lead_score: Optional[int] = 50
    lead_temperature: Optional[str] = "COLD"
    workspace_id: Optional[int] = 1

class LeadUpdateRequest(BaseModel):
    business_name: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    category: Optional[str] = None
    industry: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    crm_stage: Optional[str] = None
    lead_score: Optional[int] = None
    lead_temperature: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None

class LeadBulkActionRequest(BaseModel):
    lead_ids: List[int]
    action: str # "score", "enrich", "validate", "add_to_crm", "delete", "export", "assign_stage"
    target_stage: Optional[str] = None
    target_list: Optional[str] = None

class AIResearchRequest(BaseModel):
    lead_id: Optional[int] = None
    company_name: Optional[str] = None
    website: Optional[str] = None
    workspace_id: Optional[int] = 1

class AIResearchResponse(BaseModel):
    company_name: str
    website: Optional[str]
    overview: str
    business_model: str
    products_services: List[str]
    tech_stack: List[str]
    pain_points: List[str]
    buying_signals: List[str]
    decision_makers: List[Dict[str, Any]]
    suggested_pitch: str
    suggested_email: str
    suggested_whatsapp: str
    intent_score: int
    data_sources: List[str]
