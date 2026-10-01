"""
USMAN AI GTM - MODELS & PERSISTENCE REPOSITORY FOR CONNECTED ACCOUNTS
Provides clean type-safe CRUD operations, audit logging, and usage metrics tracking.
"""

import os
import json
import sqlite3
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, date

from database.database import get_connection
from database.encryption import encrypt_secret, decrypt_secret, mask_secret

logger = logging.getLogger("USMAN_MODELS")

class AccountRepository:
    """
    CRUD repository for Connected Accounts and credentials.
    """

    @classmethod
    def get_accounts(
        cls,
        workspace_id: int = 1,
        account_type: Optional[str] = None,
        provider: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        conn = get_connection()
        query = "SELECT * FROM connected_accounts WHERE workspace_id = ?"
        params: List[Any] = [workspace_id]

        if account_type:
            query += " AND account_type = ?"
            params.append(account_type)
        if provider:
            query += " AND provider = ?"
            params.append(provider)
        if status:
            query += " AND status = ?"
            params.append(status)

        query += " ORDER BY is_default DESC, id DESC"
        rows = conn.execute(query, params).fetchall()
        accounts = []
        for r in rows:
            acc = dict(r)
            if acc.get("extra_config"):
                try:
                    acc["extra_config"] = json.loads(acc["extra_config"])
                except Exception:
                    acc["extra_config"] = {}
            else:
                acc["extra_config"] = {}
            accounts.append(acc)
        conn.close()
        return accounts

    @classmethod
    def get_account_by_id(cls, account_id: int) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        row = conn.execute("SELECT * FROM connected_accounts WHERE id = ?", (account_id,)).fetchone()
        conn.close()
        if not row:
            return None
        acc = dict(row)
        if acc.get("extra_config"):
            try:
                acc["extra_config"] = json.loads(acc["extra_config"])
            except Exception:
                acc["extra_config"] = {}
        else:
            acc["extra_config"] = {}
        return acc

    @classmethod
    def get_account_by_identity(cls, external_identity: str, workspace_id: int = 1) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        row = conn.execute(
            "SELECT * FROM connected_accounts WHERE external_identity = ? AND workspace_id = ?",
            (external_identity.strip(), workspace_id)
        ).fetchone()
        conn.close()
        if not row:
            return None
        acc = dict(row)
        if acc.get("extra_config"):
            try:
                acc["extra_config"] = json.loads(acc["extra_config"])
            except Exception:
                acc["extra_config"] = {}
        return acc

    @classmethod
    def create_or_update_account(
        cls,
        workspace_id: int,
        account_type: str,
        provider: str,
        display_name: str,
        external_identity: str,
        external_account_id: Optional[str] = None,
        status: str = "CONNECTED",
        extra_config: Optional[Dict[str, Any]] = None,
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None,
        token_expiry: Optional[str] = None,
        scope_info: Optional[str] = None,
        is_default: bool = False
    ) -> int:
        conn = get_connection()
        cur = conn.cursor()
        now_iso = datetime.now().isoformat()
        extra_json = json.dumps(extra_config or {})

        # Check existing by external_identity and workspace
        existing = cur.execute(
            "SELECT id FROM connected_accounts WHERE external_identity = ? AND workspace_id = ?",
            (external_identity.strip(), workspace_id)
        ).fetchone()

        if existing:
            acc_id = existing["id"]
            cur.execute('''
                UPDATE connected_accounts SET
                    display_name = ?,
                    external_account_id = COALESCE(?, external_account_id),
                    status = ?,
                    extra_config = ?,
                    updated_at = ?,
                    last_success_at = ?
                WHERE id = ?
            ''', (display_name, external_account_id, status, extra_json, now_iso, now_iso, acc_id))
        else:
            # If this is the first account of its type, make it default
            count_same_type = cur.execute(
                "SELECT COUNT(*) FROM connected_accounts WHERE workspace_id = ? AND account_type = ?",
                (workspace_id, account_type)
            ).fetchone()[0]
            should_default = 1 if (is_default or count_same_type == 0) else 0

            cur.execute('''
                INSERT INTO connected_accounts (
                    workspace_id, user_id, account_type, provider, display_name,
                    external_account_id, external_identity, status, is_default,
                    is_enabled, created_at, updated_at, last_success_at, extra_config
                ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
            ''', (
                workspace_id, account_type, provider, display_name,
                external_account_id, external_identity.strip(), status,
                should_default, now_iso, now_iso, now_iso, extra_json
            ))
            acc_id = cur.lastrowid

        # Save or update encrypted credentials if provided
        if access_token:
            enc_access = encrypt_secret(access_token)
            enc_refresh = encrypt_secret(refresh_token) if refresh_token else None

            existing_cred = cur.execute(
                "SELECT id, encrypted_refresh_token FROM oauth_credentials WHERE account_id = ?",
                (acc_id,)
            ).fetchone()

            if existing_cred:
                # Keep old refresh token if new one is not supplied
                final_refresh = enc_refresh if enc_refresh else existing_cred["encrypted_refresh_token"]
                cur.execute('''
                    UPDATE oauth_credentials SET
                        encrypted_access_token = ?,
                        encrypted_refresh_token = ?,
                        token_expiry = ?,
                        scope_information = ?,
                        updated_at = ?
                    WHERE account_id = ?
                ''', (enc_access, final_refresh, token_expiry, scope_info, now_iso, acc_id))
            else:
                cur.execute('''
                    INSERT INTO oauth_credentials (
                        account_id, provider, credential_reference, encrypted_access_token,
                        encrypted_refresh_token, token_expiry, scope_information,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    acc_id, provider, f"cred_{provider}_{acc_id}", enc_access,
                    enc_refresh, token_expiry, scope_info, now_iso, now_iso
                ))

        # Initialize health record if not exists
        cur.execute('''
            INSERT OR IGNORE INTO account_health (account_id, api_reachable, auth_valid, health_status, last_checked_at, health_score)
            VALUES (?, 1, 1, 'HEALTHY', ?, 100)
        ''', (acc_id, now_iso))

        conn.commit()
        conn.close()

        # Audit log entry
        cls.log_audit(
            workspace_id=workspace_id,
            account_id=acc_id,
            action="connected" if not existing else "updated",
            result="SUCCESS",
            details=f"Account '{display_name}' ({external_identity}) saved with status {status}"
        )

        return acc_id

    @classmethod
    def get_credentials(cls, account_id: int) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        row = conn.execute("SELECT * FROM oauth_credentials WHERE account_id = ?", (account_id,)).fetchone()
        conn.close()
        if not row:
            return None
        cred = dict(row)
        cred["access_token"] = decrypt_secret(cred.get("encrypted_access_token"))
        cred["refresh_token"] = decrypt_secret(cred.get("encrypted_refresh_token"))
        return cred

    @classmethod
    def set_default_account(cls, account_id: int, workspace_id: int = 1):
        conn = get_connection()
        cur = conn.cursor()
        acc = cur.execute("SELECT account_type FROM connected_accounts WHERE id = ?", (account_id,)).fetchone()
        if acc:
            acc_type = acc["account_type"]
            cur.execute("UPDATE connected_accounts SET is_default = 0 WHERE workspace_id = ? AND account_type = ?", (workspace_id, acc_type))
            cur.execute("UPDATE connected_accounts SET is_default = 1 WHERE id = ?", (account_id,))
            conn.commit()
        conn.close()

    @classmethod
    def update_status(cls, account_id: int, status: str, error_msg: Optional[str] = None, error_code: Optional[str] = None):
        conn = get_connection()
        cur = conn.cursor()
        now_iso = datetime.now().isoformat()
        if error_msg:
            cur.execute('''
                UPDATE connected_accounts SET
                    status = ?,
                    last_error_at = ?,
                    last_error_message = ?,
                    last_error_code = ?,
                    updated_at = ?
                WHERE id = ?
            ''', (status, now_iso, error_msg, error_code, now_iso, account_id))
        else:
            cur.execute('''
                UPDATE connected_accounts SET
                    status = ?,
                    last_success_at = ?,
                    updated_at = ?
                WHERE id = ?
            ''', (status, now_iso, now_iso, account_id))
        conn.commit()
        conn.close()

    @classmethod
    def disconnect_account(cls, account_id: int, workspace_id: int = 1) -> bool:
        """
        Safely marks account DISCONNECTED, removes secrets, and records audit trail.
        Does NOT drop historical messages or CRM links.
        """
        conn = get_connection()
        cur = conn.cursor()
        now_iso = datetime.now().isoformat()
        acc = cur.execute("SELECT * FROM connected_accounts WHERE id = ?", (account_id,)).fetchone()
        if not acc:
            conn.close()
            return False

        # Set status DISCONNECTED
        cur.execute('''
            UPDATE connected_accounts SET
                status = 'DISCONNECTED',
                is_enabled = 0,
                is_default = 0,
                updated_at = ?
            WHERE id = ?
        ''', (now_iso, account_id))

        # Clear credentials securely
        cur.execute("DELETE FROM oauth_credentials WHERE account_id = ?", (account_id,))
        conn.commit()
        conn.close()

        cls.log_audit(
            workspace_id=workspace_id,
            account_id=account_id,
            action="disconnected",
            result="SUCCESS",
            details=f"Account #{account_id} disconnected and credentials purged."
        )
        return True

    @classmethod
    def record_usage(cls, account_id: int, sent: int = 0, delivered: int = 0, read: int = 0, replied: int = 0, failed: int = 0):
        conn = get_connection()
        cur = conn.cursor()
        today_str = date.today().isoformat()
        now_iso = datetime.now().isoformat()

        cur.execute('''
            INSERT INTO account_usage (account_id, usage_date, messages_sent, messages_delivered, messages_read, messages_replied, messages_failed, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(account_id, usage_date) DO UPDATE SET
                messages_sent = messages_sent + excluded.messages_sent,
                messages_delivered = messages_delivered + excluded.messages_delivered,
                messages_read = messages_read + excluded.messages_read,
                messages_replied = messages_replied + excluded.messages_replied,
                messages_failed = messages_failed + excluded.messages_failed,
                updated_at = excluded.updated_at
        ''', (account_id, today_str, sent, delivered, read, replied, failed, now_iso, now_iso))

        # Update last_used_at on connected_accounts
        cur.execute("UPDATE connected_accounts SET last_used_at = ?, updated_at = ? WHERE id = ?", (now_iso, now_iso, account_id))
        conn.commit()
        conn.close()

    @classmethod
    def get_account_usage_summary(cls, account_id: int) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        today_str = date.today().isoformat()
        row_today = cur.execute("SELECT * FROM account_usage WHERE account_id = ? AND usage_date = ?", (account_id, today_str)).fetchone()
        row_total = cur.execute('''
            SELECT SUM(messages_sent) as total_sent,
                   SUM(messages_delivered) as total_delivered,
                   SUM(messages_read) as total_read,
                   SUM(messages_replied) as total_replied,
                   SUM(messages_failed) as total_failed
            FROM account_usage WHERE account_id = ?
        ''', (account_id,)).fetchone()
        conn.close()

        return {
            "today_sent": row_today["messages_sent"] if row_today else 0,
            "today_failed": row_today["messages_failed"] if row_today else 0,
            "total_sent": row_total["total_sent"] or 0,
            "total_delivered": row_total["total_delivered"] or 0,
            "total_read": row_total["total_read"] or 0,
            "total_replied": row_total["total_replied"] or 0,
            "total_failed": row_total["total_failed"] or 0
        }

    @classmethod
    def log_audit(cls, workspace_id: int, action: str, result: str, details: str, account_id: Optional[int] = None, actor: str = "User"):
        conn = get_connection()
        cur = conn.cursor()
        now_iso = datetime.now().isoformat()
        try:
            cur.execute('''
                INSERT INTO account_audit_logs (workspace_id, actor, account_id, action, result, details, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (workspace_id, actor, account_id, action, result, details, now_iso))
            conn.commit()
        except Exception as e:
            logger.warning(f"Failed to record audit log: {e}")
        finally:
            conn.close()

    @classmethod
    def get_audit_logs(cls, workspace_id: int = 1, limit: int = 50) -> List[Dict[str, Any]]:
        conn = get_connection()
        rows = conn.execute(
            "SELECT * FROM account_audit_logs WHERE workspace_id = ? ORDER BY id DESC LIMIT ?",
            (workspace_id, limit)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]
