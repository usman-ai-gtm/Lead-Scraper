"""
Pydantic Schemas for AI Copilot, Global Search, and Autonomous Workflows
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class CopilotMessage(BaseModel):
    role: str # 'user' or 'assistant'
    content: str
    timestamp: Optional[str] = None
    structured_data: Optional[Dict[str, Any]] = None

class CopilotChatRequest(BaseModel):
    message: str
    history: Optional[List[CopilotMessage]] = None
    workspace_id: Optional[int] = 1

class CopilotChatResponse(BaseModel):
    reply: str
    action_suggested: Optional[str] = None
    action_payload: Optional[Dict[str, Any]] = None
    data_points: Optional[Dict[str, Any]] = None

class UniversalSearchRequest(BaseModel):
    query: str
    workspace_id: Optional[int] = 1
    limit: int = 10

class UniversalSearchResult(BaseModel):
    id: str
    category: str # 'leads', 'deals', 'companies', 'campaigns', 'pages', 'settings'
    title: str
    subtitle: Optional[str] = ""
    url: str
    badge: Optional[str] = None
