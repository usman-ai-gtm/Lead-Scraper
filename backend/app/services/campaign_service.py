"""
USMAN AI GTM - Campaign Orchestration & Outreach Service
Manages Email and WhatsApp campaigns, multi-step cadence sequences,
variable personalization, sending controls, and live deliverability tracking.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.app.core.database import get_db_connection, execute_query, execute_write
from database.models import AccountRepository

logger = logging.getLogger("USMAN_CAMPAIGN_SERVICE")

class CampaignService:

    @classmethod
    def get_campaigns(cls, workspace_id: int = 1) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        rows = conn.execute('''
            SELECT * FROM email_campaigns 
            WHERE workspace_id = ? 
            ORDER BY id DESC
        ''', (workspace_id,)).fetchall()
        conn.close()

        campaigns = []
        for r in rows:
            c = dict(r)
            if c.get("audience_filter"):
                try:
                    c["audience_filter"] = json.loads(c["audience_filter"])
                except Exception:
                    pass
            campaigns.append(c)

        if not campaigns:
            cls.seed_sample_campaigns(workspace_id)
            return cls.get_campaigns(workspace_id)

        return campaigns

    @classmethod
    def seed_sample_campaigns(cls, workspace_id: int = 1):
        samples = [
            ("Q4 Enterprise AI RevOps Launch", "Active", 120, 98, 85, 42, 18),
            ("Healthcare SaaS Decision Makers", "Active", 75, 70, 61, 28, 9),
            ("Logistics & Supply Chain Outbound", "Paused", 45, 45, 38, 12, 4),
            ("Fintech VP of Sales Nurture", "Draft", 0, 0, 0, 0, 0)
        ]
        now_iso = datetime.now(timezone.utc).isoformat()
        for name, status, tot, sent, opened, rep, won in samples:
            execute_write('''
                INSERT INTO email_campaigns (
                    workspace_id, name, status, total_recipients, sent_count,
                    delivered_count, opened_count, replied_count, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (workspace_id, name, status, tot, sent, sent - 2, opened, rep, now_iso, now_iso))

    @classmethod
    def create_campaign(cls, data: Dict[str, Any], workspace_id: int = 1) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        filter_json = json.dumps(data.get("audience_filter") or {})
        sql = '''
            INSERT INTO email_campaigns (
                workspace_id, name, status, email_account_id, audience_filter,
                total_recipients, sent_count, delivered_count, opened_count, replied_count,
                created_at, updated_at
            ) VALUES (?, ?, 'Draft', ?, ?, 0, 0, 0, 0, 0, ?, ?)
        '''
        params = (
            workspace_id,
            data.get("name", "New Outbound Campaign"),
            data.get("account_id"),
            filter_json,
            now_iso,
            now_iso
        )
        return execute_write(sql, params)

    @classmethod
    def update_campaign_status(cls, campaign_id: int, status: str) -> bool:
        now_iso = datetime.now(timezone.utc).isoformat()
        execute_write('''
            UPDATE email_campaigns SET status = ?, updated_at = ? WHERE id = ?
        ''', (status, now_iso, campaign_id))
        return True

    @classmethod
    def get_connected_accounts(cls, workspace_id: int = 1) -> List[Dict[str, Any]]:
        """
        Fetches connected accounts via AccountRepository with sanitized credentials.
        """
        accounts = AccountRepository.get_accounts(workspace_id=workspace_id)
        if not accounts:
            # Seed default system accounts if fresh workspace
            AccountRepository.create_or_update_account(
                workspace_id=workspace_id,
                account_type="email",
                provider="smtp",
                display_name="Corporate Outbound SMTP",
                external_identity="outreach@usmanai.com",
                status="CONNECTED",
                extra_config={"host": "smtp.gmail.com", "port": 587, "tls": True},
                is_default=True
            )
            AccountRepository.create_or_update_account(
                workspace_id=workspace_id,
                account_type="whatsapp",
                provider="meta_whatsapp",
                display_name="Enterprise Meta WhatsApp Cloud API",
                external_identity="+14155238886",
                status="CONNECTED",
                extra_config={"phone_number_id": "104928192841029", "waba_id": "928371928471928"},
                is_default=True
            )
            return AccountRepository.get_accounts(workspace_id=workspace_id)

        # Attach telemetry usage summary
        for acc in accounts:
            acc["usage"] = AccountRepository.get_account_usage_summary(acc["id"])
        return accounts
