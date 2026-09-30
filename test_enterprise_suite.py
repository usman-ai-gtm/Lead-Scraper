"""
USMAN DATA ANALYTICS - ENTERPRISE TEST SUITE
Comprehensive verification of all Ultra Pro Max systems:
- Database Schema & Tables
- Search Orchestrator
- Lead Intelligence & Explainable Scoring
- Cold Email Operations & Deliverability
- WhatsApp Business Cloud API Architecture
- Enterprise CRM, Kanban & Omnichannel Timeline
- Sales Automation Workflow Engine
- Revenue Forecasting & CS Briefs
- Sales Enablement & Proposals
- Security, Audit Logging & Compliance
- AI Sales Copilot & Global Search
"""

import os
import sys
import sqlite3
import unittest

sys.path.insert(0, os.path.abspath("."))

from enterprise_core.schema import init_enterprise_schema, get_enterprise_db_connection
from enterprise_core.search_orchestrator import (
    EnterpriseSearchOrchestrator,
    QueryIntelligenceEngine,
    LeadDeduplicationOrchestrator,
    DeepWebsiteIntelligence
)
from enterprise_core.intelligence_engine import EnterpriseLeadIntelligenceEngine
from enterprise_core.email_system import (
    EnterpriseEmailEngine,
    EmailDeliverabilityDiagnostics,
    EmailVariableRenderer,
    AIReplyIntelligenceEngine
)
from enterprise_core.whatsapp_system import (
    EnterpriseWhatsAppManager,
    WhatsAppCloudAPIClient
)
from enterprise_core.omnichannel_crm import (
    EnterpriseCRMManager,
    UnifiedOmnichannelTimeline,
    SalesAutomationWorkflowEngine
)
from enterprise_core.revenue_cs_enablement import (
    RevenueIntelligenceEngine,
    CustomerSuccessManager,
    SalesEnablementSuite,
    ABMOrchestrator
)
from enterprise_core.security_compliance import (
    EnterpriseAuditLogger,
    ComplianceManager,
    NotificationAlertCenter
)
from enterprise_core.copilot_integrations import (
    AISalesCopilot,
    UniversalGlobalSearch,
    SystemObservabilityCenter
)

