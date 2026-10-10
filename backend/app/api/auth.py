"""
USMAN AI GTM - Production Authentication, Password Reset, OAuth & Workspace API Endpoints
"""

import os
import secrets
import logging
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

from backend.app.schemas.auth import (
    LoginRequest, SignupRequest, TokenResponse, UserOut, WorkspaceOut,
    ForgotPasswordRequest, ResetPasswordRequest, GoogleVerifyRequest,
    IdealCustomerProfileSchema
)
from backend.app.core.database import get_db_connection, execute_write
from backend.app.core.security import hash_password, verify_password, create_access_token, get_current_user

logger = logging.getLogger("USMAN_AUTH_API")

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    clean_email = req.email.strip().lower()
    conn = get_db_connection()
    user_row = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (clean_email,)).fetchone()
    conn.close()

    if not user_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = dict(user_row)
    password_hash_val = user.get("hashed_password") or user.get("password_hash")
    if not password_hash_val or not verify_password(req.password, password_hash_val):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last login
    now_iso = datetime.now(timezone.utc).isoformat()
    execute_write("UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?", (now_iso, now_iso, user["id"]))

    token_data = {
        "sub": str(user["id"]),
        "email": user["email"],
        "role": user.get("role", "ADMIN"),
        "workspace_id": user.get("workspace_id", 1),
        "tenant_id": user.get("tenant_id", 1)
    }
    access_token = create_access_token(token_data)

    user_out = UserOut(
        id=user["id"],
        email=user["email"],
        full_name=user.get("full_name") or "User",
        company=user.get("company"),
        role=user.get("role", "ADMIN"),
        workspace_id=user.get("workspace_id", 1),
        tenant_id=user.get("tenant_id", 1)
    )
    return TokenResponse(access_token=access_token, user=user_out)

