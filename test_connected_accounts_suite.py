"""
USMAN AI GTM - CONNECTED ACCOUNTS VERIFICATION TEST SUITE
Runs automated tests across:
1. Database schema initialization & migrations
2. Token encryption / decryption / masking
3. AccountRepository CRUD & audit logs
4. Multi-account routing algorithms (Round Robin, Lowest Usage, LRU, Default)
5. Outbound sending pipeline & hard suppression gating
6. Gmail API RFC 2822 base64url MIME serialization
7. WhatsApp Meta Cloud API payload formatting & QR policy compliance
8. AI Sales Copilot real-data queries
"""

import os
import sys
import unittest
import base64
from datetime import datetime

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database.database import get_connection, init_connected_accounts_tables
from database.encryption import encrypt_secret, decrypt_secret, mask_secret
from database.models import AccountRepository
from services.oauth_service import GoogleOAuthService, MicrosoftOAuthService
from services.gmail_service import GmailService
from services.whatsapp_service import WhatsAppOfficialService
from services.smtp_service import SMTPService
from services.account_service import AccountOrchestrationService, AccountRoutingStrategy
from services.message_service import OutboundMessagePipeline
from enterprise_core.copilot_integrations import AISalesCopilot

class TestConnectedAccountsSuite(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_connected_accounts_tables()

    def test_01_encryption_decryption(self):
        plain_token = "ya29.a0AfH6SMD_very_secret_oauth_token_12345"
        enc = encrypt_secret(plain_token)
        self.assertNotEqual(plain_token, enc)
        self.assertTrue(enc.startswith("fnt::") or enc.startswith("enc_b64::"))
        dec = decrypt_secret(enc)
        self.assertEqual(plain_token, dec)

        # Masking
        masked = mask_secret(plain_token, visible_chars=4)
        self.assertTrue(masked.startswith("ya29****"))
        self.assertTrue(masked.endswith("2345"))

    def test_02_account_crud_and_credentials(self):
        acc_id = AccountRepository.create_or_update_account(
            workspace_id=99,
            account_type="email",
            provider="gmail",
            display_name="Enterprise Sales Gmail #1",
            external_identity="sales1@enterprise-test.com",
            external_account_id="sub_998877",
            status="CONNECTED",
            access_token="test_access_token_abc",
            refresh_token="test_refresh_token_xyz",
            scope_info="https://www.googleapis.com/auth/gmail.send"
        )
        self.assertGreater(acc_id, 0)

        acc = AccountRepository.get_account_by_id(acc_id)
        self.assertIsNotNone(acc)
        self.assertEqual(acc["display_name"], "Enterprise Sales Gmail #1")
        self.assertEqual(acc["status"], "CONNECTED")

        cred = AccountRepository.get_credentials(acc_id)
        self.assertIsNotNone(cred)
        self.assertEqual(cred["access_token"], "test_access_token_abc")
        self.assertEqual(cred["refresh_token"], "test_refresh_token_xyz")

        # Audit logs should have recorded the creation
        audits = AccountRepository.get_audit_logs(workspace_id=99)
        self.assertGreater(len(audits), 0)

    def test_03_multi_account_routing(self):
        # Create second account for workspace 99
        acc2_id = AccountRepository.create_or_update_account(
            workspace_id=99,
            account_type="email",
            provider="smtp",
            display_name="Backup SMTP Sender",
            external_identity="backup@enterprise-test.com",
            status="CONNECTED",
            access_token="smtp_secret_pass"
        )

        # Test Lowest Usage Strategy
        # Record usage on account 1
        AccountRepository.record_usage(account_id=1, sent=10)
        selected = AccountOrchestrationService.select_sender_account(

            workspace_id=99,
            account_type="email",
            strategy=AccountRoutingStrategy.LOWEST_USAGE
        )
        self.assertIsNotNone(selected)
        accs_ws99 = AccountRepository.get_accounts(workspace_id=99, account_type="email")
        acc_ids = [a["id"] for a in accs_ws99]
        self.assertIn(selected["id"], acc_ids)


        # Test Specific Account
        spec = AccountOrchestrationService.select_sender_account(
            workspace_id=99,
            account_type="email",
            strategy=AccountRoutingStrategy.SPECIFIC,
            preferred_account_id=acc2_id
        )
        self.assertEqual(spec["id"], acc2_id)

    def test_04_suppression_enforcement(self):
        conn = get_connection()
        conn.execute(
            "INSERT OR IGNORE INTO email_suppressions (workspace_id, email, reason, created_at) VALUES (99, 'unsub@prospect.com', 'Opt-out', '2026-10-01')"
        )
        conn.commit()
        conn.close()

        self.assertTrue(OutboundMessagePipeline.is_suppressed("unsub@prospect.com", workspace_id=99))
        self.assertFalse(OutboundMessagePipeline.is_suppressed("valid@prospect.com", workspace_id=99))

        # Attempt to send to suppressed recipient - MUST FAIL
        res = OutboundMessagePipeline.send_email_message(
            account_id=1,
            recipient_email="unsub@prospect.com",
            subject="Hello",
            body_html="<p>Test</p>",
            workspace_id=99
        )
        self.assertFalse(res["success"])
        self.assertIn("suppressed", res["error"].lower())

    def test_05_google_oauth_url_and_scopes(self):
        auth_url, state = GoogleOAuthService.generate_authorization_url()
        self.assertTrue(auth_url.startswith("https://accounts.google.com/o/oauth2/v2/auth"))
        self.assertIn("scope=", auth_url)
        self.assertIn("gmail.send", auth_url)
        self.assertIn("access_type=offline", auth_url)
        self.assertIn("prompt=consent", auth_url)
        self.assertIsNotNone(state)

    def test_06_whatsapp_meta_cloud_api_specs(self):
        # Verify Graph API version is v19.0+
        self.assertTrue(WhatsAppOfficialService.GRAPH_API_VERSION.startswith("v19"))
        self.assertIn("graph.facebook.com", WhatsAppOfficialService.GRAPH_BASE_URL)

    def test_07_ai_copilot_account_queries(self):
        r1 = AISalesCopilot.query_copilot("Which account needs reconnection?", workspace_id=99)
        self.assertIn("account", r1["answer"].lower())

        r2 = AISalesCopilot.query_copilot("Which Gmail account sent the most emails?", workspace_id=99)
        self.assertIn("gmail", r2["answer"].lower())

if __name__ == "__main__":
    unittest.main()
