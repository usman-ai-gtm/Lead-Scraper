"""
USMAN AI GTM - Production Database Connection & Migration Layer
Provides thread-safe connections, non-destructive additive migrations,
and unified access across usman_data_analytics.db and connected modules.
"""

import os
import sqlite3
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.app.core.config import settings

logger = logging.getLogger("USMAN_BACKEND_DB")

def get_db_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    target = db_path or settings.DATABASE_PATH
    os.makedirs(os.path.dirname(os.path.abspath(target)), exist_ok=True)
    conn = sqlite3.connect(target, check_same_thread=False, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

def execute_query(sql: str, params: tuple = (), fetch_all: bool = True, db_path: Optional[str] = None) -> Any:
    conn = get_db_connection(db_path)
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        if fetch_all:
            rows = cur.fetchall()
            return [dict(r) for r in rows]
        else:
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()

def execute_write(sql: str, params: tuple = (), db_path: Optional[str] = None) -> int:
    conn = get_db_connection(db_path)
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()

def init_app_database():
    """
    Non-destructive initialization of users, tenants, workspaces, and system settings.
    Preserves all existing data in usman_data_analytics.db and tables created previously.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # 1. Tenants table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS tenants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            plan TEXT NOT NULL DEFAULT 'Enterprise',
            credits INTEGER DEFAULT 50000,
            created_at TEXT NOT NULL
        )
    ''')
    cur.execute("SELECT id FROM tenants WHERE id = 1")
    if not cur.fetchone():
        cur.execute("INSERT OR IGNORE INTO tenants (id, name, plan, credits, created_at) VALUES (1, 'Primary Tenant', 'Enterprise', 50000, ?)", (now_iso,))

    # 2. Workspaces table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS workspaces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER DEFAULT 1,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL
        )
    ''')
    cur.execute("SELECT id FROM workspaces WHERE id = 1")
    if not cur.fetchone():
        cur.execute("INSERT OR IGNORE INTO workspaces (id, tenant_id, name, description, created_at) VALUES (1, 1, 'Default Workspace', 'Primary Workspace', ?)", (now_iso,))

    # 3. Users table with real auth & migration
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER DEFAULT 1,
            workspace_id INTEGER DEFAULT 1,
            email TEXT UNIQUE,
            username TEXT,
            hashed_password TEXT,
            password_hash TEXT,
            full_name TEXT DEFAULT 'Administrator',
            company TEXT DEFAULT 'USMAN AI GTM',
            role TEXT NOT NULL DEFAULT 'ADMIN',
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            is_active INTEGER DEFAULT 1,
            active INTEGER DEFAULT 1,
            last_login TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    # Add missing columns if users table existed previously with older schema
    cur.execute("PRAGMA table_info(users)")
    user_cols = {r[1] for r in cur.fetchall()}
    for col, ctype in [
        ("email", "TEXT"),
        ("hashed_password", "TEXT"),
        ("full_name", "TEXT"),
        ("company", "TEXT"),
        ("workspace_id", "INTEGER DEFAULT 1"),
        ("status", "TEXT DEFAULT 'ACTIVE'"),
        ("is_active", "INTEGER DEFAULT 1"),
        ("last_login", "TEXT"),
        ("updated_at", "TEXT"),
    ]:
        if col not in user_cols:
            try:
                cur.execute(f"ALTER TABLE users ADD COLUMN {col} {ctype}")
            except Exception as e:
                logger.debug(f"Column {col} already exists or alter skipped: {e}")

    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)")

    # Seed initial admin user if not present (password: UsmanGTM@2026!)
    from backend.app.core.security import hash_password
    cur.execute("SELECT id FROM users WHERE email = 'admin@usmanai.com'")
    admin_row = cur.fetchone()
    if not admin_row:
        admin_pass_hash = hash_password("UsmanGTM@2026!")
        cur.execute('''
            INSERT INTO users (tenant_id, workspace_id, username, email, hashed_password, password_hash, full_name, company, role, status, is_active, active, created_at, updated_at)
            VALUES (1, 1, 'admin@usmanai.com', 'admin@usmanai.com', ?, ?, 'Administrator', 'USMAN AI GTM', 'ADMIN', 'ACTIVE', 1, 1, ?, ?)
        ''', (admin_pass_hash, admin_pass_hash, now_iso, now_iso))

    # 4. Activity Logs table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS user_activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            user_id INTEGER,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id TEXT,
            details TEXT,
            ip_address TEXT,
            created_at TEXT NOT NULL
        )
    ''')
    
    # 5. Global System Notifications Center
    cur.execute('''
        CREATE TABLE IF NOT EXISTS system_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
            category TEXT DEFAULT 'system',
            is_read INTEGER DEFAULT 0,
            link TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    # Insert sample onboarding notifications if empty
    cur.execute("SELECT COUNT(*) FROM system_notifications")
    notif_count = cur.fetchone()[0]
    if notif_count == 0:
        cur.execute('''
            INSERT INTO system_notifications (workspace_id, title, message, type, category, is_read, link, created_at)
            VALUES (1, 'Welcome to USMAN AI GTM', 'Your enterprise revenue operations workspace is initialized and ready.', 'success', 'system', 0, '/app', ?)
        ''', (now_iso,))

    conn.commit()
    conn.close()
    logger.info("Application database initialized and verified.")

# Initialize upon module import
try:
    init_app_database()
except Exception as e:
    logger.warning(f"Database init warning: {e}")
