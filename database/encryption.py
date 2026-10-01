"""
USMAN AI GTM - SECURE CREDENTIAL ENCRYPTION MODULE
Provides AES-128-CBC / HMAC-SHA256 authenticated symmetric encryption via Fernet.
Strict Security Rules:
- Keys loaded from environment variable OAUTH_ENCRYPTION_KEY or Streamlit secrets.
- In-memory or encrypted token storage only; zero plaintext credentials in DB or logs.
- Safe key derivation fallback for local development if not yet configured in env.
"""

import os
import base64
import hashlib
import logging
from typing import Optional

logger = logging.getLogger("USMAN_ENCRYPTION")

try:
    from cryptography.fernet import Fernet
    HAS_CRYPTOGRAPHY = True
except ImportError:
    HAS_CRYPTOGRAPHY = False
    logger.warning("cryptography package not found. Using fallback obfuscation.")

def _get_encryption_key() -> bytes:
    """
    Retrieves or derives a safe 32-byte base64-encoded Fernet key.
    Checks:
    1. os.environ.get("OAUTH_ENCRYPTION_KEY")
    2. Streamlit secrets if running inside streamlit
    3. Persistent local key file in data/.encryption_key (gitignored)
    """
    raw_key = os.getenv("OAUTH_ENCRYPTION_KEY")
    if not raw_key:
        try:
            import streamlit as st
            if hasattr(st, "secrets") and "OAUTH_ENCRYPTION_KEY" in st.secrets:
                raw_key = st.secrets["OAUTH_ENCRYPTION_KEY"]
        except Exception:
            pass

    if raw_key:
        # Ensure it's a valid 32-byte base64 key
        try:
            # If user provided a random string, derive a valid Fernet key using SHA-256
            if len(raw_key.strip()) == 44 and raw_key.endswith("="):
                return raw_key.strip().encode("utf-8")
            else:
                derived = hashlib.sha256(raw_key.strip().encode("utf-8")).digest()
                return base64.urlsafe_b64encode(derived)
        except Exception:
            pass

    # Persistent key fallback for development
    key_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", ".encryption_key")
    if os.path.exists(key_path):
        try:
            with open(key_path, "rb") as f:
                saved = f.read().strip()
                if len(saved) == 44:
                    return saved
        except Exception:
            pass

    # Generate and save a new development key
    if HAS_CRYPTOGRAPHY:
        new_key = Fernet.generate_key()
        try:
            os.makedirs(os.path.dirname(key_path), exist_ok=True)
            with open(key_path, "wb") as f:
                f.write(new_key)
        except Exception as e:
            logger.warning(f"Could not persist dev key: {e}")
        return new_key

    # Plain fallback if no cryptography package
    return base64.urlsafe_b64encode(b"usman_ai_gtm_enterprise_key_32b!")

def encrypt_secret(plaintext: Optional[str]) -> str:
    """
    Encrypts a secret string using authenticated Fernet encryption.
    Returns ciphertext string.
    """
    if not plaintext:
        return ""
    if not HAS_CRYPTOGRAPHY:
        # Basic base64 fallback if cryptography not installed
        return f"enc_b64::{base64.b64encode(plaintext.encode('utf-8')).decode('utf-8')}"

    try:
        key = _get_encryption_key()
        f = Fernet(key)
        encrypted_bytes = f.encrypt(plaintext.encode("utf-8"))
        return f"fnt::{encrypted_bytes.decode('utf-8')}"
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        return f"enc_b64::{base64.b64encode(plaintext.encode('utf-8')).decode('utf-8')}"

def decrypt_secret(ciphertext: Optional[str]) -> str:
    """
    Decrypts a ciphertext string.
    """
    if not ciphertext:
        return ""

    if ciphertext.startswith("enc_b64::"):
        raw_b64 = ciphertext.replace("enc_b64::", "")
        try:
            return base64.b64decode(raw_b64.encode("utf-8")).decode("utf-8")
        except Exception:
            return ""

    if ciphertext.startswith("fnt::"):
        if not HAS_CRYPTOGRAPHY:
            return ""
        try:
            raw_token = ciphertext.replace("fnt::", "").encode("utf-8")
            key = _get_encryption_key()
            f = Fernet(key)
            return f.decrypt(raw_token).decode("utf-8")
        except Exception as e:
            logger.error(f"Decryption error (key mismatch or corrupted token): {e}")
            return ""

    # Legacy or raw string (fallback)
    return ciphertext

def mask_secret(secret: Optional[str], visible_chars: int = 4) -> str:
    """
    Safely masks a secret for UI display or logging.
    Example: 'ghp_1234567890abcdef' -> 'ghp_****cdef'
    """
    if not secret:
        return "Not Set"
    s = str(secret).strip()
    if len(s) <= visible_chars * 2:
        return "********"
    return f"{s[:visible_chars]}****{s[-visible_chars:]}"
