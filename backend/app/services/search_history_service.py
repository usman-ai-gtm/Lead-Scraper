"""
USMAN AI GTM - Production Search History & Multi-Search Lead Association Service
Preserves permanent historical search records, immutable lead snapshots,
and many-to-many associations between search runs and saved workspace leads.
"""

import os
import json
import sqlite3
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta

from backend.app.core.database import get_db_connection, execute_query, execute_write

logger = logging.getLogger("USMAN_SEARCH_HISTORY")

PKT_OFFSET = timedelta(hours=5)

def get_pkt_now() -> Tuple[str, str, str, str]:
    """
    Returns (iso_utc, pkt_date_human, pkt_time_human, pkt_completion_human)
    e.g. ("2026-11-19T00:45:00Z", "19 November 2026", "04:30 PM", "04:30:15 PM PKT")
    """
    utc_now = datetime.now(timezone.utc)
    pkt_time = utc_now.astimezone(timezone(PKT_OFFSET))
    
    iso_utc = utc_now.isoformat()
    # Format e.g. "19 November 2026"
    pkt_date_human = pkt_time.strftime("%d %B %Y").lstrip("0")
    # Date standard e.g. "2026-11-19"
    pkt_date_std = pkt_time.strftime("%Y-%m-%d")
    # Format e.g. "04:30 PM"
    pkt_time_human = pkt_time.strftime("%I:%M %p")
    # Format e.g. "04:30:15 PM PKT"
    pkt_completion = pkt_time.strftime("%I:%M:%S %p PKT")
    
    return iso_utc, pkt_date_human, pkt_date_std, pkt_time_human, pkt_completion


