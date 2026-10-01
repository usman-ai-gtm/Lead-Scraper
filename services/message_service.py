"""
USMAN AI GTM - UNIFIED OUTBOUND MESSAGE PIPELINE & EVENT LOGGER
Enforces campaign safety, suppression checks, account limit enforcement,
and audit-grade message delivery logging for Gmail, SMTP, and WhatsApp Business.
"""

import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from database.database import get_connection
from database.models import AccountRepository
from services.gmail_service import GmailService
from services.whatsapp_service import WhatsAppOfficialService
from services.smtp_service import SMTPService

logger = logging.getLogger("USMAN_MESSAGE_SERVICE")

class OutboundMessagePipeline:
    """
    Unified Outbound Sending Pipeline with hard suppression enforcement and audit logging.
    """

    @classmethod
    def is_suppressed(cls, recipient: str, workspace_id: int = 1) -> bool:
        """
        Checks whether recipient email or phone number is in suppression/opt-out list.
        """
        if not recipient:
            return True
        conn = get_connection()
        clean = recipient.strip().lower()
        row = conn.execute(
            "SELECT id FROM email_suppressions WHERE email = ? AND workspace_id = ?",
            (clean, workspace_id)
        ).fetchone()
        conn.close()
        return row is not None

    @classmethod
    def send_email_message(
        cls,
        account_id: int,
        recipient_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None,
        workspace_id: int = 1,
        campaign_id: Optional[int] = None,
        lead_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        End-to-end pipeline for dispatching an email through a connected Gmail or SMTP account.
        """
        clean_recipient = recipient_email.strip()
        msg_uuid = f"msg_{uuid.uuid4().hex[:16]}"
        now_iso = datetime.now().isoformat()

        # Step 1: Validate recipient syntax
        if "@" not in clean_recipient or "." not in clean_recipient:
            return {"success": False, "error": f"Invalid email syntax: '{clean_recipient}'"}

        # Step 2: Suppression Check (Hard Gate)
        if cls.is_suppressed(clean_recipient, workspace_id):
            cls._log_message(
                message_id=msg_uuid,
                workspace_id=workspace_id,
                campaign_id=campaign_id,
                lead_id=lead_id,
                account_id=account_id,
                channel="email",
                provider="unknown",
                recipient=clean_recipient,
                subject=subject,
                body=body_html,
                status="Suppressed",
                error="Recipient is suppressed and cannot be contacted through this campaign."
            )
            return {
                "success": False,
                "error": "Recipient is suppressed and cannot be contacted through this campaign."
            }

        # Step 3: Validate Account Health
        acc = AccountRepository.get_account_by_id(account_id)
        if not acc:
            return {"success": False, "error": f"Sender account #{account_id} not found."}

        if acc.get("status") != "CONNECTED" or not acc.get("is_enabled", 1):
            return {
                "success": False,
                "error": f"Account '{acc['display_name']}' is not CONNECTED (Current status: {acc.get('status')})."
            }

        provider = acc["provider"]

        # Step 4: Dispatch via Real Provider
        if provider == "gmail":
            send_res = GmailService.send_email(
                account_id=account_id,
                to_email=clean_recipient,
                subject=subject,
                body_html=body_html,
                body_text=body_text
            )
        elif provider == "smtp":
            send_res = SMTPService.send_email(
                account_id=account_id,
                to_email=clean_recipient,
                subject=subject,
                body_html=body_html,
                body_text=body_text
            )
        else:
            return {"success": False, "error": f"Unsupported email provider: {provider}"}

        # Step 5: Log Message Result
        status = "Sent" if send_res.get("success") else "Failed"
        provider_mid = send_res.get("provider_message_id")
        err = send_res.get("error")

        cls._log_message(
            message_id=msg_uuid,
            workspace_id=workspace_id,
            campaign_id=campaign_id,
            lead_id=lead_id,
            account_id=account_id,
            channel="email",
            provider=provider,
            recipient=clean_recipient,
            subject=subject,
            body=body_html,
            status=status,
            provider_message_id=provider_mid,
            error=err
        )

        return send_res

    @classmethod
    def send_whatsapp_message(
        cls,
        account_id: int,
        recipient_phone: str,
        message_type: str = "text",
        text_body: Optional[str] = None,
        template_name: Optional[str] = None,
        language_code: str = "en_US",
        components: Optional[List[Dict[str, Any]]] = None,
        workspace_id: int = 1,
        campaign_id: Optional[int] = None,
        lead_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        End-to-end pipeline for dispatching a WhatsApp message via Official Meta Cloud API.
        """
        clean_phone = recipient_phone.strip()
        msg_uuid = f"wa_{uuid.uuid4().hex[:16]}"
        now_iso = datetime.now().isoformat()

        # Step 1: Suppression Check
        if cls.is_suppressed(clean_phone, workspace_id):
            return {
                "success": False,
                "error": "Recipient is suppressed and cannot be contacted through WhatsApp."
            }

        # Step 2: Validate Account Health
        acc = AccountRepository.get_account_by_id(account_id)
        if not acc:
            return {"success": False, "error": f"WhatsApp account #{account_id} not found."}

        if acc.get("status") != "CONNECTED" or not acc.get("is_enabled", 1):
            return {
                "success": False,
                "error": f"WhatsApp account '{acc['display_name']}' is not CONNECTED."
            }

        # Step 3: Dispatch via Official Meta API
        if message_type == "template" and template_name:
            send_res = WhatsAppOfficialService.send_template_message(
                account_id=account_id,
                to_phone=clean_phone,
                template_name=template_name,
                language_code=language_code,
                components=components
            )
            body_summary = f"[Template: {template_name}]"
        else:
            send_res = WhatsAppOfficialService.send_text_message(
                account_id=account_id,
                to_phone=clean_phone,
                text_body=text_body or ""
            )
            body_summary = text_body or ""

        # Step 4: Log Message Record
        status = "Sent" if send_res.get("success") else "Failed"
        provider_mid = send_res.get("provider_message_id")
        err = send_res.get("error")

        cls._log_message(
            message_id=msg_uuid,
            workspace_id=workspace_id,
            campaign_id=campaign_id,
            lead_id=lead_id,
            account_id=account_id,
            channel="whatsapp",
            provider="meta_whatsapp",
            recipient=clean_phone,
            subject=template_name or "WhatsApp Message",
            body=body_summary,
            status=status,
            provider_message_id=provider_mid,
            error=err
        )

        return send_res

    @classmethod
    def _log_message(
        cls,
        message_id: str,
        workspace_id: int,
        campaign_id: Optional[int],
        lead_id: Optional[int],
        account_id: int,
        channel: str,
        provider: str,
        recipient: str,
        subject: Optional[str],
        body: Optional[str],
        status: str,
        provider_message_id: Optional[str] = None,
        error: Optional[str] = None
    ):
        conn = get_connection()
        cur = conn.cursor()
        now_iso = datetime.now().isoformat()
        try:
            cur.execute('''
                INSERT INTO message_logs (
                    message_id, workspace_id, campaign_id, lead_id, account_id,
                    channel, provider, recipient, subject, body, status, sent_at,
                    provider_message_id, error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                message_id, workspace_id, campaign_id, lead_id, account_id,
                channel, provider, recipient, subject, body, status, now_iso,
                provider_message_id, error
            ))
            conn.commit()
        except Exception as e:
            logger.error(f"Error logging outbound message: {e}")
        finally:
            conn.close()

    @classmethod
    def get_recent_messages(cls, workspace_id: int = 1, limit: int = 50) -> List[Dict[str, Any]]:
        conn = get_connection()
        rows = conn.execute('''
            SELECT ml.*, ca.display_name as account_name
            FROM message_logs ml
            LEFT JOIN connected_accounts ca ON ml.account_id = ca.id
            WHERE ml.workspace_id = ?
            ORDER BY ml.id DESC LIMIT ?
        ''', (workspace_id, limit)).fetchall()
        conn.close()
        return [dict(r) for r in rows]