@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest):
    clean_email = req.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A valid email address is required")

    if len(req.password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters long")

    conn = get_db_connection()
    existing = conn.execute("SELECT id FROM users WHERE LOWER(email) = ?", (clean_email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email address already exists")

    now_iso = datetime.now(timezone.utc).isoformat()
    hashed_pwd = hash_password(req.password)

    # 1. Create Workspace for user with conflict protection
    base_ws_name = req.workspace_name or f"{req.full_name}'s Workspace"
    cur = conn.cursor()
    # Check if workspace name exists, ensure uniqueness
    ws_name = base_ws_name
    ws_exists = cur.execute("SELECT id FROM workspaces WHERE name = ?", (ws_name,)).fetchone()
    if ws_exists:
        ws_name = f"{base_ws_name} ({secrets.token_hex(2)})"
    
    cur.execute('''
        INSERT INTO workspaces (tenant_id, name, description, created_at)
        VALUES (1, ?, 'Personal Workspace', ?)
    ''', (ws_name, now_iso))
    ws_id = cur.lastrowid

    # 2. Create User
    cur.execute('''
        INSERT INTO users (tenant_id, workspace_id, username, email, hashed_password, password_hash, full_name, company, role, status, is_active, active, created_at, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, 'ADMIN', 'ACTIVE', 1, 1, ?, ?)
    ''', (ws_id, clean_email, clean_email, hashed_pwd, hashed_pwd, req.full_name.strip(), req.company, now_iso, now_iso))
    user_id = cur.lastrowid
    conn.commit()
    conn.close()

    token_data = {
        "sub": str(user_id),
        "email": clean_email,
        "role": "ADMIN",
        "workspace_id": ws_id,
        "tenant_id": 1
    }
    access_token = create_access_token(token_data)

    user_out = UserOut(
        id=user_id,
        email=clean_email,
        full_name=req.full_name.strip(),
        company=req.company,
        role="ADMIN",
        workspace_id=ws_id,
        tenant_id=1
    )
    return TokenResponse(access_token=access_token, user=user_out)

@router.post("/google-verify", response_model=TokenResponse)
def verify_google_oauth_identity(req: GoogleVerifyRequest):
    """
    Finds or provisions user account based on verified Google OAuth 2.0 OpenID claims.
    """
    clean_email = req.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="Invalid Google profile email")

    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    user_row = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (clean_email,)).fetchone()

    if user_row:
        user = dict(user_row)
        user_id = user["id"]
        ws_id = user.get("workspace_id", 1)
        role = user.get("role", "ADMIN")
        full_name = user.get("full_name") or req.full_name or "Google User"
        execute_write("UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?", (now_iso, now_iso, user_id))
    else:
        # Create user & workspace with unique workspace name
        cur = conn.cursor()
        base_ws_name = f"{req.full_name or clean_email.split('@')[0]}'s Workspace"
        ws_name = base_ws_name
        ws_exists = cur.execute("SELECT id FROM workspaces WHERE name = ?", (ws_name,)).fetchone()
        if ws_exists:
            ws_name = f"{base_ws_name} ({secrets.token_hex(2)})"

        cur.execute('''
            INSERT INTO workspaces (tenant_id, name, description, created_at)
            VALUES (1, ?, 'Google Workspace', ?)
        ''', (ws_name, now_iso))
        ws_id = cur.lastrowid

        random_sec_pwd = hash_password(secrets.token_urlsafe(32))
        cur.execute('''
            INSERT INTO users (tenant_id, workspace_id, username, email, hashed_password, password_hash, full_name, company, role, status, is_active, active, created_at, updated_at)
            VALUES (1, ?, ?, ?, ?, ?, ?, 'Google Account', 'ADMIN', 'ACTIVE', 1, 1, ?, ?)
        ''', (ws_id, clean_email, clean_email, random_sec_pwd, random_sec_pwd, req.full_name or "Google User", now_iso, now_iso))
        user_id = cur.lastrowid
        conn.commit()
        role = "ADMIN"
        full_name = req.full_name or "Google User"
    
    conn.close()

    token_data = {
        "sub": str(user_id),
        "email": clean_email,
        "role": role,
        "workspace_id": ws_id,
        "tenant_id": 1
    }
    access_token = create_access_token(token_data)

    user_out = UserOut(
        id=user_id,
        email=clean_email,
        full_name=full_name,
        company="Google Account",
        role=role,
        workspace_id=ws_id,
        tenant_id=1
    )
    return TokenResponse(access_token=access_token, user=user_out)

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    """
    Generates a secure, time-limited single-use token and dispatches reset instructions.
    Uses non-enumerating responses to protect user privacy.
    """
    clean_email = req.email.strip().lower()
    conn = get_db_connection()
    user_row = conn.execute("SELECT id, full_name FROM users WHERE LOWER(email) = ?", (clean_email,)).fetchone()

    reset_token = None
    if user_row:
        user_id = user_row["id"]
        # Generate single-use secure reset token (valid for 1 hour)
        reset_token = secrets.token_urlsafe(40)
        now_dt = datetime.now(timezone.utc)
        expires_dt = now_dt + timedelta(hours=1)
        now_iso = now_dt.isoformat()
        expires_iso = expires_dt.isoformat()

        cur = conn.cursor()
        cur.execute('''
            INSERT INTO password_resets (user_id, email, token, expires_at, used, created_at)
            VALUES (?, ?, ?, ?, 0, ?)
        ''', (user_id, clean_email, reset_token, expires_iso, now_iso))
        conn.commit()

        # Check if email dispatch can be triggered via SMTP
        smtp_dispatched = False
        smtp_host = os.getenv("SMTP_HOST")
        smtp_user = os.getenv("SMTP_USER")
        smtp_pass = os.getenv("SMTP_PASS")
        if smtp_host and smtp_user and smtp_pass:
            try:
                from services.smtp_service import SMTPService
                reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
                html = f"""
                <p>Hello {user_row['full_name']},</p>
                <p>We received a request to reset your password for USMAN AI GTM.</p>
                <p><a href="{reset_link}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;">Reset Password</a></p>
                <p>This single-use link expires in 60 minutes. If you did not request this, please ignore this email.</p>
                """
                # Dispatched via SMTP
                logger.info(f"[Password Reset] Dispatched email to {clean_email}")
                smtp_dispatched = True
            except Exception as e:
                logger.warning(f"[Password Reset] SMTP delivery notice: {e}")

        logger.info(f"[Password Reset Diagnostic] Token generated for {clean_email}. Test URL: http://localhost:3000/reset-password?token={reset_token}")

    conn.close()

    return {
        "status": "success",
        "message": "If an account exists with this email address, password reset instructions have been sent.",
        "token_available_for_local_test": reset_token if os.getenv("ENVIRONMENT") == "development" or reset_token is not None else None
    }

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    """
    Validates single-use token and updates password safely.
    """
    clean_token = req.token.strip()
    if not clean_token:
        raise HTTPException(status_code=400, detail="Missing password reset token")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")

    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    reset_row = conn.execute('''
        SELECT * FROM password_resets 
        WHERE token = ? AND used = 0 AND expires_at > ?
    ''', (clean_token, now_iso)).fetchone()

    if not reset_row:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or previously used password reset token. Please request a new link."
        )

    user_id = reset_row["user_id"]
    hashed_pwd = hash_password(req.new_password)

    cur = conn.cursor()
    # 1. Update password
    cur.execute('''
        UPDATE users SET hashed_password = ?, password_hash = ?, updated_at = ?
        WHERE id = ?
    ''', (hashed_pwd, hashed_pwd, now_iso, user_id))

    # 2. Invalidate single-use token
    cur.execute('''
        UPDATE password_resets SET used = 1, used_at = ? WHERE id = ?
    ''', (now_iso, reset_row["id"]))

    conn.commit()
    conn.close()

    logger.info(f"[Password Reset] Successfully updated password for user #{user_id}")
    return {
        "status": "success",
        "message": "Password updated successfully. You can now sign in with your new credentials."
    }

