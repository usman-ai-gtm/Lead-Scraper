"""
Pydantic Schemas for Authentication, Users, Workspaces, and ICP
"""

from typing import Optional, List
from pydantic import BaseModel

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str
    company: Optional[str] = "Independent"
    workspace_name: Optional[str] = "My Sales Workspace"

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class GoogleVerifyRequest(BaseModel):
    email: str
    full_name: Optional[str] = "Google User"
    picture: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    company: Optional[str] = None
    role: str
    workspace_id: int
    tenant_id: int

class WorkspaceOut(BaseModel):
    id: int
    name: str
    plan: str
    ai_credits: int
    search_credits: int
    created_at: str

class WorkspaceSwitchRequest(BaseModel):
    workspace_id: int

class IdealCustomerProfileSchema(BaseModel):
    business_name: str
    offering: str
    website: Optional[str] = ""
    target_industries: Optional[str] = ""
    target_company_sizes: Optional[str] = ""
    target_locations: Optional[str] = ""
    target_roles: Optional[str] = ""
    problems_solved: Optional[str] = ""
    excluded_industries: Optional[str] = ""
    additional_instructions: Optional[str] = ""

TokenResponse.model_rebuild()
