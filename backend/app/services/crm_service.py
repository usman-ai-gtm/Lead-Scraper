"""
USMAN AI GTM - Enterprise CRM Service
Handles Deals, Kanban Pipeline, Companies, Contacts, and Unified Omnichannel Timeline.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.app.core.database import get_db_connection, execute_query, execute_write

logger = logging.getLogger("USMAN_CRM_SERVICE")

CRM_STAGES = [
    "New Lead",
    "Qualified",
    "Contacted",
    "Replied",
    "Meeting",
    "Opportunity",
    "Won",
    "Lost"
]

class CRMService:

    @classmethod
    def get_pipeline(cls, workspace_id: int = 1) -> Dict[str, Any]:
        """
        Returns full Kanban pipeline with grouped deals by stage.
        Strictly honest: never seeds synthetic deals.
        """
        conn = get_db_connection()
        deals_raw = conn.execute('''
            SELECT d.*, c.name as company_name, COALESCE(ct.full_name, ct.first_name || ' ' || COALESCE(ct.last_name, '')) as contact_name
            FROM crm_deals d
            LEFT JOIN companies c ON d.company_id = c.id
            LEFT JOIN contacts ct ON d.contact_id = ct.id
            WHERE d.workspace_id = ?
            ORDER BY d.id DESC
        ''', (workspace_id,)).fetchall()
        conn.close()

        # Map canonical stage names case-insensitively
        stage_map = {s.upper(): s for s in CRM_STAGES}
        kanban: Dict[str, List[Dict[str, Any]]] = {stage: [] for stage in CRM_STAGES}
        total_value = 0.0
        won_value = 0.0

        for r in deals_raw:
            d = dict(r)
            raw_stage = (d.get("stage") or "New Lead").upper()
            canonical_stage = stage_map.get(raw_stage, "New Lead")
            kanban[canonical_stage].append(d)
            amt = float(d.get("amount") or 0.0)
            total_value += amt
            if canonical_stage == "Won":
                won_value += amt

        return {
            "stages": CRM_STAGES,
            "kanban": kanban,
            "total_deals": sum(len(v) for v in kanban.values()),
            "pipeline_value": total_value,
            "won_revenue": won_value
        }

    @classmethod
    def create_deal(cls, data: Dict[str, Any], workspace_id: int = 1) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        amt = float(data.get("amount", 0.0))
        prob = int(data.get("probability", data.get("win_probability", 50)))
        exp_val = round(amt * (prob / 100.0), 2)
        sql = '''
            INSERT INTO crm_deals (workspace_id, title, stage, amount, currency, probability, expected_value, expected_close_date, company_id, contact_id, lead_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?, ?)
        '''
        params = (
            workspace_id,
            data.get("title", "New Enterprise Opportunity"),
            data.get("stage", "NEW").upper(),
            amt,
            prob,
            exp_val,
            data.get("expected_close_date", "2026-12-31"),
            data.get("company_id"),
            data.get("contact_id"),
            data.get("lead_id"),
            now_iso,
            now_iso
        )
        return execute_write(sql, params)

    @classmethod
    def update_deal_stage(cls, deal_id: int, new_stage: str) -> bool:
        stage = new_stage.upper()
        now_iso = datetime.now(timezone.utc).isoformat()
        execute_write('''
            UPDATE crm_deals SET stage = ?, updated_at = ? WHERE id = ?
        ''', (stage, now_iso, deal_id))
        return True

    @classmethod
    def get_companies(cls, workspace_id: int = 1) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        rows = conn.execute("SELECT * FROM companies WHERE workspace_id = ? ORDER BY id DESC LIMIT 50", (workspace_id,)).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    @classmethod
    def get_contacts(cls, workspace_id: int = 1) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        rows = conn.execute('''
            SELECT c.*, comp.name as company_name 
            FROM contacts c 
            LEFT JOIN companies comp ON c.company_id = comp.id
            WHERE c.workspace_id = ? 
            ORDER BY c.id DESC LIMIT 50
        ''', (workspace_id,)).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    @classmethod
    def get_deals(cls, workspace_id: int = 1) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        rows = conn.execute('''
            SELECT d.*, c.name as company_name, COALESCE(ct.full_name, ct.first_name || ' ' || COALESCE(ct.last_name, '')) as contact_name
            FROM crm_deals d
            LEFT JOIN companies c ON d.company_id = c.id
            LEFT JOIN contacts ct ON d.contact_id = ct.id
            WHERE d.workspace_id = ?
            ORDER BY d.id DESC
        ''', (workspace_id,)).fetchall()
        conn.close()
        return [dict(r) for r in rows]
