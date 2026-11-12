"""
USMAN AI GTM - Admin Control Center & 50-Seat Client Account Provisioning API Endpoints
"""

import os
import secrets
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from backend.app.core.database import get_db_connection, execute_write
from backend.app.core.security import get_current_user, require_role, hash_password
from backend.app.core.config import settings

logger = logging.getLogger("USMAN_ADMIN_API")

router = APIRouter(prefix="/admin", tags=["Admin Control Center"])

class UpdateRoleRequest(BaseModel):
    role: str # ADMIN, MANAGER, USER, VIEWER

class CreateClientRequest(BaseModel):
    client_name: Optional[str] = None
    full_name: Optional[str] = None
    email: str
    company: Optional[str] = None
    workspace_name: Optional[str] = None
    industry: Optional[str] = "B2B"
    notes: Optional[str] = ""
    client_notes: Optional[str] = ""
    max_leads_quota: Optional[int] = 5000

def _get_admin_id(current_user: Dict[str, Any]) -> int:
    val = current_user.get("user_id") or current_user.get("id") or 1
    try:
        return int(val)
    except (ValueError, TypeError):
        return 1

class UpdateStatusRequest(BaseModel):
    status: str # ACTIVE, SUSPENDED, REVOKED

@router.get("/overview")
def get_admin_overview(current_user: Dict[str, Any] = Depends(require_role(["ADMIN"]))):
    conn = get_db_connection()
    user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    client_count = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'USER' AND status != 'REVOKED'").fetchone()[0]
    workspace_count = conn.execute("SELECT COUNT(*) FROM workspaces").fetchone()[0]
    lead_count = conn.execute("SELECT COUNT(*) FROM leads").fetchone()[0]
    campaign_count = conn.execute("SELECT COUNT(*) FROM email_campaigns").fetchone()[0]
    conn.close()

    db_size_mb = 0.0
    if os.path.exists(settings.DATABASE_PATH):
        db_size_mb = round(os.path.getsize(settings.DATABASE_PATH) / 1024 / 1024, 2)

    from backend.app.core.cloud_db import get_persistence_info
    pers_info = get_persistence_info()

    return {
        "status": "HEALTHY",
        "system_version": settings.PROJECT_VERSION,
        "environment": settings.ENV,
        "users_count": user_count,
        "active_clients_count": client_count,
        "max_clients_quota": 50,
        "seats_remaining": max(0, 50 - client_count),
        "workspaces_count": workspace_count,
        "total_leads_stored": lead_count,
        "campaigns_total": campaign_count,
        "database_size_mb": db_size_mb,
        "database_engine": pers_info["driver"],
        "persistence_mode": pers_info["mode"],
        "system_health_score": 100.0,
        "security_posture": "PBKDF2-HMAC-SHA256 / RBAC Isolation / 50-Seat Quota"
    }