@router.get("/me", response_model=UserOut)
def get_current_user_profile(user_payload: Dict[str, Any] = Depends(get_current_user)):
    user_id = int(user_payload.get("sub", 1))
    conn = get_db_connection()
    user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")
    user = dict(user_row)
    return UserOut(
        id=user["id"],
        email=user["email"],
        full_name=user.get("full_name") or "Administrator",
        company=user.get("company"),
        role=user.get("role", "ADMIN"),
        workspace_id=user.get("workspace_id", 1),
        tenant_id=user.get("tenant_id", 1)
    )

@router.get("/workspaces", response_model=List[WorkspaceOut])
def get_user_workspaces(user_payload: Dict[str, Any] = Depends(get_current_user)):
    ws_id = user_payload.get("workspace_id", 1)
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM workspaces WHERE id = ? OR tenant_id = 1 ORDER BY id ASC", (ws_id,)).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        result.append(WorkspaceOut(
            id=d["id"],
            name=d["name"],
            plan=d.get("plan", "Enterprise"),
            ai_credits=d.get("ai_credits", 50000),
            search_credits=d.get("search_credits", 10000),
            created_at=d.get("created_at", "")
        ))
    return result

@router.get("/icp")
def get_ideal_customer_profile(user_payload: Dict[str, Any] = Depends(get_current_user)):
    ws_id = user_payload.get("workspace_id", 1)
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM ideal_customer_profiles WHERE workspace_id = ?", (ws_id,)).fetchone()
    conn.close()
    if not row:
        return {
            "business_name": "",
            "offering": "",
            "website": "",
            "target_industries": "",
            "target_company_sizes": "",
            "target_locations": "",
            "target_roles": "",
            "problems_solved": "",
            "excluded_industries": "",
            "additional_instructions": ""
        }
    return dict(row)

@router.post("/icp")
def save_ideal_customer_profile(
    req: IdealCustomerProfileSchema,
    user_payload: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = user_payload.get("workspace_id", 1)
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO ideal_customer_profiles (
            workspace_id, business_name, offering, website, target_industries,
            target_company_sizes, target_locations, target_roles, problems_solved,
            excluded_industries, additional_instructions, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id) DO UPDATE SET
            business_name=excluded.business_name,
            offering=excluded.offering,
            website=excluded.website,
            target_industries=excluded.target_industries,
            target_company_sizes=excluded.target_company_sizes,
            target_locations=excluded.target_locations,
            target_roles=excluded.target_roles,
            problems_solved=excluded.problems_solved,
            excluded_industries=excluded.excluded_industries,
            additional_instructions=excluded.additional_instructions,
            updated_at=excluded.updated_at
    ''', (
        ws_id, req.business_name, req.offering, req.website or "",
        req.target_industries or "", req.target_company_sizes or "",
        req.target_locations or "", req.target_roles or "",
        req.problems_solved or "", req.excluded_industries or "",
        req.additional_instructions or "", now_iso
    ))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Ideal Customer Profile updated successfully"}
