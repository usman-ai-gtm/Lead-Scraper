"""
Pydantic Schemas for CRM, Pipeline, Deals, Contacts, and Activities
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class DealCreateRequest(BaseModel):
    title: str
    company_id: Optional[int] = None
    contact_id: Optional[int] = None
    lead_id: Optional[int] = None
    stage: str = "NEW"
    amount: float = 0.0
    expected_close_date: Optional[str] = None
    win_probability: Optional[int] = 50
    owner_id: Optional[int] = 1
    workspace_id: Optional[int] = 1

class DealUpdateRequest(BaseModel):
    title: Optional[str] = None
    stage: Optional[str] = None
    amount: Optional[float] = None
    expected_close_date: Optional[str] = None
    win_probability: Optional[int] = None
    status: Optional[str] = None

class ContactCreateRequest(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company_id: Optional[int] = None
    is_decision_maker: bool = False
    linkedin_url: Optional[str] = None
    workspace_id: Optional[int] = 1

class CompanyCreateRequest(BaseModel):
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[int] = 0
    annual_revenue_est: Optional[float] = 0.0
    country: Optional[str] = None
    city: Optional[str] = None
    website: Optional[str] = None
    status: Optional[str] = "Prospect"
    workspace_id: Optional[int] = 1

class ActivityCreateRequest(BaseModel):
    entity_type: str # 'deal', 'company', 'contact', 'lead'
    entity_id: int
    activity_type: str # 'Call', 'Meeting', 'Email', 'Note', 'Task', 'WhatsApp'
    subject: str
    description: Optional[str] = ""
    status: Optional[str] = "Completed"
    workspace_id: Optional[int] = 1