@router.get("/clients")
def list_clients(current_user: Dict[str, Any] = Depends(require_role(["ADMIN"]))):
    """
    Returns list of all provisioned client accounts with workspace isolation metrics.
    Never exposes passwords or password hashes.
    """
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT 
            u.id, u.email, u.full_name, u.company, u.role, u.status, u.is_active,
            u.workspace_id, u.must_change_password, u.max_leads_quota, u.client_notes,
            u.last_login, u.created_at,
            (SELECT COUNT(*) FROM leads WHERE workspace_id = u.workspace_id) as total_leads
        FROM users u
        WHERE u.role = 'USER'
        ORDER BY u.id DESC
    ''').fetchall()
    conn.close()
    return {"clients": [dict(r) for r in rows], "count": len(rows), "max_seats": 50}

@router.post("/clients")
def provision_client(
    req: CreateClientRequest,
    current_user: Dict[str, Any] = Depends(require_role(["ADMIN"]))
):
    """
    Administrator provisions a new client account.
    - Limits to max 50 active seats.
    - Generates cryptographically secure 16-char temporary password.
    - Hashes with PBKDF2-HMAC-SHA256 with unique 16-byte random salt.
    - Creates a dedicated empty workspace (0 leads).
    - Sets must_change_password = 1.
    - Returns temporary password ONCE for secure handover.
    """
    clean_email = req.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="A valid client email address is required")

    clean_name = (req.full_name or req.client_name or "").strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Client name or organization is required")

    conn = get_db_connection()
    cur = conn.cursor()

    # 1. Enforce 50-seat active client quota
    active_count = cur.execute("SELECT COUNT(*) FROM users WHERE role = 'USER' AND status != 'REVOKED'").fetchone()[0]
    if active_count >= 50:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="Maximum capacity of 50 active client seats has been reached. Please deactivate an unused account or request an enterprise expansion."
        )

    # 2. Check for duplicate email
    existing = cur.execute("SELECT id FROM users WHERE LOWER(email) = ?", (clean_email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail=f"A user with email '{clean_email}' already exists.")

    # 3. Generate 16-character secure random temporary password
    # Exclude ambiguous characters (0, O, 1, I, l) to prevent client transcription errors
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*"
    temporary_password = "".join(secrets.choice(alphabet) for _ in range(16))
    password_hash = hash_password(temporary_password)

    now_iso = datetime.now(timezone.utc).isoformat()
    clean_name = (req.full_name or req.client_name or "").strip()
    if not clean_name:
        conn.close()
        raise HTTPException(status_code=400, detail="Client name is required.")
    notes_val = (req.client_notes or req.notes or "").strip()
    admin_id = _get_admin_id(current_user)

    # 4. Create separate, completely empty workspace for this client
    ws_name = req.workspace_name or f"{req.company or clean_name}'s Private Workspace"
    cur.execute(
        "INSERT INTO workspaces (tenant_id, name, description, created_at) VALUES (1, ?, 'Dedicated Client Lead Extraction Workspace', ?)",
        (ws_name, now_iso)
    )
    new_ws_id = cur.lastrowid

    # 5. Insert client user
    cur.execute('''
        INSERT INTO users (
            tenant_id, workspace_id, username, email, hashed_password, password_hash,
            full_name, company, role, status, is_active, active, must_change_password,
            created_by, client_notes, max_leads_quota, created_at, updated_at
        ) VALUES (
            1, ?, ?, ?, ?, ?, ?, ?, 'USER', 'ACTIVE', 1, 1, 1, ?, ?, ?, ?, ?
        )
    ''', (
        new_ws_id, clean_email, clean_email, password_hash, password_hash,
        clean_name, req.company or clean_name,
        admin_id, notes_val, req.max_leads_quota or 5000, now_iso, now_iso
    ))
    new_user_id = cur.lastrowid

    # 6. Audit logging
    cur.execute('''
        INSERT INTO account_audit_logs (workspace_id, actor, action, result, details, timestamp)
        VALUES (?, ?, 'CLIENT_PROVISIONED', 'SUCCESS', ?, ?)
    ''', (new_ws_id, current_user.get("email", "admin"), f"Provisioned Client #{new_user_id} ({clean_email}) in Workspace #{new_ws_id}", now_iso))

    cur.execute('''
        INSERT INTO client_provisioning_log (user_id, admin_id, action, details, timestamp)
        VALUES (?, ?, 'PROVISION', ?, ?)
    ''', (new_user_id, admin_id, f"Client account created with 5000 lead quota. Seat #{active_count + 1}/50.", now_iso))

    conn.commit()
    conn.close()

    logger.info(f"[Client Provisioning] Admin #{admin_id} created Client #{new_user_id} ({clean_email}) with Workspace #{new_ws_id}")

    return {
        "status": "success",
        "client_id": new_user_id,
        "email": clean_email,
        "client_name": clean_name,
        "full_name": clean_name,
        "company": req.company or clean_name,
        "workspace_id": new_ws_id,
        "workspace_name": ws_name,
        "temporary_password": temporary_password,
        "must_change_password": True,
        "active_seats_used": active_count + 1,
        "seats_remaining": 50 - (active_count + 1),
        "message": "Client provisioned successfully. Please copy the temporary password now; it will never be displayed again."
    }

@router.post("/clients/{client_id}/reset-password")
def reset_client_password(
    client_id: int,
    current_user: Dict[str, Any] = Depends(require_role(["ADMIN"]))
):
    """
    Administrator triggers a secure password reset for a client account.
    Generates a fresh temporary password and forces password rotation on next login.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    user_row = cur.execute("SELECT id, email, full_name, workspace_id FROM users WHERE id = ?", (client_id,)).fetchone()
    if not user_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Client account not found")

    user = dict(user_row)
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*"
    temporary_password = "".join(secrets.choice(alphabet) for _ in range(16))
    password_hash = hash_password(temporary_password)

    now_iso = datetime.now(timezone.utc).isoformat()
    admin_id = _get_admin_id(current_user)

    cur.execute('''
        UPDATE users 
        SET hashed_password = ?, password_hash = ?, must_change_password = 1, updated_at = ?
        WHERE id = ?
    ''', (password_hash, password_hash, now_iso, client_id))

    cur.execute('''
        INSERT INTO account_audit_logs (workspace_id, actor, action, result, details, timestamp)
        VALUES (?, ?, 'CLIENT_PASSWORD_RESET', 'SUCCESS', ?, ?)
    ''', (user["workspace_id"], current_user.get("email", "admin"), f"Admin reset temporary password for Client #{client_id}", now_iso))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "client_id": client_id,
        "email": user["email"],
        "temporary_password": temporary_password,
        "must_change_password": True,
        "message": "Temporary password regenerated. Share securely with client. They must change it upon login."
    }

@router.post("/clients/{client_id}/status")
def update_client_status(
    client_id: int,
    req: UpdateStatusRequest,
    current_user: Dict[str, Any] = Depends(require_role(["ADMIN"]))
):
    """
    Toggles client status: ACTIVE, SUSPENDED, or REVOKED.
    """
    target_status = req.status.upper()
    if target_status not in ["ACTIVE", "SUSPENDED", "REVOKED"]:
        raise HTTPException(status_code=400, detail="Status must be ACTIVE, SUSPENDED, or REVOKED")

    conn = get_db_connection()
    cur = conn.cursor()
    user_row = cur.execute("SELECT id, email, workspace_id FROM users WHERE id = ?", (client_id,)).fetchone()
    if not user_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Client account not found")

    is_active = 1 if target_status == "ACTIVE" else 0
    now_iso = datetime.now(timezone.utc).isoformat()

    cur.execute('''
        UPDATE users SET status = ?, is_active = ?, active = ?, updated_at = ? WHERE id = ?
    ''', (target_status, is_active, is_active, now_iso, client_id))

    cur.execute('''
        INSERT INTO account_audit_logs (workspace_id, actor, action, result, details, timestamp)
        VALUES (?, ?, 'CLIENT_STATUS_CHANGE', 'SUCCESS', ?, ?)
    ''', (user_row["workspace_id"], current_user.get("email", "admin"), f"Updated Client #{client_id} status to {target_status}", now_iso))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "client_id": client_id,
        "new_status": target_status,
        "message": f"Client #{client_id} status updated to {target_status}."
    }

@router.delete("/clients/{client_id}")
def revoke_client(
    client_id: int,
    current_user: Dict[str, Any] = Depends(require_role(["ADMIN"]))
):
    """
    Safely revokes client account with data-retention protection.
    Sets status to REVOKED, marks inactive, and preserves lead audit logs.
    """
    return update_client_status(client_id, UpdateStatusRequest(status="REVOKED"), current_user)

@router.get("/users")
def list_admin_users(current_user: Dict[str, Any] = Depends(require_role(["ADMIN"]))):
    conn = get_db_connection()
    rows = conn.execute("SELECT id, email, full_name, company, role, status, is_active, last_login, created_at FROM users ORDER BY id ASC").fetchall()
    conn.close()
    return {"users": [dict(r) for r in rows]}

@router.post("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    req: UpdateRoleRequest,
    current_user: Dict[str, Any] = Depends(require_role(["ADMIN"]))
):
    target_role = req.role.upper()
    if target_role not in ["ADMIN", "MANAGER", "USER", "VIEWER"]:
        raise HTTPException(status_code=400, detail="Invalid role specified")
    execute_write("UPDATE users SET role = ? WHERE id = ?", (target_role, user_id))
    return {"status": "success", "message": f"User #{user_id} role updated to {target_role}"}

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(require_role(["ADMIN"]))
):
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT id, workspace_id, actor, action, result, details, timestamp
        FROM account_audit_logs
        ORDER BY id DESC LIMIT ?
    ''', (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.get("/persistence")
def get_persistence_status(current_user: Dict[str, Any] = Depends(require_role(["ADMIN"]))):
    from backend.app.core.cloud_db import get_persistence_info
    return get_persistence_info()

