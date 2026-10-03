"""
USMAN AI GTM - Authentication & Workspace API Endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any, List
from datetime import datetime, timezone

from backend.app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserOut, WorkspaceOut, WorkspaceSwitchRequest
from backend.app.core.database import get_db_connection, execute_write
from backend.app.core.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    conn = get_db_connection()
    user_row = conn.execute("SELECT * FROM users WHERE email = ?", (req.email.strip().lower(),)).fetchone()
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
    execute_write("UPDATE users SET last_login = ? WHERE id = ?", (now_iso, user["id"]))

    token_data = {
        "sub": str(user["id"]),
        "email": user["email"],
        "role": user["role"],
        "workspace_id": user.get("workspace_id", 1),
        "tenant_id": user.get("tenant_id", 1)
    }
    access_token = create_access_token(token_data)

    user_out = UserOut(
        id=user["id"],
        email=user["email"],
        full_name=user.get("full_name") or "Administrator",
        company=user.get("company"),
        role=user["role"],
        workspace_id=user.get("workspace_id", 1),
        tenant_id=user.get("tenant_id", 1)
    )
    return TokenResponse(access_token=access_token, user=user_out)

@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest):
    conn = get_db_connection()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (req.email.strip().lower(),)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered")

    now_iso = datetime.now(timezone.utc).isoformat()
    hashed_pwd = hash_password(req.password)

    # 1. Create Workspace for user
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO workspaces (tenant_id, name, description, created_at)
        VALUES (1, ?, 'Personal Workspace', ?)
    ''', (req.workspace_name or f"{req.full_name}'s Workspace", now_iso))
    ws_id = cur.lastrowid

    # 2. Create User
    cur.execute('''
        INSERT INTO users (tenant_id, workspace_id, username, email, hashed_password, password_hash, full_name, company, role, status, is_active, active, created_at, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, 'ADMIN', 'ACTIVE', 1, 1, ?, ?)
    ''', (ws_id, req.email.strip().lower(), req.email.strip().lower(), hashed_pwd, hashed_pwd, req.full_name, req.company, now_iso, now_iso))
    user_id = cur.lastrowid
    conn.commit()
    conn.close()

    token_data = {
        "sub": str(user_id),
        "email": req.email.strip().lower(),
        "role": "ADMIN",
        "workspace_id": ws_id,
        "tenant_id": 1
    }
    access_token = create_access_token(token_data)

    user_out = UserOut(
        id=user_id,
        email=req.email.strip().lower(),
        full_name=req.full_name,
        company=req.company,
        role="ADMIN",
        workspace_id=ws_id,
        tenant_id=1
    )
    return TokenResponse(access_token=access_token, user=user_out)

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
        role=user["role"],
        workspace_id=user.get("workspace_id", 1),
        tenant_id=user.get("tenant_id", 1)
    )

@router.get("/workspaces", response_model=List[WorkspaceOut])
def get_user_workspaces(user_payload: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM workspaces ORDER BY id ASC").fetchall()
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
