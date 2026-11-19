"""
USMAN AI GTM - Production Database Connection & Migration Layer
Provides thread-safe connections, non-destructive additive migrations,
and unified access across usman_data_analytics.db and connected modules.
"""

import os
import re
import sqlite3
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.app.core.config import settings

logger = logging.getLogger("USMAN_BACKEND_DB")

def is_postgres() -> bool:
    url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or ""
    return url.startswith("postgres://") or url.startswith("postgresql://")

def get_postgres_connection():
    from backend.app.core.cloud_db import get_cloud_connection
    return get_cloud_connection()

def get_db_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    target = db_path or settings.DATABASE_PATH
    os.makedirs(os.path.dirname(os.path.abspath(target)), exist_ok=True)
    conn = sqlite3.connect(target, check_same_thread=False, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

def execute_query(sql: str, params: tuple = (), fetch_all: bool = True, db_path: Optional[str] = None) -> Any:
    if is_postgres():
        from psycopg2.extras import RealDictCursor
        conn = get_postgres_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            pg_sql = sql.replace('?', '%s')
            cur.execute(pg_sql, params)
            if fetch_all:
                rows = cur.fetchall()
                return [dict(r) for r in rows]
            else:
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            cur.close()
            conn.close()
    else:
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
    if is_postgres():
        conn = get_postgres_connection()
        cur = conn.cursor()
        try:
            pg_sql = sql.replace('?', '%s')
            pg_sql = re.sub(r'INSERT\s+OR\s+IGNORE\s+INTO', 'INSERT INTO', pg_sql, flags=re.IGNORECASE)
            is_insert = bool(re.match(r'^\s*INSERT\s+INTO', pg_sql, re.IGNORECASE))
            if is_insert and "ON CONFLICT" not in pg_sql.upper():
                pg_sql = f"{pg_sql.rstrip(';')} ON CONFLICT DO NOTHING"
            if is_insert and "RETURNING" not in pg_sql.upper():
                pg_sql = f"{pg_sql.rstrip(';')} RETURNING id"

            cur.execute(pg_sql, params)
            last_id = 0
            if is_insert:
                try:
                    row = cur.fetchone()
                    if row:
                        last_id = row[0]
                except Exception:
                    pass
            conn.commit()
            return last_id
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()
            conn.close()
    else:
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
    Preserves all existing data in usman_data_analytics.db or Cloud PostgreSQL.
    """
    if is_postgres():
        schema_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs", "cloud_postgres_schema.sql"))
        if os.path.exists(schema_path):
            try:
                conn = get_postgres_connection()
                cur = conn.cursor()
                with open(schema_path, "r", encoding="utf-8") as f:
                    cur.execute(f.read())
                conn.commit()
                cur.close()
                conn.close()
                logger.info("Cloud PostgreSQL schema initialized and verified.")
            except Exception as e:
                logger.warning(f"Cloud PostgreSQL schema init warning: {e}")
        return

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
        ("must_change_password", "INTEGER DEFAULT 0"),
        ("created_by", "INTEGER DEFAULT 1"),
        ("client_notes", "TEXT DEFAULT ''"),
        ("max_leads_quota", "INTEGER DEFAULT 5000"),
        ("last_login", "TEXT"),
        ("updated_at", "TEXT"),
    ]:
        if col not in user_cols and re.match(r'^[a-zA-Z0-9_]+$', col):
            try:
                cur.execute(f'ALTER TABLE users ADD COLUMN "{col}" {ctype}')
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

    # 6. Leads table migration for additive columns
    cur.execute("PRAGMA table_info(leads)")
    lead_cols = {r[1] for r in cur.fetchall()}
    for col, ctype in [
        ("fit_score", "INTEGER DEFAULT 50"),
        ("phone_status", "TEXT DEFAULT 'Unverified'"),
        ("source_url", "TEXT"),
        ("search_keyword", "TEXT"),
        ("search_location", "TEXT"),
        ("date_discovered", "TEXT"),
        ("domain", "TEXT"),
        ("original_source_url", "TEXT"),
        ("email_source_url", "TEXT"),
        ("phone_source_url", "TEXT"),
        ("source_platform", "TEXT"),
        ("saved_date", "TEXT"),
        ("saved_time", "TEXT"),
        ("extraction_date", "TEXT"),
        ("extraction_time", "TEXT"),
    ]:
        if col not in lead_cols and re.match(r'^[a-zA-Z0-9_]+$', col):
            try:
                cur.execute(f'ALTER TABLE leads ADD COLUMN "{col}" {ctype}')
            except Exception as e:
                pass

    # 7. Search Records & History table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS search_records (
            id TEXT PRIMARY KEY,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            user_id INTEGER NOT NULL DEFAULT 1,
            keyword TEXT NOT NULL,
            country TEXT NOT NULL,
            city TEXT DEFAULT '',
            sources TEXT NOT NULL,
            requested_quantity INTEGER NOT NULL,
            qualified_quantity INTEGER NOT NULL,
            leads_with_phone INTEGER NOT NULL DEFAULT 0,
            search_status TEXT NOT NULL DEFAULT 'COMPLETED',
            search_date TEXT NOT NULL,
            search_time TEXT NOT NULL,
            completion_time TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')
    cur.execute("CREATE INDEX IF NOT EXISTS idx_search_records_ws ON search_records(workspace_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_search_records_date ON search_records(search_date)")

    # 8. Search Record Leads link table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS search_record_leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            search_record_id TEXT NOT NULL,
            lead_id INTEGER NOT NULL,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            lead_snapshot TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(search_record_id) REFERENCES search_records(id),
            FOREIGN KEY(lead_id) REFERENCES leads(id)
        )
    ''')
    cur.execute("CREATE INDEX IF NOT EXISTS idx_srl_search_id ON search_record_leads(search_record_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_srl_lead_id ON search_record_leads(lead_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_srl_ws ON search_record_leads(workspace_id)")

    # 9. Export History table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS export_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            user_id INTEGER NOT NULL DEFAULT 1,
            export_target TEXT NOT NULL,
            search_record_id TEXT,
            export_date_filter TEXT,
            format TEXT NOT NULL,
            record_count INTEGER NOT NULL,
            export_date TEXT NOT NULL,
            export_time TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')
    cur.execute("CREATE INDEX IF NOT EXISTS idx_export_history_ws ON export_history(workspace_id)")

    # 7. Password Resets table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            email TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER DEFAULT 0,
            used_at TEXT,
            created_at TEXT NOT NULL
        )
    ''')
    cur.execute("CREATE INDEX IF NOT EXISTS idx_pw_reset_token ON password_resets(token)")

    # 7. Ideal Customer Profiles (My Business & Ideal Customers)
    cur.execute('''
        CREATE TABLE IF NOT EXISTS ideal_customer_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL UNIQUE,
            business_name TEXT,
            offering TEXT,
            website TEXT,
            target_industries TEXT,
            target_company_sizes TEXT,
            target_locations TEXT,
            target_roles TEXT,
            problems_solved TEXT,
            excluded_industries TEXT,
            additional_instructions TEXT,
            updated_at TEXT NOT NULL
        )
    ''')

    conn.commit()
    conn.close()
    logger.info("Application database initialized and verified.")

# Compatibility alias for CI/CD pipelines
init_db = init_app_database

# Initialize upon module import
try:
    init_app_database()
except Exception as e:
    logger.warning(f"Database init warning: {e}")
