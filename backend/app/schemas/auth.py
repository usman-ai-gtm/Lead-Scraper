"""
Pydantic Schemas for Authentication, Users, and Workspaces
"""

from typing import Optional, List
from pydantic import BaseModel, EmailStr

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

TokenResponse.model_rebuild()
