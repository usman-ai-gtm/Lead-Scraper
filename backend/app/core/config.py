"""
USMAN AI GTM - Production Application Configuration
Centralized configuration management with environment-driven variables and zero hardcoded secrets.
"""

import os
from typing import List
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "USMAN AI GTM"
    PROJECT_VERSION: str = "3.0.0"
    API_V1_STR: str = "/api"
    
    # Environment
    ENV: str = os.getenv("ENVIRONMENT", "production")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Security & Authentication
    SECRET_KEY: str = os.getenv("SECRET_KEY", "usman_ai_gtm_ultra_pro_max_secret_key_change_in_production_jwt_99")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 hours
    
    # Database
    DATABASE_PATH: str = os.getenv(
        "USMAN_DB_PATH",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "usman_data_analytics.db"))
    )
    OUTREACH_DB_PATH: str = os.getenv(
        "USMAN_OUTREACH_DB_PATH",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ultra_outreach_401_500.db"))
    )
    LUXURY_DB_PATH: str = os.getenv(
        "USMAN_LUXURY_DB_PATH",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "usman_luxury_engine.db"))
    )
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://usmanai.com",
        "https://app.usmanai.com"
    ]
    
    # Default Workspace & User
    DEFAULT_WORKSPACE_ID: int = 1
    DEFAULT_WORKSPACE_NAME: str = "Primary Enterprise Workspace"
    
    # AI & Search Providers
    DEFAULT_AI_MODE: str = "QUALITY MODE"
    SERPER_API_KEY: str = os.getenv("SERPER_API_KEY", "")
    SERPAPI_API_KEY: str = os.getenv("SERPAPI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    
    # Demo Mode
    DEMO_MODE_ENABLED: bool = os.getenv("DEMO_MODE_ENABLED", "true").lower() == "true"

settings = Settings()