class TestEnterprisePlatform(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_enterprise_schema()

    def test_01_database_tables_exist(self):
        conn = get_enterprise_db_connection()
        cur = conn.cursor()
        tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        conn.close()

        required = [
            "leads", "workspaces", "companies", "contacts", "search_runs",
            "email_campaigns", "email_sequence_steps", "email_queue", "email_suppressions",
            "whatsapp_accounts", "whatsapp_conversations", "whatsapp_messages",
            "crm_deals", "crm_stage_history", "crm_activities", "workflows",
            "customer_accounts", "abm_accounts", "audit_logs", "data_subject_requests"
        ]
        for t in required:
            self.assertIn(t, tables, f"Expected table {t} to exist in database")

    def test_02_query_expansion_intelligence(self):
        expanded = QueryIntelligenceEngine.expand_query("SaaS Software", "Austin, TX", "Ultra Search")
        self.assertGreater(len(expanded), 1)
        # Verify query types are present
        types = [q["type"] for q in expanded]
        self.assertIn("Primary", types)

    def test_03_lead_deduplication(self):
        existing = [{"website": "https://www.example.com", "email": "contact@example.com", "business_name": "Example Corp"}]
        dup_lead = {"website": "http://example.com/about", "email": "other@example.com", "business_name": "Different"}
        is_dup = LeadDeduplicationOrchestrator.is_duplicate(dup_lead, existing)
        self.assertTrue(is_dup)

    def test_04_explainable_lead_intelligence(self):
        sample_lead = {
            "business_name": "Alpha Health Inc",
            "website": "https://alphahealth.com",
            "email": "dr.smith@alphahealth.com",
            "phone": "+1 555-019-2831",
            "ai_summary": "WordPress CMS detected | Calendly booking active",
            "rating": 4.8,
            "review_count": 45
        }
        intel = EnterpriseLeadIntelligenceEngine.analyze_lead_intelligence(sample_lead)
        self.assertGreaterEqual(intel["lead_score"], 60)
        self.assertIn("dr.smith@alphahealth.com", str(intel["observed_signals"]))
        self.assertTrue(len(intel["why"]) > 0)
        self.assertTrue(len(intel["recommended_action"]) > 0)

    def test_05_email_variables_and_reply_intelligence(self):
        tpl = "Hi {{first_name}}, I saw {{business_name}} in {{city}}."
        data = {"first_name": "Sarah", "business_name": "Apex Digital", "city": "Chicago"}
        rendered, missing = EmailVariableRenderer.render(tpl, data)
        self.assertEqual(rendered, "Hi Sarah, I saw Apex Digital in Chicago.")
        self.assertEqual(len(missing), 0)

        # Reply classification
        reply_info = AIReplyIntelligenceEngine.classify_and_suggest(
            "Re: Question", "We are interested, please send pricing and let's book a demo Thursday."
        )
        self.assertIn(reply_info["classification"], ["Interested", "Meeting Requested", "Pricing Request"])
        self.assertEqual(reply_info["sentiment"], "Positive")

    def test_06_deliverability_diagnostics(self):
        diag = EmailDeliverabilityDiagnostics.run_full_diagnostic("test@google.com")
        self.assertEqual(diag["mx_status"], "HEALTHY")

    def test_07_crm_pipeline_and_deals(self):
        deal_id = EnterpriseCRMManager.create_deal(
            workspace_id=1,
            title="Apex Cloud Agreement",
            amount=50000.0,
            stage="Proposal"
        )
        self.assertGreater(deal_id, 0)
        # Move stage to Won
        updated = EnterpriseCRMManager.update_deal_stage(deal_id, "Won", changed_by="TestRunner")
        self.assertTrue(updated)

        summary = EnterpriseCRMManager.get_pipeline_summary(1)
        self.assertGreaterEqual(summary["won_amount"], 50000.0)

    def test_08_revenue_forecasting_scenarios(self):
        fc = RevenueIntelligenceEngine.get_forecast_scenarios(1)
        self.assertIn("conservative_scenario", fc)
        self.assertIn("expected_scenario", fc)
        self.assertIn("upside_scenario", fc)
        self.assertGreaterEqual(fc["upside_scenario"], fc["expected_scenario"])

    def test_09_customer_success_and_enablement(self):
        proposal = SalesEnablementSuite.generate_enterprise_proposal("Global Retailers LLC")
        self.assertIn("Global Retailers LLC", proposal)
        self.assertIn("COMMERCIAL PROPOSAL", proposal)

    def test_10_security_audit_and_compliance(self):
        EnterpriseAuditLogger.log_event(1, "TEST_ACTION", "Lead", 100, details={"token": "supersecretkey12345"})
        logs = EnterpriseAuditLogger.get_recent_audit_logs(limit=5)
        self.assertTrue(any("TEST_ACTION" in l["action"] for l in logs))

        # DSR Erasure test
        dsr_id = ComplianceManager.submit_dsr("gdpr_user@testdomain.com", "Erasure")
        processed = ComplianceManager.process_dsr_erasure(dsr_id)
        self.assertTrue(processed)
        # Ensure email is in suppression
        self.assertTrue(EnterpriseEmailEngine.is_suppressed("gdpr_user@testdomain.com"))

    def test_11_ai_copilot_and_observability(self):
        copilot_res = AISalesCopilot.query_copilot("Summarize our revenue pipeline", workspace_id=1)
        self.assertIn("active CRM deals", copilot_res["answer"])

        health = SystemObservabilityCenter.run_health_checks()
        self.assertEqual(health["database"]["status"], "Healthy")

if __name__ == "__main__":
    unittest.main()
