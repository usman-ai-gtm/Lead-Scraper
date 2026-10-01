"""
USMAN AI GTM - PERSISTENT MULTI-ACCOUNT DATABASE LAYER
Implements production-ready connection management, additive schema migrations,
and unified CRUD operations for Connected Accounts (Gmail, Outlook, SMTP, WhatsApp Business).
"""

import os
import json
import sqlite3
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, date

logger = logging.getLogger("USMAN_DATABASE")

# Primary Database Path determination (local file or DATABASE_URL)
def get_db_path() -> str:
    """
    Returns the resolved database path.
    Prioritizes:
    1. os.getenv("DATABASE_URL") (if sqlite url)
    2. os.getenv("USMAN_DB_PATH")
    3. usman_data_analytics.db (existing enterprise database)
    4. data/usman_ai_gtm.db (if data dir exists)
    """
    db_url = os.getenv("DATABASE_URL")
    if db_url and db_url.startswith("sqlite:///"):
        return db_url.replace("sqlite:///", "")

    env_path = os.getenv("USMAN_DB_PATH")
    if env_path:
        return env_path

    legacy_default = "usman_data_analytics.db"
    if os.path.exists(legacy_default):
        return legacy_default

    local_preferred = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "usman_ai_gtm.db")
    if os.path.exists(local_preferred) or os.path.exists(os.path.dirname(local_preferred)):
        return local_preferred

    return legacy_default


