"""
USMAN AI GTM - Multi-AI Provider Manager & 29-API Health Service
Manages provider configuration, health monitoring, latency testing,
and safe key masking across all 29 AI and Search providers.
"""

import time
import logging
from typing import Dict, Any, List, Optional
from backend.app.core.database import get_db_connection

logger = logging.getLogger("USMAN_PROVIDERS_SERVICE")

class ProvidersService:

    @classmethod
    def get_providers(cls) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        rows = conn.execute('''
            SELECT id, provider_name, provider_type, model_name, api_key, enabled, priority,
                   success_count, failure_count, latency, status, last_success, last_failure
            FROM provider_config
            ORDER BY priority ASC, id ASC
        ''').fetchall()
        conn.close()

        providers = []
        for r in rows:
            p = dict(r)
            raw_key = p.get("api_key") or ""
            # Mask API key for secure frontend display (Zero Plaintext Secrets)
            if len(raw_key) > 8:
                p["masked_key"] = f"{raw_key[:4]}••••••••{raw_key[-4:]}"
            elif raw_key:
                p["masked_key"] = "••••••••"
            else:
                p["masked_key"] = "Not Configured"
            p["has_key"] = bool(raw_key.strip())
            p.pop("api_key", None) # Never leak raw key in API response
            providers.append(p)

        return providers

    @classmethod
    def update_provider_key(cls, provider_id: int, api_key: str, model_name: Optional[str] = None) -> bool:
        conn = get_db_connection()
        cur = conn.cursor()
        if model_name:
            cur.execute('''
                UPDATE provider_config 
                SET api_key = ?, model_name = ?, status = 'Configured'
                WHERE id = ?
            ''', (api_key.strip(), model_name, provider_id))
        else:
            cur.execute('''
                UPDATE provider_config 
                SET api_key = ?, status = 'Configured'
                WHERE id = ?
            ''', (api_key.strip(), provider_id))
        conn.commit()
        conn.close()
        return True

    @classmethod
    def test_provider(cls, provider_id: int) -> Dict[str, Any]:
        """
        Runs a genuine bounded health probe against provider endpoint without incurring token generation costs.
        Distinguishes: NOT_CONFIGURED, OPERATIONAL, AUTH_FAILED, RATE_LIMITED, TIMEOUT, and FAILED.
        Never reveals API keys in responses or error logs.
        """
        import requests

        conn = get_db_connection()
        p = conn.execute("SELECT * FROM provider_config WHERE id = ?", (provider_id,)).fetchone()
        if not p:
            conn.close()
            return {"status": "FAILED", "message": "Provider not found"}

        p_name = p["provider_name"]
        raw_key = (p["api_key"] or "").strip()

        # If no key configured, report honestly
        if not raw_key:
            cur = conn.cursor()
            cur.execute('''
                UPDATE provider_config 
                SET latency = 0, status = 'NOT_CONFIGURED', last_failure = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (provider_id,))
            conn.commit()
            conn.close()
            return {
                "provider_name": p_name,
                "status": "NOT_CONFIGURED",
                "latency_ms": 0,
                "message": f"Provider '{p_name}' has no API key configured."
            }

        start_time = time.time()
        health_status = "FAILED"
        detail_msg = ""
        p_name_lower = p_name.lower()

        try:
            # Dispatch provider-specific zero-cost bounded probe (timeout=4.0s)
            if "serper" in p_name_lower:
                # Serper credits endpoint is zero-cost account ping
                resp = requests.post(
                    "https://google.serper.dev/credits",
                    headers={"X-API-KEY": raw_key, "Content-Type": "application/json"},
                    timeout=4.0
                )
                if resp.status_code == 200:
                    health_status = "OPERATIONAL"
                elif resp.status_code in (401, 403):
                    health_status = "AUTH_FAILED"
                elif resp.status_code == 429:
                    health_status = "RATE_LIMITED"
                else:
                    health_status = "FAILED"

            elif "serpapi" in p_name_lower:
                resp = requests.get(
                    "https://serpapi.com/account.json",
                    params={"api_key": raw_key},
                    timeout=4.0
                )
                if resp.status_code == 200:
                    health_status = "OPERATIONAL"
                elif resp.status_code in (401, 403):
                    health_status = "AUTH_FAILED"
                elif resp.status_code == 429:
                    health_status = "RATE_LIMITED"
                else:
                    health_status = "FAILED"

            elif "groq" in p_name_lower:
                resp = requests.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {raw_key}"},
                    timeout=4.0
                )
                if resp.status_code == 200:
                    health_status = "OPERATIONAL"
                elif resp.status_code in (401, 403):
                    health_status = "AUTH_FAILED"
                elif resp.status_code == 429:
                    health_status = "RATE_LIMITED"
                else:
                    health_status = "FAILED"

            elif "openrouter" in p_name_lower:
                resp = requests.get(
                    "https://openrouter.ai/api/v1/auth/key",
                    headers={"Authorization": f"Bearer {raw_key}"},
                    timeout=4.0
                )
                if resp.status_code == 200:
                    health_status = "OPERATIONAL"
                elif resp.status_code in (401, 403):
                    health_status = "AUTH_FAILED"
                elif resp.status_code == 429:
                    health_status = "RATE_LIMITED"
                else:
                    health_status = "FAILED"

            elif "gemini" in p_name_lower:
                resp = requests.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={raw_key}",
                    timeout=4.0
                )
                if resp.status_code == 200:
                    health_status = "OPERATIONAL"
                elif resp.status_code in (400, 401, 403):
                    health_status = "AUTH_FAILED"
                elif resp.status_code == 429:
                    health_status = "RATE_LIMITED"
                else:
                    health_status = "FAILED"

            elif "deepseek" in p_name_lower:
                resp = requests.get(
                    "https://api.deepseek.com/models",
                    headers={"Authorization": f"Bearer {raw_key}"},
                    timeout=4.0
                )
                if resp.status_code == 200:
                    health_status = "OPERATIONAL"
                elif resp.status_code in (401, 403):
                    health_status = "AUTH_FAILED"
                elif resp.status_code == 429:
                    health_status = "RATE_LIMITED"
                else:
                    health_status = "FAILED"

            elif "cohere" in p_name_lower:
                resp = requests.get(
                    "https://api.cohere.com/v1/models",
                    headers={"Authorization": f"Bearer {raw_key}"},
                    timeout=4.0
                )
                if resp.status_code == 200:
                    health_status = "OPERATIONAL"
                elif resp.status_code in (401, 403):
                    health_status = "AUTH_FAILED"
                elif resp.status_code == 429:
                    health_status = "RATE_LIMITED"
                else:
                    health_status = "FAILED"

            elif "cerebras" in p_name_lower:
                resp = requests.get(
                    "https://api.cerebras.ai/v1/models",
                    headers={"Authorization": f"Bearer {raw_key}"},
                    timeout=4.0
                )
                if resp.status_code == 200:
                    health_status = "OPERATIONAL"
                elif resp.status_code in (401, 403):
                    health_status = "AUTH_FAILED"
                else:
                    health_status = "FAILED"

            elif "sambanova" in p_name_lower:
                resp = requests.get(
                    "https://api.sambanova.ai/v1/models",
                    headers={"Authorization": f"Bearer {raw_key}"},
                    timeout=4.0
                )
                if resp.status_code == 200:
                    health_status = "OPERATIONAL"
                elif resp.status_code in (401, 403):
                    health_status = "AUTH_FAILED"
                else:
                    health_status = "FAILED"

            else:
                # For remaining providers with configured keys, perform basic format validation
                if len(raw_key) >= 16:
                    health_status = "CONFIGURED_UNTESTED"
                    detail_msg = "Provider key configured; live probe endpoint not mapped."
                else:
                    health_status = "AUTH_FAILED"
                    detail_msg = "Invalid key length or format."

        except requests.Timeout:
            health_status = "TIMEOUT"
            detail_msg = "Network probe timed out after 4 seconds."
        except requests.RequestException as re:
            health_status = "FAILED"
            detail_msg = "Network connectivity error during provider probe."
        except Exception as e:
            health_status = "FAILED"
            detail_msg = "Unexpected error during health verification."

        latency = round((time.time() - start_time) * 1000, 1)

        cur = conn.cursor()
        if health_status == "OPERATIONAL":
            cur.execute('''
                UPDATE provider_config 
                SET latency = ?, status = 'OPERATIONAL', success_count = success_count + 1, last_success = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (latency, provider_id))
        else:
            cur.execute('''
                UPDATE provider_config 
                SET latency = ?, status = ?, failure_count = failure_count + 1, last_failure = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (latency, health_status, provider_id))
        conn.commit()
        conn.close()

        msg = f"Provider '{p_name}' health check: {health_status}."
        if detail_msg:
            msg += f" ({detail_msg})"

        return {
            "provider_name": p_name,
            "status": health_status,
            "latency_ms": latency,
            "message": msg
        }
