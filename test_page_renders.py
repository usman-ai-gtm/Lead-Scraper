import sys
sys.path.insert(0, ".")
import os

print("Testing page functions for syntax/runtime/DB errors...")
import app
from enterprise_core import *

pages_to_test = [
    ("Executive Command Center", lambda: render_executive_command_center(1)),
    ("Ultra Search Orchestrator", lambda: render_ultra_search_orchestrator(1)),
    ("Enterprise Lead Intelligence", lambda: render_lead_intelligence_studio(1)),
    ("Cold Email Command Center", lambda: render_cold_email_command_center(1)),
    ("WhatsApp Business Cloud API", lambda: render_whatsapp_command_center(1)),
    ("Enterprise CRM & Kanban", lambda: render_enterprise_crm(1)),
    ("Omnichannel Outreach Timeline", lambda: render_omnichannel_automation(1)),
    ("AI Sales Copilot & Global Search", lambda: render_copilot_and_global_search(1)),
    ("Revenue Intelligence", lambda: render_revenue_intelligence(1)),
    ("Customer Success", lambda: render_customer_success(1)),
    ("Sales Enablement", lambda: render_sales_enablement(1)),
    ("ABM Orchestration", lambda: render_abm_studio(1)),
    ("Integration Hub", lambda: render_integration_hub(1)),
    ("Compliance & Audit", lambda: render_compliance_and_audit(1)),
    ("Premium Command Center", lambda: app.premium_command_center_page(1, "QUALITY MODE")),
    ("Global Targeting Studio", lambda: app.premium_targeting_page(1, "QUALITY MODE")),
    ("Intelligence 1-100", lambda: app.premium_intelligence_1_100_page(1, "QUALITY MODE")),
    ("Intelligence 101-200", lambda: app.nextgen_101_200_page(1, "QUALITY MODE")),
    ("Ultra GTM 201-300", lambda: app.ultra_201_300_command_center_page(1, "QUALITY MODE")),
    ("Omnichannel Command Center", lambda: app.omnichannel_command_center_page(1, "QUALITY MODE")),
    ("Outreach & Messaging 401-500", lambda: app.ultra_401_500_command_center_page(1, "QUALITY MODE")),
    ("Ultra Enterprise 301-400", lambda: app.ultra_301_400_command_center_page(1, "QUALITY MODE")),
    ("Ultra Command 501-600", lambda: app.ultra_501_600_command_center_page(1, "QUALITY MODE")),
    ("Agency & RevOps", lambda: app.premium_agency_revops_page(1))
]

failed = []
passed = []

for name, page_fn in pages_to_test:
    try:
        page_fn()
        passed.append(name)
        print(f"PASS: {name}")
    except Exception as e:
        failed.append((name, str(e)))
        print(f"FAIL: {name} -> {type(e).__name__}: {e}")

print(f"\nSummary: {len(passed)} passed, {len(failed)} failed.")
if failed:
    sys.exit(1)