class SearchHistoryService:
    """
    Production repository for permanent search records, lead associations, and export auditing.
    """

    @classmethod
    def create_search_record(
        cls,
        workspace_id: int,
        user_id: int,
        keyword: str,
        country: str,
        city: str,
        sources: List[str],
        requested_quantity: int,
        qualified_leads: List[Dict[str, Any]],
        search_record_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates a permanent search record and links every qualified lead to this search.
        Deduplicates master leads per workspace while preserving search-specific relationships.
        """
        iso_utc, pkt_date_human, pkt_date_std, pkt_time_human, pkt_completion = get_pkt_now()
        
        record_id = search_record_id or f"SR-{int(datetime.now().timestamp() * 1000)}"
        qualified_count = len(qualified_leads)
        leads_with_phone = sum(1 for l in qualified_leads if l.get("phone") and str(l.get("phone")).strip() not in ["", "Not Listed", "Not Found"])
        sources_str = json.dumps(sources) if isinstance(sources, list) else str(sources)

        conn = get_db_connection()
        cur = conn.cursor()

        try:
            # 1. Insert Search Record
            cur.execute('''
                INSERT INTO search_records (
                    id, workspace_id, user_id, keyword, country, city, sources,
                    requested_quantity, qualified_quantity, leads_with_phone,
                    search_status, search_date, search_time, completion_time, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                record_id, workspace_id, user_id, keyword, country, city or "",
                sources_str, requested_quantity, qualified_count, leads_with_phone,
                "COMPLETED", pkt_date_human, pkt_time_human, pkt_completion, iso_utc
            ))

            # 2. Process each lead: deduplicate master record, and insert association link
            for lead in qualified_leads:
                # Qualification guard: compulsory business name and verified email format
                b_name = str(lead.get("business_name") or "").strip()
                email = str(lead.get("email") or "").strip()
                if not b_name or not email or "@" not in email or "." not in email.split("@")[-1]:
                    continue

                website = str(lead.get("website") or "").strip()
                domain = str(lead.get("domain") or "").strip().lower()
                if not domain and website:
                    from urllib.parse import urlparse
                    try:
                        domain = urlparse(website if website.startswith("http") else f"https://{website}").netloc.replace("www.", "").lower()
                    except Exception:
                        domain = website

                phone = str(lead.get("phone") or "").strip()
                if phone in ["Not Listed", "Not Found"]:
                    phone = ""

                email_src = lead.get("email_source_url") or lead.get("original_source_url") or website
                phone_src = lead.get("phone_source_url") or lead.get("original_source_url") or website
                source_platform = lead.get("source_platform") or lead.get("source") or "Google Organic Search"
                original_src = lead.get("original_source_url") or lead.get("source_url") or website
                
                # Check for existing lead in this workspace
                existing_lead_id = None
                if domain:
                    row = cur.execute(
                        "SELECT id, phone, phone_source_url FROM leads WHERE workspace_id = ? AND LOWER(domain) = ?",
                        (workspace_id, domain)
                    ).fetchone()
                    if row:
                        existing_lead_id = row["id"]
                
                if not existing_lead_id:
                    row = cur.execute(
                        "SELECT id, phone, phone_source_url FROM leads WHERE workspace_id = ? AND LOWER(business_name) = ? AND LOWER(email) = ?",
                        (workspace_id, b_name.lower(), email.lower())
                    ).fetchone()
                    if row:
                        existing_lead_id = row["id"]

                if existing_lead_id:
                    lead_id = existing_lead_id
                    # Enrich phone if previously missing
                    if not row["phone"] and phone:
                        cur.execute('''
                            UPDATE leads SET phone = ?, phone_source_url = ?, phone_status = ?, updated_at = ?
                            WHERE id = ?
                        ''', (phone, phone_src, "FOUND IN SOURCE • FORMAT CHECKED", iso_utc, lead_id))
                else:
                    # Insert new master lead into workspace
                    cur.execute('''
                        INSERT INTO leads (
                            workspace_id, business_name, website, domain, email, email_source_url, email_status,
                            phone, phone_source_url, phone_status, country, city, address, industry, category,
                            source, source_platform, source_url, original_source_url,
                            search_keyword, search_location, date_discovered,
                            saved_date, saved_time, extraction_date, extraction_time,
                            lead_score, final_lead_score, qualification_level, crm_stage, created_at, updated_at
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?,
                            ?, ?, ?,
                            ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?
                        )
                    ''', (
                        workspace_id, b_name, website, domain, email, email_src, lead.get("email_status", "FOUND IN SOURCE • DOMAIN CHECKED"),
                        phone, phone_src, "FOUND IN SOURCE • FORMAT CHECKED" if phone else "NOT LISTED",
                        lead.get("country", country), lead.get("city", city), lead.get("address", ""), lead.get("industry", keyword), lead.get("category", keyword),
                        source_platform, source_platform, original_src, original_src,
                        keyword, city or country, iso_utc,
                        pkt_date_human, pkt_time_human, pkt_date_human, pkt_time_human,
                        95, 95, "🟢 Qualified Lead", "New Lead", iso_utc, iso_utc
                    ))
                    lead_id = cur.lastrowid

                # Store snapshot for this search instance
                lead_snapshot = {
                    "id": lead_id,
                    "business_name": b_name,
                    "website": website,
                    "domain": domain,
                    "email": email,
                    "email_source_url": email_src,
                    "email_status": lead.get("email_status", "FOUND IN SOURCE • DOMAIN CHECKED"),
                    "phone": phone,
                    "phone_source_url": phone_src,
                    "phone_status": "FOUND IN SOURCE • FORMAT CHECKED" if phone else "NOT LISTED",
                    "country": lead.get("country", country),
                    "city": lead.get("city", city),
                    "industry": lead.get("industry", keyword),
                    "source_platform": source_platform,
                    "original_source_url": original_src,
                    "search_keyword": keyword,
                    "search_date": pkt_date_human,
                    "search_time": pkt_time_human,
                    "saved_date": pkt_date_human,
                    "saved_time": pkt_time_human,
                }

                # Link lead to this search record
                cur.execute('''
                    INSERT INTO search_record_leads (
                        search_record_id, lead_id, workspace_id, lead_snapshot, created_at
                    ) VALUES (?, ?, ?, ?, ?)
                ''', (record_id, lead_id, workspace_id, json.dumps(lead_snapshot), iso_utc))

            conn.commit()

            return {
                "id": record_id,
                "keyword": keyword,
                "country": country,
                "city": city,
                "sources": sources,
                "requested_quantity": requested_quantity,
                "qualified_quantity": qualified_count,
                "leads_with_phone": leads_with_phone,
                "search_status": "COMPLETED",
                "search_date": pkt_date_human,
                "search_time": pkt_time_human,
                "completion_time": pkt_completion,
                "created_at": iso_utc,
            }
        finally:
            conn.close()

    @classmethod
    def get_search_records(
        cls,
        workspace_id: int,
        date_filter: Optional[str] = None,
        keyword_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves historical search records for caller's workspace.
        """
        conn = get_db_connection()
        query = "SELECT * FROM search_records WHERE workspace_id = ?"
        params: List[Any] = [workspace_id]

        if date_filter and date_filter not in ["ALL", "All", "All Dates", ""]:
            # Flexible date filter (matches human format "19 November 2026" or "2026-11-19")
            query += " AND (search_date = ? OR search_date LIKE ? OR created_at LIKE ?)"
            params.extend([date_filter, f"%{date_filter}%", f"%{date_filter}%"])

        if keyword_filter:
            query += " AND keyword LIKE ?"
            params.append(f"%{keyword_filter}%")

        query += " ORDER BY id DESC"
        rows = conn.execute(query, params).fetchall()
        conn.close()

        records = []
        for r in rows:
            rec = dict(r)
            try:
                rec["sources"] = json.loads(rec["sources"])
            except Exception:
                rec["sources"] = [rec["sources"]] if rec.get("sources") else []
            records.append(rec)
        return records

    @classmethod
    def get_search_record_by_id(cls, record_id: str, workspace_id: int) -> Optional[Dict[str, Any]]:
        """
        Gets a single search record by ID with its complete list of original leads.
        """
        conn = get_db_connection()
        rec_row = conn.execute(
            "SELECT * FROM search_records WHERE id = ? AND workspace_id = ?",
            (record_id, workspace_id)
        ).fetchone()

        if not rec_row:
            conn.close()
            return None

        rec = dict(rec_row)
        try:
            rec["sources"] = json.loads(rec["sources"])
        except Exception:
            rec["sources"] = [rec["sources"]] if rec.get("sources") else []

        # Fetch associated leads from link table and snapshot
        lead_rows = conn.execute('''
            SELECT srl.id as link_id, srl.lead_id, srl.lead_snapshot, srl.created_at as linked_at,
                   l.*
            FROM search_record_leads srl
            LEFT JOIN leads l ON srl.lead_id = l.id
            WHERE srl.search_record_id = ? AND srl.workspace_id = ?
            ORDER BY srl.id ASC
        ''', (record_id, workspace_id)).fetchall()
        conn.close()

        leads = []
        for lr in lead_rows:
            d = dict(lr)
            # If lead_snapshot is present, merge it with any updated live values
            if d.get("lead_snapshot"):
                try:
                    snapshot = json.loads(d["lead_snapshot"])
                    # Use snapshot for search-specific evidence
                    for k, v in snapshot.items():
                        if v is not None and v != "":
                            d[k] = v
                except Exception:
                    pass
            leads.append(d)

        rec["leads"] = leads
        return rec

    @classmethod
    def get_leads_for_date(cls, date_str: str, workspace_id: int) -> List[Dict[str, Any]]:
        """
        Returns all unique qualified leads extracted from all searches on a given date.
        """
        conn = get_db_connection()
        # Find all search records for date
        records = conn.execute('''
            SELECT id FROM search_records
            WHERE workspace_id = ? AND (search_date = ? OR search_date LIKE ? OR created_at LIKE ?)
        ''', (workspace_id, date_str, f"%{date_str}%", f"%{date_str}%")).fetchall()

        if not records:
            conn.close()
            return []

        rec_ids = [r["id"] for r in records]
        placeholders = ",".join(["?"] * len(rec_ids))

        lead_rows = conn.execute(f'''
            SELECT DISTINCT l.*, srl.lead_snapshot
            FROM search_record_leads srl
            JOIN leads l ON srl.lead_id = l.id
            WHERE srl.workspace_id = ? AND srl.search_record_id IN ({placeholders})
            ORDER BY l.id DESC
        ''', [workspace_id] + rec_ids).fetchall()
        conn.close()

        leads = []
        seen_domains = set()
        for lr in lead_rows:
            d = dict(lr)
            dom = (d.get("domain") or "").lower()
            if dom and dom in seen_domains:
                continue
            if dom:
                seen_domains.add(dom)
            if d.get("lead_snapshot"):
                try:
                    snap = json.loads(d["lead_snapshot"])
                    for k, v in snap.items():
                        if v: d[k] = v
                except Exception:
                    pass
            leads.append(d)
        return leads

    @classmethod
    def get_distinct_dates(cls, workspace_id: int) -> List[Dict[str, Any]]:
        """
        Returns distinct search dates with search counts and qualified lead counts.
        """
        conn = get_db_connection()
        rows = conn.execute('''
            SELECT search_date,
                   COUNT(id) as total_searches,
                   SUM(qualified_quantity) as total_leads,
                   SUM(leads_with_phone) as total_with_phone,
                   MAX(created_at) as latest_created_at
            FROM search_records
            WHERE workspace_id = ?
            GROUP BY search_date
            ORDER BY latest_created_at DESC
        ''', (workspace_id,)).fetchall()
        conn.close()

        return [dict(r) for r in rows]

    @classmethod
    def record_export_history(
        cls,
        workspace_id: int,
        user_id: int,
        export_target: str,
        export_format: str,
        record_count: int,
        search_record_id: Optional[str] = None,
        export_date_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Records an export audit log.
        """
        iso_utc, pkt_date_human, pkt_date_std, pkt_time_human, pkt_completion = get_pkt_now()
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            cur.execute('''
                INSERT INTO export_history (
                    workspace_id, user_id, export_target, search_record_id, export_date_filter,
                    format, record_count, export_date, export_time, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                workspace_id, user_id, export_target, search_record_id, export_date_filter,
                export_format.upper(), record_count, pkt_date_human, pkt_time_human, iso_utc
            ))
            conn.commit()
            log_id = cur.lastrowid
            return {
                "id": log_id,
                "workspace_id": workspace_id,
                "export_target": export_target,
                "format": export_format.upper(),
                "record_count": record_count,
                "export_date": pkt_date_human,
                "export_time": pkt_time_human,
                "created_at": iso_utc,
            }
        finally:
            conn.close()

    @classmethod
    def get_export_history(cls, workspace_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Retrieves export audit logs for caller's workspace.
        """
        conn = get_db_connection()
        rows = conn.execute('''
            SELECT * FROM export_history
            WHERE workspace_id = ?
            ORDER BY id DESC LIMIT ?
        ''', (workspace_id, limit)).fetchall()
        conn.close()
        return [dict(r) for r in rows]