def get_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    target = db_path or get_db_path()
    os.makedirs(os.path.dirname(os.path.abspath(target)), exist_ok=True)
    conn = sqlite3.connect(target, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_connected_accounts_tables(db_path: Optional[str] = None):
    """
    Additive, non-destructive migration script that ensures all connected account
    management, credential storage, message logs, and audit tables exist.
    """
    conn = get_connection(db_path)
    cur = conn.cursor()

    # 1. Main Connected Accounts Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS connected_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            user_id INTEGER NOT NULL DEFAULT 1,
            account_type TEXT NOT NULL,         -- 'email', 'whatsapp', 'crm'
            provider TEXT NOT NULL,             -- 'gmail', 'outlook', 'smtp', 'meta_whatsapp'
            display_name TEXT NOT NULL,
            external_account_id TEXT,          -- Google Sub ID or Meta WABA ID
            external_identity TEXT NOT NULL,    -- Email address or WhatsApp Phone number
            status TEXT NOT NULL DEFAULT 'CONNECTED', -- 'CONNECTED', 'CHECKING', 'ACTION REQUIRED', 'DISCONNECTED', 'ERROR', 'DISABLED'
            is_default INTEGER DEFAULT 0,
            is_enabled INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_used_at TEXT,
            last_success_at TEXT,
            last_error_at TEXT,
            last_error_code TEXT,
            last_error_message TEXT,
            extra_config TEXT                   -- JSON settings (e.g. host, port, waba_id, phone_number_id)
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_conn_acc_ws ON connected_accounts(workspace_id)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_conn_acc_prov ON connected_accounts(provider)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_conn_acc_status ON connected_accounts(status)')

    # 2. OAuth & Encrypted Credentials Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS oauth_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            provider TEXT NOT NULL,
            credential_reference TEXT,
            encrypted_access_token TEXT NOT NULL,
            encrypted_refresh_token TEXT,
            token_expiry TEXT,
            scope_information TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_oauth_acc ON oauth_credentials(account_id)')

    # 3. Account Health Telemetry
    cur.execute('''
        CREATE TABLE IF NOT EXISTS account_health (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            api_reachable INTEGER DEFAULT 1,
            auth_valid INTEGER DEFAULT 1,
            health_status TEXT DEFAULT 'HEALTHY', -- 'HEALTHY', 'DEGRADED', 'ACTION_REQUIRED', 'ERROR'
            last_checked_at TEXT NOT NULL,
            health_score INTEGER DEFAULT 100,
            details TEXT,                          -- JSON diagnostic details
            FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_acc_health ON account_health(account_id)')

    # 4. Account Daily Usage Tracking
    cur.execute('''
        CREATE TABLE IF NOT EXISTS account_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            usage_date TEXT NOT NULL,              -- YYYY-MM-DD
            messages_sent INTEGER DEFAULT 0,
            messages_delivered INTEGER DEFAULT 0,
            messages_read INTEGER DEFAULT 0,
            messages_replied INTEGER DEFAULT 0,
            messages_failed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(account_id, usage_date),
            FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_acc_usage ON account_usage(account_id, usage_date)')

    # 5. Unified Message Logging
    cur.execute('''
        CREATE TABLE IF NOT EXISTS message_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id TEXT UNIQUE NOT NULL,       -- Internal UUID
            workspace_id INTEGER NOT NULL DEFAULT 1,
            campaign_id INTEGER,
            lead_id INTEGER,
            account_id INTEGER NOT NULL,
            channel TEXT NOT NULL,                 -- 'email', 'whatsapp'
            provider TEXT NOT NULL,                -- 'gmail', 'outlook', 'smtp', 'meta_whatsapp'
            recipient TEXT NOT NULL,
            subject TEXT,
            body TEXT,
            status TEXT DEFAULT 'Sent',            -- 'Queued', 'Sent', 'Delivered', 'Read', 'Replied', 'Failed', 'Bounced', 'Suppressed'
            sent_at TEXT NOT NULL,
            delivered_at TEXT,
            read_at TEXT,
            replied_at TEXT,
            error TEXT,
            provider_message_id TEXT,              -- Provider RFC or wamid
            FOREIGN KEY (account_id) REFERENCES connected_accounts(id)
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_msg_logs_ws ON message_logs(workspace_id)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_msg_logs_acc ON message_logs(account_id)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_msg_logs_camp ON message_logs(campaign_id)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_msg_logs_status ON message_logs(status)')

    # 6. Granular Message Delivery & Reply Events
    cur.execute('''
        CREATE TABLE IF NOT EXISTS message_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_log_id INTEGER,
            event_type TEXT NOT NULL,              -- 'sent', 'delivered', 'read', 'replied', 'bounced', 'failed', 'suppressed'
            event_payload TEXT,                    -- JSON webhook payload
            timestamp TEXT NOT NULL,
            FOREIGN KEY (message_log_id) REFERENCES message_logs(id)
        )
    ''')

    # 7. Campaign Multi-Account Pool & Weighting
    cur.execute('''
        CREATE TABLE IF NOT EXISTS campaign_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL,
            account_id INTEGER NOT NULL,
            routing_weight INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            UNIQUE(campaign_id, account_id),
            FOREIGN KEY (account_id) REFERENCES connected_accounts(id)
        )
    ''')

    # 8. Account Audit & Security Telemetry (Zero Plaintext Secrets)
    cur.execute('''
        CREATE TABLE IF NOT EXISTS account_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            actor TEXT NOT NULL DEFAULT 'User',
            account_id INTEGER,
            action TEXT NOT NULL,                  -- 'connected', 'disconnected', 'updated', 'enabled', 'disabled', 'test_sent', 'campaign_sent', 'token_refreshed', 'auth_failed'
            result TEXT NOT NULL,                  -- 'SUCCESS', 'FAILED', 'WARNING'
            details TEXT,                          -- Safe sanitized JSON summary
            timestamp TEXT NOT NULL
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_audit_ws ON account_audit_logs(workspace_id)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_audit_acc ON account_audit_logs(account_id)')

    # 9. Ensure email_suppressions exists in current database
    cur.execute('''
        CREATE TABLE IF NOT EXISTS email_suppressions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            email TEXT UNIQUE NOT NULL,
            domain TEXT,
            reason TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')

    conn.commit()
    conn.close()
    logger.info("Connected Accounts database schema initialized successfully.")

# Safe initialization call on module import for all active databases
try:
    init_connected_accounts_tables()
    legacy_db = os.getenv("USMAN_DB_PATH", "usman_data_analytics.db")
    if os.path.exists(legacy_db):
        init_connected_accounts_tables(legacy_db)
except Exception as e:
    logger.warning(f"Database initialization note: {e}")

