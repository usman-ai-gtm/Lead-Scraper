"""
USMAN AI GTM - AUTHORIZED SMTP EMAIL SERVICE
Provides standard RFC 5321/5322 SMTP sending with TLS / SSL encryption.
Strict Security Rules:
- Passwords and App Tokens stored encrypted only via Fernet.
- Zero plaintext passwords in logs or session state.
- Supports Port 587 (STARTTLS), Port 465 (SSL), and Port 25.
"""

import smtplib
import ssl
import logging
from typing import Dict, Any, Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from database.models import AccountRepository

logger = logging.getLogger("USMAN_SMTP_SERVICE")

class SMTPService:
    """
    Standard Authorized SMTP Transport.
    """

    @classmethod
    def test_connection(
        cls,
        host: str,
        port: int,
        username: str,
        password: str,
        use_tls: bool = True
    ) -> Dict[str, Any]:
        """
        Tests SMTP server reachability and credentials.
        """
        if not host or not username or not password:
            return {"success": False, "status": "ERROR", "message": "Host, username, and password are required."}

        try:
            if port == 465:
                context = ssl.create_default_context()
                server = smtplib.SMTP_SSL(host, port, context=context, timeout=12)
            else:
                server = smtplib.SMTP(host, port, timeout=12)
                if use_tls:
                    server.starttls()

            server.login(username, password)
            server.quit()
            return {
                "success": True,
                "status": "CONNECTED",
                "message": f"Successfully connected and authenticated with SMTP server {host}:{port}."
            }
        except smtplib.SMTPAuthenticationError as e:
            return {
                "success": False,
                "status": "ACTION REQUIRED",
                "message": f"SMTP Authentication Failed: Invalid username or password/app token ({e.smtp_code})."
            }
        except Exception as e:
            return {
                "success": False,
                "status": "ERROR",
                "message": f"SMTP connection error: {str(e)}"
            }

    @classmethod
    def send_email(
        cls,
        account_id: int,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends an email using configured SMTP account credentials.
        """
        acc = AccountRepository.get_account_by_id(account_id)
        if not acc:
            return {"success": False, "error": f"Account #{account_id} not found."}

        cred = AccountRepository.get_credentials(account_id)
        if not cred or not cred.get("access_token"):
            return {"success": False, "error": "SMTP account credentials missing."}

        extra = acc.get("extra_config", {})
        host = extra.get("host") or "smtp.gmail.com"
        port = int(extra.get("port") or 587)
        use_tls = extra.get("use_tls", True)
        username = extra.get("username") or acc["external_identity"]
        password = cred["access_token"]  # Stored encrypted, decrypted by get_credentials

        sender_email = acc["external_identity"]
        sender_name = acc["display_name"]

        # Build message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{sender_name} <{sender_email}>"
        msg["To"] = to_email.strip()

        text_part = body_text or body_html.replace("<br>", "\n").replace("<p>", "").replace("</p>", "\n")
        msg.attach(MIMEText(text_part, "plain", "utf-8"))
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        try:
            if port == 465:
                context = ssl.create_default_context()
                server = smtplib.SMTP_SSL(host, port, context=context, timeout=20)
            else:
                server = smtplib.SMTP(host, port, timeout=20)
                if use_tls:
                    server.starttls()

            server.login(username, password)
            server.sendmail(sender_email, [to_email.strip()], msg.as_string())
            server.quit()

            provider_msg_id = f"smtp_{int(datetime.now().timestamp())}_{to_email.split('@')[0]}"
            AccountRepository.record_usage(account_id, sent=1, delivered=1)
            AccountRepository.update_status(account_id, "CONNECTED")

            return {
                "success": True,
                "provider_message_id": provider_msg_id,
                "message": f"Email successfully dispatched via SMTP {host}:{port}."
            }
        except smtplib.SMTPAuthenticationError as e:
            AccountRepository.record_usage(account_id, failed=1)
            AccountRepository.update_status(account_id, "ACTION REQUIRED", "Authentication failed")
            return {"success": False, "error": f"SMTP Authentication Error: {str(e)}"}
        except Exception as e:
            AccountRepository.record_usage(account_id, failed=1)
            AccountRepository.update_status(account_id, "ERROR", str(e))
            return {"success": False, "error": f"SMTP Send Exception: {str(e)}"}
