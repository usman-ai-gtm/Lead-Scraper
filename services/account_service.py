"""
USMAN AI GTM - MULTI-ACCOUNT ROUTING & HEALTH ORCHESTRATION SERVICE
Implements production-grade routing strategies:
- Specific Account Selection
- Round-Robin Rotation
- Least Recently Used (LRU)
- Lowest Daily Usage (Load Balancing)
- Auto-Select with Failover
Strict Rule: Only routes to accounts that are CONNECTED, AUTHORIZED, and ENABLED.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, date

from database.models import AccountRepository
from database.database import get_connection

logger = logging.getLogger("USMAN_ACCOUNT_SERVICE")

class AccountRoutingStrategy:
    ROUND_ROBIN = "Round Robin"
    LEAST_RECENTLY_USED = "Least Recently Used"
    LOWEST_USAGE = "Lowest Daily Usage"
    DEFAULT_ACCOUNT = "Default Account"
    SPECIFIC = "Specific Account"

class AccountOrchestrationService:
    """
    Coordinates account routing, health validation, and multi-sender load balancing.
    """

    @classmethod
    def get_healthy_accounts(cls, workspace_id: int = 1, account_type: str = "email") -> List[Dict[str, Any]]:
        """
        Returns all accounts that are ENABLED, CONNECTED, and ready for dispatch.
        """
        accounts = AccountRepository.get_accounts(workspace_id=workspace_id, account_type=account_type)
        return [a for a in accounts if a.get("is_enabled", 1) and a.get("status") == "CONNECTED"]

    @classmethod
    def select_sender_account(
        cls,
        workspace_id: int = 1,
        account_type: str = "email",
        strategy: str = AccountRoutingStrategy.DEFAULT_ACCOUNT,
        preferred_account_id: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Selects optimal sender account based on configured strategy and health state.
        Never selects degraded or disconnected accounts.
        """
        healthy_accounts = cls.get_healthy_accounts(workspace_id, account_type)
        if not healthy_accounts:
            # Check if any accounts exist at all
            all_accs = AccountRepository.get_accounts(workspace_id, account_type)
            if all_accs:
                logger.warning(f"No CONNECTED healthy accounts found out of {len(all_accs)} registered accounts.")
            return None

        # 1. Specific account requested
        if preferred_account_id:
            for acc in healthy_accounts:
                if acc["id"] == preferred_account_id:
                    return acc
            logger.warning(f"Preferred account #{preferred_account_id} is not CONNECTED or healthy. Falling back to policy.")

        # 2. Lowest Usage (load balancing sends today)
        if strategy == AccountRoutingStrategy.LOWEST_USAGE:
            today_str = date.today().isoformat()
            conn = get_connection()
            # Find usage for today
            acc_usage_map = {}
            for acc in healthy_accounts:
                row = conn.execute(
                    "SELECT messages_sent FROM account_usage WHERE account_id = ? AND usage_date = ?",
                    (acc["id"], today_str)
                ).fetchone()
                acc_usage_map[acc["id"]] = row["messages_sent"] if row else 0
            conn.close()

            # Sort by lowest messages_sent
            sorted_by_usage = sorted(healthy_accounts, key=lambda a: acc_usage_map.get(a["id"], 0))
            return sorted_by_usage[0]

        # 3. Least Recently Used (LRU)
        if strategy == AccountRoutingStrategy.LEAST_RECENTLY_USED:
            # Sort by last_used_at ascending (None first)
            def lru_key(a):
                used = a.get("last_used_at")
                return used if used else "1970-01-01T00:00:00"

            sorted_by_lru = sorted(healthy_accounts, key=lru_key)
            return sorted_by_lru[0]

        # 4. Round Robin (by id sequence or usage)
        if strategy == AccountRoutingStrategy.ROUND_ROBIN:
            # Deterministic rotation based on usage
            today_str = date.today().isoformat()
            conn = get_connection()
            acc_usage_map = {}
            for acc in healthy_accounts:
                row = conn.execute(
                    "SELECT messages_sent FROM account_usage WHERE account_id = ? AND usage_date = ?",
                    (acc["id"], today_str)
                ).fetchone()
                acc_usage_map[acc["id"]] = row["messages_sent"] if row else 0
            conn.close()
            sorted_accs = sorted(healthy_accounts, key=lambda a: (acc_usage_map.get(a["id"], 0), a["id"]))
            return sorted_accs[0]

        # 5. Default Account (fallback)
        for acc in healthy_accounts:
            if acc.get("is_default"):
                return acc

        return healthy_accounts[0]

    @classmethod
    def check_all_account_health(cls, workspace_id: int = 1) -> List[Dict[str, Any]]:
        """
        Executes live health checks on all registered accounts and updates their database status.
        """
        from services.gmail_service import GmailService
        from services.whatsapp_service import WhatsAppOfficialService
        from services.smtp_service import SMTPService

        accounts = AccountRepository.get_accounts(workspace_id=workspace_id)
        results = []

        for acc in accounts:
            acc_id = acc["id"]
            provider = acc["provider"]
            status = acc["status"]

            if status == "DISCONNECTED" or not acc.get("is_enabled", 1):
                results.append({"id": acc_id, "name": acc["display_name"], "status": status, "message": "Account is disabled/disconnected."})
                continue

            if provider == "gmail":
                h_res = GmailService.test_account_health(acc_id)
                results.append({"id": acc_id, "name": acc["display_name"], "provider": provider, **h_res})
            elif provider == "meta_whatsapp":
                extra = acc.get("extra_config", {})
                phone_id = extra.get("phone_number_id") or acc.get("external_account_id")
                cred = AccountRepository.get_credentials(acc_id)
                token = cred.get("access_token") if cred else ""
                h_res = WhatsAppOfficialService.test_meta_connection(phone_id, token)
                AccountRepository.update_status(acc_id, h_res["status"], h_res.get("message") if not h_res["success"] else None)
                results.append({"id": acc_id, "name": acc["display_name"], "provider": provider, **h_res})
            elif provider == "smtp":
                extra = acc.get("extra_config", {})
                host = extra.get("host") or "smtp.gmail.com"
                port = int(extra.get("port") or 587)
                cred = AccountRepository.get_credentials(acc_id)
                pw = cred.get("access_token") if cred else ""
                user = extra.get("username") or acc["external_identity"]
                h_res = SMTPService.test_connection(host, port, user, pw)
                AccountRepository.update_status(acc_id, h_res["status"], h_res.get("message") if not h_res["success"] else None)
                results.append({"id": acc_id, "name": acc["display_name"], "provider": provider, **h_res})

        return results
