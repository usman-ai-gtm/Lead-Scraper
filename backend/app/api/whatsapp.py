"""
USMAN AI GTM - WhatsApp Outreach Companion API Endpoints
Practical, 100% compliant WhatsApp Web companion and CRM integration.
- Avoids mandatory WhatsApp Business Platform API message charges.
- Official click-to-chat URL building (wa.me / web.whatsapp.com).
- Zero unofficial reverse-engineered protocols, zero session scraping.
- Honest tracking: Draft prepared, Chat opened, Marked sent manually, Reply recorded.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import re
import json

from backend.app.core.database import get_db_connection, execute_query, execute_write
from backend.app.core.security import get_current_user

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Outreach Companion"])

# ----------------- DB Initialization -----------------
def init_whatsapp_companion_tables():
    conn = get_db_connection()
    cur = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. WhatsApp Companion Templates
    cur.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_companion_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            name TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'B2B_OUTREACH',
            body TEXT NOT NULL,
            description TEXT,
            is_default INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    # Seed default templates if empty
    cur.execute("SELECT COUNT(*) FROM whatsapp_companion_templates")
    if cur.fetchone()[0] == 0:
        defaults = [
            (
                1, "Executive B2B Value Proposition", "B2B_OUTREACH",
                "Hi {{contact_name}}, I noticed {{business_name}} is expanding in {{city}}. At {{my_business}}, we {{value_proposition}}. Would you be open to a quick 5-minute chat this week to share how peers in {{industry}} are solving this?",
                "High-intent concise value hook tailored for founders and directors.", 1, now_iso, now_iso
            ),
            (
                1, "Consultative Service Brief", "CONSULTATION",
                "Hello! Reaching out from {{my_business}} regarding {{business_name}}. We specialize in helping {{industry}} companies scale operations through {{value_proposition}}. Are you currently taking on new growth initiatives?",
                "Warm, professional inquiry for local and enterprise service providers.", 1, now_iso, now_iso
            ),
            (
                1, "Quick Gentle Follow-up", "FOLLOW_UP",
                "Hi {{contact_name}}, following up on my previous note to {{business_name}}. Wanted to make sure this didn't slip through the cracks. Does a brief 5-min walk-through tomorrow work for you?",
                "Courteous reminder for leads requiring secondary touch.", 1, now_iso, now_iso
            ),
            (
                1, "Strategic Partnership Intro", "PARTNERSHIP",
                "Greetings {{contact_name}}! We follow {{business_name}}'s work in {{city}}. {{my_business}} provides {{value_proposition}}, and we believe a collaboration could deliver significant mutual client value. Open to connecting?",
                "Collaborative angle for co-marketing and agency partnerships.", 1, now_iso, now_iso
            )
        ]
        cur.executemany('''
            INSERT INTO whatsapp_companion_templates 
            (workspace_id, name, category, body, description, is_default, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', defaults)

    # 2. Activity Logs
    cur.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            lead_id INTEGER,
            business_name TEXT NOT NULL,
            contact_name TEXT,
            phone_number TEXT NOT NULL,
            action TEXT NOT NULL,
            notes TEXT,
            next_followup TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    # 3. Suppressions table check
    cur.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_suppressions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            phone_number TEXT UNIQUE NOT NULL,
            reason TEXT DEFAULT 'User Opt-Out',
            business_name TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    # 4. Drafts & Lead-specific Outreach Status
    cur.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_companion_drafts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            lead_id INTEGER NOT NULL,
            draft_text TEXT NOT NULL,
            tone TEXT DEFAULT 'Professional & Direct',
            status TEXT DEFAULT 'Draft prepared',
            last_activity TEXT,
            next_followup TEXT,
            consent_status TEXT DEFAULT 'Public B2B Directory',
            updated_at TEXT NOT NULL,
            UNIQUE(workspace_id, lead_id)
        )
    ''')

    # 5. User Companion Settings & Business Profile
    cur.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_companion_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL UNIQUE,
            my_business_name TEXT DEFAULT 'USMAN AI GTM',
            my_offering TEXT DEFAULT 'Autonomous AI B2B Lead Intelligence',
            value_proposition TEXT DEFAULT 'automate qualified lead acquisition and shorten sales cycles',
            sender_name TEXT DEFAULT 'Muhammad Usman',
            default_country_code TEXT DEFAULT '92',
            default_tone TEXT DEFAULT 'Professional & Direct',
            auto_open_web INTEGER DEFAULT 1,
            updated_at TEXT NOT NULL
        )
    ''')

    # Seed default settings
    cur.execute("SELECT id FROM whatsapp_companion_settings WHERE workspace_id = 1")
    if not cur.fetchone():
        cur.execute('''
            INSERT OR IGNORE INTO whatsapp_companion_settings
            (workspace_id, my_business_name, my_offering, value_proposition, sender_name, default_country_code, default_tone, auto_open_web, updated_at)
            VALUES (1, 'USMAN AI GTM', 'Autonomous AI B2B Lead Intelligence', 'automate qualified lead acquisition and shorten sales cycles', 'Muhammad Usman', '92', 'Professional & Direct', 1, ?)
        ''', (now_iso,))

    conn.commit()
    conn.close()

init_whatsapp_companion_tables()


# ----------------- Request Schemas -----------------
class TemplateCreateRequest(BaseModel):
    name: str
    category: str = "B2B_OUTREACH"
    body: str
    description: Optional[str] = ""

class TemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    body: Optional[str] = None
    description: Optional[str] = None

class ActivityRecordRequest(BaseModel):
    lead_id: Optional[int] = None
    business_name: str
    contact_name: Optional[str] = None
    phone_number: str
    action: str # DRAFT_PREPARED, CHAT_OPENED, MANUALLY_MARKED_SENT, REPLY_RECORDED, FOLLOW_UP_SCHEDULED, OPTED_OUT
    notes: Optional[str] = ""
    next_followup: Optional[str] = None

class DraftSaveRequest(BaseModel):
    lead_id: int
    draft_text: str
    tone: Optional[str] = "Professional & Direct"
    status: Optional[str] = "Draft prepared"
    consent_status: Optional[str] = "Public B2B Directory"
    next_followup: Optional[str] = None

class SuppressionCreateRequest(BaseModel):
    phone_number: str
    reason: Optional[str] = "User Opt-Out"
    business_name: Optional[str] = ""

class AIDraftRequest(BaseModel):
    lead_id: int
    business_name: str
    industry: Optional[str] = None
    city: Optional[str] = None
    website: Optional[str] = None
    rating: Optional[float] = None
    tone: Optional[str] = "Professional & Direct"
    my_business_name: Optional[str] = None
    value_proposition: Optional[str] = None

class CompanionSettingsUpdate(BaseModel):
    my_business_name: Optional[str] = None
    my_offering: Optional[str] = None
    value_proposition: Optional[str] = None
    sender_name: Optional[str] = None
    default_country_code: Optional[str] = None
    default_tone: Optional[str] = None
    auto_open_web: Optional[bool] = None


# ----------------- Phone Normalizer Helper -----------------
def normalize_phone_number(raw_phone: str, default_cc: str = "92") -> Dict[str, Any]:
    if not raw_phone or not raw_phone.strip():
        return {
            "raw": "",
            "normalized": "",
            "is_valid": False,
            "status": "MISSING",
            "error_reason": "No phone number available"
        }
    first_line = raw_phone.split('\n')[0].strip()
    digits = re.sub(r'[^0-9+]', '', first_line)

    if digits.startswith("+"):
        norm = digits[1:]
    elif digits.startswith("00"):
        norm = digits[2:]
    elif digits.startswith("0") and 10 <= len(digits) <= 12:
        norm = f"{default_cc}{digits[1:]}"
    elif len(digits) == 10 and default_cc in ("1", "92"):
        norm = f"{default_cc}{digits}"
    else:
        norm = digits

    length = len(re.sub(r'\D', '', norm))
    if length < 8:
        return {
            "raw": raw_phone,
            "normalized": norm,
            "is_valid": False,
            "status": "INVALID",
            "error_reason": f"Phone number too short ({length} digits, minimum 8 required)"
        }
    if length > 15:
        return {
            "raw": raw_phone,
            "normalized": norm,
            "is_valid": False,
            "status": "INVALID",
            "error_reason": f"Phone number too long ({length} digits, max 15 permitted)"
        }

    return {
        "raw": raw_phone,
        "normalized": norm,
        "is_valid": True,
        "status": "VALID",
        "display": f"+{norm}",
        "click_to_chat_url": f"https://wa.me/{norm}"
    }


# ----------------- API Endpoints -----------------

@router.get("/overview")
def get_companion_overview(current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id", 1)
    conn = get_db_connection()

    # Total leads with phone
    total_with_phone = conn.execute(
        "SELECT COUNT(*) FROM leads WHERE (workspace_id = ? OR workspace_id IS NULL) AND phone IS NOT NULL AND phone != ''",
        (ws_id,)
    ).fetchone()[0]

    # Suppressions
    suppressions_count = conn.execute(
        "SELECT COUNT(*) FROM whatsapp_suppressions WHERE workspace_id = ?",
        (ws_id,)
    ).fetchone()[0]

    # Activity counts
    chats_opened = conn.execute(
        "SELECT COUNT(*) FROM whatsapp_activity_logs WHERE workspace_id = ? AND action = 'CHAT_OPENED'",
        (ws_id,)
    ).fetchone()[0]

    marked_sent = conn.execute(
        "SELECT COUNT(*) FROM whatsapp_activity_logs WHERE workspace_id = ? AND action = 'MANUALLY_MARKED_SENT'",
        (ws_id,)
    ).fetchone()[0]

    replies_recorded = conn.execute(
        "SELECT COUNT(*) FROM whatsapp_activity_logs WHERE workspace_id = ? AND action = 'REPLY_RECORDED'",
        (ws_id,)
    ).fetchone()[0]

    drafts_count = conn.execute(
        "SELECT COUNT(*) FROM whatsapp_companion_drafts WHERE workspace_id = ?",
        (ws_id,)
    ).fetchone()[0]

    # Upcoming follow-ups
    upcoming_followups = conn.execute('''
        SELECT id, lead_id, draft_text, next_followup, updated_at
        FROM whatsapp_companion_drafts
        WHERE workspace_id = ? AND next_followup IS NOT NULL AND next_followup != ''
        ORDER BY next_followup ASC
        LIMIT 5
    ''', (ws_id,)).fetchall()

    # Recent activities
    recent_activities = conn.execute('''
        SELECT id, lead_id, business_name, contact_name, phone_number, action, notes, next_followup, created_at
        FROM whatsapp_activity_logs
        WHERE workspace_id = ?
        ORDER BY id DESC
        LIMIT 10
    ''', (ws_id,)).fetchall()

    conn.close()

    return {
        "status": "success",
        "metrics": {
            "total_leads_with_phone": total_with_phone,
            "drafts_prepared": drafts_count,
            "chats_opened": chats_opened,
            "marked_sent": marked_sent,
            "replies_recorded": replies_recorded,
            "suppressed_contacts": suppressions_count
        },
        "recent_activities": [dict(r) for r in recent_activities],
        "upcoming_followups": [dict(r) for r in upcoming_followups]
    }


@router.get("/leads")
def get_companion_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=5, le=100),
    keyword: str = "",
    status_filter: str = "all",
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id", 1)
    conn = get_db_connection()

    # Get suppressed phones set
    sup_rows = conn.execute("SELECT phone_number FROM whatsapp_suppressions WHERE workspace_id = ?", (ws_id,)).fetchall()
    suppressed_numbers = {re.sub(r'\D', '', r[0]) for r in sup_rows}

    # Get settings for default country code
    settings_row = conn.execute("SELECT default_country_code FROM whatsapp_companion_settings WHERE workspace_id = ?", (ws_id,)).fetchone()
    default_cc = settings_row[0] if settings_row else "92"

    query = '''
        SELECT l.id, l.business_name, l.category, l.city, l.country, l.phone, l.website, l.source, l.source_url,
               l.lead_score, l.crm_stage, l.created_at,
               d.draft_text, d.status as draft_status, d.tone, d.consent_status, d.next_followup, d.updated_at as draft_updated_at
        FROM leads l
        LEFT JOIN whatsapp_companion_drafts d ON l.id = d.lead_id AND d.workspace_id = ?
        WHERE (l.workspace_id = ? OR l.workspace_id IS NULL)
    '''
    params = [ws_id, ws_id]

    if keyword.strip():
        query += " AND (l.business_name LIKE ? OR l.phone LIKE ? OR l.city LIKE ?)"
        k_wild = f"%{keyword.strip()}%"
        params.extend([k_wild, k_wild, k_wild])

    query += " ORDER BY l.id DESC"
    all_leads = conn.execute(query, tuple(params)).fetchall()

    # Load last activities per lead
    act_rows = conn.execute('''
        SELECT lead_id, action, created_at, notes
        FROM whatsapp_activity_logs
        WHERE workspace_id = ?
        ORDER BY id DESC
    ''', (ws_id,)).fetchall()
    last_act_map = {}
    for a in act_rows:
        lid = a["lead_id"]
        if lid and lid not in last_act_map:
            last_act_map[lid] = dict(a)

    conn.close()

    enriched_leads = []
    for row in all_leads:
        item = dict(row)
        raw_p = item.get("phone") or ""
        val = normalize_phone_number(raw_p, default_cc=default_cc)
        item["phone_validation"] = val

        clean_digits = re.sub(r'\D', '', val["normalized"])
        is_suppressed = clean_digits in suppressed_numbers
        item["is_suppressed"] = is_suppressed

        item["last_activity"] = last_act_map.get(item["id"])

        # Determine outreach status
        if is_suppressed:
            item["outreach_status"] = "Opted out / Suppressed"
        elif item.get("draft_status"):
            item["outreach_status"] = item["draft_status"]
        elif not val["is_valid"]:
            item["outreach_status"] = "Number invalid / missing"
        else:
            item["outreach_status"] = "Eligible - Ready to Prepare"

        # Apply filter if set
        if status_filter == "suppressed" and not is_suppressed:
            continue
        if status_filter == "ready" and (is_suppressed or not val["is_valid"]):
            continue
        if status_filter == "drafted" and not item.get("draft_text"):
            continue

        enriched_leads.append(item)

    total = len(enriched_leads)
    start = (page - 1) * page_size
    paged = enriched_leads[start:start + page_size]

    return {
        "status": "success",
        "total": total,
        "page": page,
        "page_size": page_size,
        "leads": paged
    }


# ----------------- Templates Endpoints -----------------

@router.get("/templates")
def list_templates(current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id", 1)
    rows = execute_query(
        "SELECT * FROM whatsapp_companion_templates WHERE workspace_id = ? ORDER BY id ASC",
        (ws_id,)
    )
    return {"status": "success", "templates": rows}


@router.post("/templates")
def create_template(req: TemplateCreateRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id", 1)
    now_iso = datetime.now(timezone.utc).isoformat()
    new_id = execute_write('''
        INSERT INTO whatsapp_companion_templates
        (workspace_id, name, category, body, description, is_default, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    ''', (ws_id, req.name, req.category, req.body, req.description, now_iso, now_iso))
    return {"status": "success", "id": new_id, "message": "Template created successfully"}


@router.put("/templates/{template_id}")
def update_template(template_id: int, req: TemplateUpdateRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id", 1)
    now_iso = datetime.now(timezone.utc).isoformat()
    fields = []
    vals = []
    if req.name is not None:
        fields.append("name = ?")
        vals.append(req.name)
    if req.category is not None:
        fields.append("category = ?")
        vals.append(req.category)
    if req.body is not None:
        fields.append("body = ?")
        vals.append(req.body)
    if req.description is not None:
        fields.append("description = ?")
        vals.append(req.description)

    if not fields:
        return {"status": "success", "message": "No changes submitted"}

    fields.append("updated_at = ?")
    vals.append(now_iso)
    vals.extend([template_id, ws_id])

    execute_write(f'''
        UPDATE whatsapp_companion_templates
        SET {', '.join(fields)}
        WHERE id = ? AND workspace_id = ?
    ''', tuple(vals))

    return {"status": "success", "message": "Template updated successfully"}


@router.post("/templates/{template_id}/duplicate")
def duplicate_template(template_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id", 1)
    tmpl = execute_query(
        "SELECT * FROM whatsapp_companion_templates WHERE id = ? AND workspace_id = ?",
        (template_id, ws_id),
        fetch_all=False
    )
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    new_name = f"{tmpl['name']} (Copy)"
    new_id = execute_write('''
        INSERT INTO whatsapp_companion_templates
        (workspace_id, name, category, body, description, is_default, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    ''', (ws_id, new_name, tmpl["category"], tmpl["body"], tmpl.get("description", ""), now_iso, now_iso))

    return {"status": "success", "id": new_id, "message": f"Duplicated as '{new_name}'"}


@router.delete("/templates/{template_id}")
def delete_template(template_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id", 1)
    execute_write(
        "DELETE FROM whatsapp_companion_templates WHERE id = ? AND workspace_id = ?",
        (template_id, ws_id)
    )
    return {"status": "success", "message": "Template deleted successfully"}


# ----------------- Drafts & Activity Logs -----------------

@router.post("/drafts")
def save_draft(req: DraftSaveRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id", 1)
    now_iso = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO whatsapp_companion_drafts
        (workspace_id, lead_id, draft_text, tone, status, next_followup, consent_status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id, lead_id) DO UPDATE SET
            draft_text = excluded.draft_text,
            tone = excluded.tone,
            status = excluded.status,
            next_followup = excluded.next_followup,
            consent_status = excluded.consent_status,
            updated_at = excluded.updated_at
    ''', (ws_id, req.lead_id, req.draft_text, req.tone, req.status, req.next_followup, req.consent_status, now_iso))

    # Also log draft prepared event if new
    cur.execute("SELECT business_name, phone FROM leads WHERE id = ?", (req.lead_id,))
    lead_row = cur.fetchone()
    if lead_row:
        cur.execute('''
            INSERT INTO whatsapp_activity_logs
            (workspace_id, lead_id, business_name, phone_number, action, notes, next_followup, created_at)
            VALUES (?, ?, ?, ?, 'DRAFT_PREPARED', ?, ?, ?)
        ''', (ws_id, req.lead_id, lead_row[0], lead_row[1] or "", f"Draft updated with tone {req.tone}", req.next_followup, now_iso))

    conn.commit()
    conn.close()

    return {"status": "success", "message": "Draft saved successfully"}


@router.post("/activities")
def record_activity(req: ActivityRecordRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id", 1)
    now_iso = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cur = conn.cursor()

    # Insert activity log
    cur.execute('''
        INSERT INTO whatsapp_activity_logs
        (workspace_id, lead_id, business_name, contact_name, phone_number, action, notes, next_followup, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (ws_id, req.lead_id, req.business_name, req.contact_name, req.phone_number, req.action, req.notes, req.next_followup, now_iso))

    # Update draft status if lead_id provided
    if req.lead_id:
        status_label = {
            "CHAT_OPENED": "Chat opened",
            "MANUALLY_MARKED_SENT": "Manually marked as sent by user",
            "REPLY_RECORDED": "Reply manually recorded",
            "FOLLOW_UP_SCHEDULED": "Follow-up needed",
            "OPTED_OUT": "Opted out"
        }.get(req.action, req.action)

        cur.execute('''
            UPDATE whatsapp_companion_drafts
            SET status = ?, last_activity = ?, updated_at = ?
            WHERE workspace_id = ? AND lead_id = ?
        ''', (status_label, now_iso, now_iso, ws_id, req.lead_id))

        if req.next_followup:
            cur.execute('''
                UPDATE whatsapp_companion_drafts
                SET next_followup = ?
                WHERE workspace_id = ? AND lead_id = ?
            ''', (req.next_followup, ws_id, req.lead_id))

    # If action is OPTED_OUT, automatically add to suppressions
    if req.action == "OPTED_OUT":
        clean_num = re.sub(r'\D', '', req.phone_number)
        cur.execute('''
            INSERT OR IGNORE INTO whatsapp_suppressions
            (workspace_id, phone_number, reason, business_name, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (ws_id, clean_num, req.notes or "Contact requested opt-out", req.business_name, now_iso))

    conn.commit()
    conn.close()

    return {"status": "success", "message": f"Recorded honest activity: {req.action}"}


@router.get("/activities")
def list_activities(
    limit: int = Query(50, ge=5, le=200),
    action_filter: str = "all",
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id", 1)
    sql = "SELECT * FROM whatsapp_activity_logs WHERE workspace_id = ?"
    params = [ws_id]
    if action_filter != "all":
        sql += " AND action = ?"
        params.append(action_filter)
    sql += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    rows = execute_query(sql, tuple(params))
    return {"status": "success", "activities": rows}


# ----------------- Suppressions (Do-Not-Contact) -----------------

@router.get("/suppressions")
def list_suppressions(current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id", 1)
    rows = execute_query(
        "SELECT * FROM whatsapp_suppressions WHERE workspace_id = ? ORDER BY id DESC",
        (ws_id,)
    )
    return {"status": "success", "suppressions": rows}


@router.post("/suppressions")
def add_suppression(req: SuppressionCreateRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id", 1)
    clean_num = re.sub(r'\D', '', req.phone_number)
    if not clean_num:
        raise HTTPException(status_code=400, detail="Valid phone number is required for suppression")

    now_iso = datetime.now(timezone.utc).isoformat()
    execute_write('''
        INSERT OR REPLACE INTO whatsapp_suppressions
        (workspace_id, phone_number, reason, business_name, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (ws_id, clean_num, req.reason or "Manual suppression", req.business_name, now_iso))

    return {"status": "success", "message": f"Number +{clean_num} added to suppression list"}


@router.delete("/suppressions/{suppression_id}")
def remove_suppression(suppression_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id", 1)
    execute_write(
        "DELETE FROM whatsapp_suppressions WHERE id = ? AND workspace_id = ?",
        (suppression_id, ws_id)
    )
    return {"status": "success", "message": "Suppression entry removed"}


# ----------------- AI Personalization -----------------

@router.post("/ai-draft")
def generate_ai_draft(req: AIDraftRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id", 1)
    conn = get_db_connection()

    # Load settings / ICP profile
    settings_row = conn.execute(
        "SELECT my_business_name, my_offering, value_proposition, sender_name FROM whatsapp_companion_settings WHERE workspace_id = ?",
        (ws_id,)
    ).fetchone()
    conn.close()

    my_business = req.my_business_name or (settings_row[0] if settings_row else "USMAN AI GTM")
    offering = settings_row[1] if settings_row else "AI B2B Lead Intelligence"
    value_prop = req.value_proposition or (settings_row[2] if settings_row else "accelerate verified customer discovery")
    tone = req.tone or "Professional & Direct"

    # Strict compliance: do not invent facts, only use evidence available
    evidence_parts = []
    if req.city:
        evidence_parts.append(f"based in {req.city}")
    if req.industry:
        evidence_parts.append(f"in the {req.industry} sector")
    if req.rating and req.rating > 0:
        evidence_parts.append(f"with strong public reviews ({req.rating}★)")
    if req.website:
        evidence_parts.append(f"website {req.website}")

    evidence_str = ", ".join(evidence_parts) if evidence_parts else "public directory listing"

    # Tone variations
    if "Warm" in tone or "Advisory" in tone:
        draft = (
            f"Hello {req.business_name} team! Noticed your impressive presence ({evidence_str}). "
            f"We work with companies in {req.industry or 'your sector'} at {my_business} to {value_prop}. "
            f"Would you be open to exchanging ideas on how this can support your current priorities?"
        )
    elif "Value-First" in tone:
        draft = (
            f"Hi {req.business_name} leadership, reaching out from {my_business}. "
            f"We help {req.industry or 'established'} teams {value_prop}. "
            f"Given your standing in {req.city or 'the market'}, wanted to share a brief 2-minute overview. Are you available for a quick chat this week?"
        )
    elif "Casual" in tone:
        draft = (
            f"Hey {req.business_name}! Found your profile ({evidence_str}). "
            f"At {my_business}, we {value_prop}. "
            f"Curious if you're exploring new growth channels this quarter? Happy to share quick details."
        )
    else: # Professional & Direct
        draft = (
            f"Hello {req.business_name}, reaching out from {my_business}. "
            f"We specialize in {offering} to {value_prop}. "
            f"Noticed your presence in {req.city or 'the market'}. Would you be open to a brief 5-minute conversation to explore potential synergies?"
        )

    return {
        "status": "success",
        "draft": draft,
        "metadata": {
            "lead_id": req.lead_id,
            "tone": tone,
            "evidence_used": evidence_str,
            "char_count": len(draft),
            "reading_time_sec": max(5, round(len(draft) / 18))
        }
    }


# ----------------- Settings Endpoints -----------------

@router.get("/settings")
def get_settings(current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id", 1)
    row = execute_query(
        "SELECT * FROM whatsapp_companion_settings WHERE workspace_id = ?",
        (ws_id,),
        fetch_all=False
    )
    if not row:
        now_iso = datetime.now(timezone.utc).isoformat()
        execute_write('''
            INSERT INTO whatsapp_companion_settings
            (workspace_id, my_business_name, my_offering, value_proposition, sender_name, default_country_code, default_tone, auto_open_web, updated_at)
            VALUES (?, 'USMAN AI GTM', 'Autonomous AI B2B Lead Intelligence', 'automate qualified lead acquisition and shorten sales cycles', 'Muhammad Usman', '92', 'Professional & Direct', 1, ?)
        ''', (ws_id, now_iso))
        row = execute_query(
            "SELECT * FROM whatsapp_companion_settings WHERE workspace_id = ?",
            (ws_id,),
            fetch_all=False
        )

    return {"status": "success", "settings": row}


@router.post("/settings")
def update_settings(req: CompanionSettingsUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id", 1)
    now_iso = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO whatsapp_companion_settings
        (workspace_id, my_business_name, my_offering, value_proposition, sender_name, default_country_code, default_tone, auto_open_web, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id) DO UPDATE SET
            my_business_name = coalesce(?, my_business_name),
            my_offering = coalesce(?, my_offering),
            value_proposition = coalesce(?, value_proposition),
            sender_name = coalesce(?, sender_name),
            default_country_code = coalesce(?, default_country_code),
            default_tone = coalesce(?, default_tone),
            auto_open_web = coalesce(?, auto_open_web),
            updated_at = excluded.updated_at
    ''', (
        ws_id,
        req.my_business_name or "USMAN AI GTM",
        req.my_offering or "Autonomous AI B2B Lead Intelligence",
        req.value_proposition or "automate qualified lead acquisition and shorten sales cycles",
        req.sender_name or "Muhammad Usman",
        req.default_country_code or "92",
        req.default_tone or "Professional & Direct",
        1 if req.auto_open_web is None or req.auto_open_web else 0,
        now_iso,
        req.my_business_name,
        req.my_offering,
        req.value_proposition,
        req.sender_name,
        req.default_country_code,
        req.default_tone,
        1 if req.auto_open_web else 0 if req.auto_open_web is not None else None
    ))
    conn.commit()
    conn.close()

    return {"status": "success", "message": "Settings updated successfully"}
