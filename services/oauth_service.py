"""
USMAN AI GTM - OFFICIAL OAUTH 2.0 SERVICE (GMAIL & MICROSOFT)
Implements strictly RFC 6749 compliant OAuth 2.0 flows.
Zero plaintext passwords collected. Google / Microsoft authenticate the user directly.
"""

import os
import json
import secrets
import logging
import requests
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import urlencode

logger = logging.getLogger("USMAN_OAUTH_SERVICE")

# Minimum Practical Google Scopes
DEFAULT_GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.send"
]

EXTENDED_GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose"
]

class GoogleOAuthService:
    """
    Official Google OAuth 2.0 authentication provider.
    """
    AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URI = "https://oauth2.googleapis.com/token"
    USERINFO_URI = "https://www.googleapis.com/oauth2/v2/userinfo"
    REVOKE_URI = "https://oauth2.googleapis.com/revoke"

    @classmethod
    def get_client_credentials(cls) -> Tuple[str, str, str]:
        """
        Retrieves Google OAuth client ID, client secret, and redirect URI
        from environment or Streamlit secrets.
        """
        client_id = os.getenv("GOOGLE_CLIENT_ID", "")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8501")

        if not client_id or not client_secret:
            try:
                import streamlit as st
                if hasattr(st, "secrets") and "google_oauth" in st.secrets:
                    client_id = st.secrets["google_oauth"].get("GOOGLE_CLIENT_ID", client_id)
                    client_secret = st.secrets["google_oauth"].get("GOOGLE_CLIENT_SECRET", client_secret)
                    redirect_uri = st.secrets["google_oauth"].get("GOOGLE_REDIRECT_URI", redirect_uri)
                elif hasattr(st, "secrets"):
                    client_id = st.secrets.get("GOOGLE_CLIENT_ID", client_id)
                    client_secret = st.secrets.get("GOOGLE_CLIENT_SECRET", client_secret)
                    redirect_uri = st.secrets.get("GOOGLE_REDIRECT_URI", redirect_uri)
            except Exception:
                pass

        return client_id.strip(), client_secret.strip(), redirect_uri.strip()

    @classmethod
    def generate_authorization_url(
        cls,
        state: Optional[str] = None,
        scopes: Optional[List[str]] = None,
        login_hint: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Generates official Google OAuth consent URL.
        Returns: (authorization_url, state)
        """
        client_id, _, redirect_uri = cls.get_client_credentials()
        req_state = state or secrets.token_urlsafe(32)
        scope_list = scopes or DEFAULT_GOOGLE_SCOPES

        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(scope_list),
            "access_type": "offline",      # Guarantees refresh token is issued
            "prompt": "consent",           # Forces consent screen to guarantee refresh token
            "state": req_state
        }
        if login_hint:
            params["login_hint"] = login_hint

        auth_url = f"{cls.AUTH_URI}?{urlencode(params)}"
        return auth_url, req_state

    @classmethod
    def exchange_code_for_tokens(cls, code: str) -> Dict[str, Any]:
        """
        Exchanges authorization code for access and refresh tokens.
        """
        client_id, client_secret, redirect_uri = cls.get_client_credentials()
        if not client_id or not client_secret:
            return {
                "success": False,
                "error": "Google OAuth Client ID and Secret are not configured. Please set them in .streamlit/secrets.toml."
            }

        payload = {
            "code": code.strip(),
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }

        try:
            resp = requests.post(cls.TOKEN_URI, data=payload, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "success": True,
                    "access_token": data.get("access_token"),
                    "refresh_token": data.get("refresh_token"),
                    "expires_in": data.get("expires_in", 3600),
                    "scope": data.get("scope", ""),
                    "token_type": data.get("token_type", "Bearer")
                }
            else:
                err_json = resp.json() if "application/json" in resp.headers.get("content-type", "") else {}
                err_desc = err_json.get("error_description") or err_json.get("error") or resp.text
                return {"success": False, "error": f"Google Token Exchange Failed: {err_desc}"}
        except Exception as e:
            return {"success": False, "error": f"Network exception during token exchange: {str(e)}"}

    @classmethod
    def refresh_access_token(cls, refresh_token: str) -> Dict[str, Any]:
        """
        Silently refreshes an expired access token using the stored refresh token.
        """
        client_id, client_secret, _ = cls.get_client_credentials()
        if not client_id or not client_secret:
            return {"success": False, "error": "Google credentials missing."}

        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }

        try:
            resp = requests.post(cls.TOKEN_URI, data=payload, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "success": True,
                    "access_token": data.get("access_token"),
                    "expires_in": data.get("expires_in", 3600),
                    "scope": data.get("scope", "")
                }
            else:
                return {
                    "success": False,
                    "error": "Google authorization expired or was revoked. Please reconnect Gmail."
                }
        except Exception as e:
            return {"success": False, "error": f"Refresh exception: {str(e)}"}

    @classmethod
    def fetch_user_profile(cls, access_token: str) -> Dict[str, Any]:
        """
        Fetches authenticated profile (email, name, picture, sub id).
        """
        headers = {"Authorization": f"Bearer {access_token}"}
        try:
            resp = requests.get(cls.USERINFO_URI, headers=headers, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "success": True,
                    "email": data.get("email"),
                    "name": data.get("name") or data.get("email"),
                    "sub": data.get("id") or data.get("sub"),
                    "picture": data.get("picture", "")
                }
            else:
                return {"success": False, "error": f"Failed to retrieve profile: {resp.text}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @classmethod
    def revoke_token(cls, token: str) -> bool:
        """
        Revokes token with Google upon user disconnect.
        """
        try:
            requests.post(cls.REVOKE_URI, params={"token": token}, timeout=8)
            return True
        except Exception:
            return False

class MicrosoftOAuthService:
    """
    Official Microsoft 365 / Outlook OAuth 2.0 Provider.
    """
    AUTH_URI = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
    TOKEN_URI = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    GRAPH_ME_URI = "https://graph.microsoft.com/v1.0/me"

    DEFAULT_SCOPES = [
        "openid", "profile", "email", "offline_access",
        "https://graph.microsoft.com/Mail.Send"
    ]

    @classmethod
    def get_client_credentials(cls) -> Tuple[str, str, str]:
        client_id = os.getenv("MICROSOFT_CLIENT_ID", "")
        client_secret = os.getenv("MICROSOFT_CLIENT_SECRET", "")
        redirect_uri = os.getenv("MICROSOFT_REDIRECT_URI", "http://localhost:8501")
        return client_id.strip(), client_secret.strip(), redirect_uri.strip()

    @classmethod
    def generate_authorization_url(cls, state: Optional[str] = None) -> Tuple[str, str]:
        client_id, _, redirect_uri = cls.get_client_credentials()
        req_state = state or secrets.token_urlsafe(32)
        params = {
            "client_id": client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "response_mode": "query",
            "scope": " ".join(cls.DEFAULT_SCOPES),
            "state": req_state
        }
        return f"{cls.AUTH_URI}?{urlencode(params)}", req_state
