import os
import json
import re

# Load the 600 features
with open("docs/FEATURE_STATUS_MATRIX.json", "r", encoding="utf-8") as f:
    raw_features = json.load(f)

# The 25 Primary Product Modules requested by user:
MODULES_25 = [
    "LEAD DISCOVERY",
    "DATA ENRICHMENT",
    "COMPANY INTELLIGENCE",
    "AI RESEARCH",
    "BUYER INTELLIGENCE",
    "SIGNALS & INTENT",
    "DATA QUALITY",
    "CRM & PIPELINE",
    "EMAIL OUTREACH",
    "WHATSAPP & OMNICHANNEL",
    "CAMPAIGNS",
    "AI PERSONALIZATION",
    "SALES AUTOMATION",
    "AI AGENTS",
    "WORKFLOW AUTOMATION",
    "REVENUE INTELLIGENCE",
    "CUSTOMER SUCCESS",
    "SALES ENABLEMENT",
    "ABM",
    "PARTNERS / CHANNEL",
    "ANALYTICS",
    "COMPLIANCE & SECURITY",
    "INTEGRATIONS",
    "PLATFORM / DEVELOPER",
    "ADMIN CONTROL CENTER"
]

def classify_feature(fid, name, orig_group):
    nl = name.lower()
    
    # 1. Admin & Security & Platform
    if any(k in nl for k in ["admin", "rbac", "user management", "tenant", "audit log", "role", "system health", "permission", "organization setting"]):
        return "ADMIN CONTROL CENTER", "COMPLIANCE & SECURITY", [2, 18, 590]
    if any(k in nl for k in ["compliance", "gdpr", "ccpa", "security", "encryption", "opt-out", "suppression", "consent", "privacy"]):
        return "COMPLIANCE & SECURITY", "ADMIN CONTROL CENTER", [73, 74, 520]
    if any(k in nl for k in ["developer", "sdk", "api key", "webhook", "platform", "sandbox", "graphql", "rest api", "endpoint"]):
        return "PLATFORM / DEVELOPER", "INTEGRATIONS", [23, 24, 580]
    if any(k in nl for k in ["integration", "zapier", "hubspot", "salesforce", "pipedrive", "slack", "sync", "connector"]):
        return "INTEGRATIONS", "CRM & PIPELINE", [8, 23, 410]
        
    # 2. Email & Messaging & WhatsApp
    if any(k in nl for k in ["whatsapp", "waba", "meta cloud", "sms", "voice", "phone", "omnichannel"]):
        return "WHATSAPP & OMNICHANNEL", "EMAIL OUTREACH", [401, 405, 420]
    if any(k in nl for k in ["cold email", "email sender", "smtp", "inbox", "gmail", "deliverability", "bounce", "spf", "dkim", "dmarc", "sequence step"]):
        return "EMAIL OUTREACH", "CAMPAIGNS", [402, 404, 415]
    if any(k in nl for k in ["campaign", "cadence", "multi-step", "sequence", "outreach cadence", "drip"]):
        return "CAMPAIGNS", "EMAIL OUTREACH", [401, 411, 450]
    if any(k in nl for k in ["personaliz", "icebreaker", "pitch", "custom line", "subject line", "tone"]):
        return "AI PERSONALIZATION", "AI RESEARCH", [102, 115, 412]
        
    # 3. AI Agents & Workflows & Automation
    if any(k in nl for k in ["agent", "autonomous", "copilot", "sdr agent", "auto-reply", "ai assistant"]):
        return "AI AGENTS", "SALES AUTOMATION", [101, 150, 480]
    if any(k in nl for k in ["workflow", "trigger", "automation rule", "zap", "cron", "orchestrat"]):
        return "WORKFLOW AUTOMATION", "SALES AUTOMATION", [85, 120, 500]
    if any(k in nl for k in ["sales automation", "auto-followup", "auto-assign", "routing", "cadence engine"]):
        return "SALES AUTOMATION", "WORKFLOW AUTOMATION", [80, 110, 440]

    # 4. Buyer Intelligence, Signals & Intent
    if any(k in nl for k in ["intent", "signal", "radar", "hiring", "funding", "job change", "tech stack", "technographic"]):
        return "SIGNALS & INTENT", "BUYER INTELLIGENCE", [201, 205, 310]
    if any(k in nl for k in ["buyer", "buying committee", "persona", "stakeholder", "decision maker", "org chart", "champion"]):
        return "BUYER INTELLIGENCE", "COMPANY INTELLIGENCE", [111, 112, 215]

    # 5. Leads, Enrichment, Verification
    if any(k in nl for k in ["enrich", "waterfall", "phone finder", "email finder", "social profile", "linkedin url"]):
        return "DATA ENRICHMENT", "DATA QUALITY", [15, 62, 103]
    if any(k in nl for k in ["verify", "verification", "syntax", "mx check", "deliverability check", "cleaning", "dedup", "hygiene"]):
        return "DATA QUALITY", "DATA ENRICHMENT", [16, 65, 108]
    if any(k in nl for k in ["scraper", "search", "discovery", "find lead", "google maps", "directory", "crawler", "query", "filter"]):
        return "LEAD DISCOVERY", "DATA ENRICHMENT", [4, 5, 12]

    # 6. Research & Company Intelligence
    if any(k in nl for k in ["research", "deep research", "ai summary", "financial", "sec filing", "earnings", "news"]):
        return "AI RESEARCH", "COMPANY INTELLIGENCE", [101, 105, 204]
    if any(k in nl for k in ["company", "firmographic", "industry", "headcount", "domain intelligence", "competitor"]):
        return "COMPANY INTELLIGENCE", "AI RESEARCH", [10, 104, 202]

    # 7. CRM, Pipeline, ABM, Enablement
    if any(k in nl for k in ["crm", "pipeline", "deal", "stage", "lead score", "opportunity", "contact management"]):
        return "CRM & PIPELINE", "REVENUE INTELLIGENCE", [3, 50, 501]
    if any(k in nl for k in ["abm", "account-based", "tier 1", "key account", "target account"]):
        return "ABM", "BUYER INTELLIGENCE", [111, 301, 315]
    if any(k in nl for k in ["enablement", "battlecard", "objection", "script", "pitch deck", "collateral"]):
        return "SALES ENABLEMENT", "AI RESEARCH", [106, 125, 430]
    if any(k in nl for k in ["partner", "channel", "referral", "distributor", "reseller", "affiliate"]):
        return "PARTNERS / CHANNEL", "CRM & PIPELINE", [320, 325, 510]

    # 8. Revenue, Customer Success, Analytics
    if any(k in nl for k in ["revenue", "forecast", "win probability", "quota", "arr", "deal size", "conversion rate"]):
        return "REVENUE INTELLIGENCE", "ANALYTICS", [501, 505, 550]
    if any(k in nl for k in ["customer", "retention", "churn", "health score", "nps", "onboarding", "expansion", "upsell"]):
        return "CUSTOMER SUCCESS", "REVENUE INTELLIGENCE", [515, 525, 560]
    if any(k in nl for k in ["analytic", "report", "metric", "dashboard", "funnel", "roi", "attribution", "telemetry"]):
        return "ANALYTICS", "REVENUE INTELLIGENCE", [90, 502, 570]

    # Fallback assignment based on ID range
    if fid <= 61:
        return "LEAD DISCOVERY", "DATA ENRICHMENT", [1, 2, 3]
    elif fid <= 100:
        return "DATA ENRICHMENT", "DATA QUALITY", [15, 62, 70]
    elif fid <= 150:
        return "AI RESEARCH", "BUYER INTELLIGENCE", [101, 105, 111]
    elif fid <= 200:
        return "BUYER INTELLIGENCE", "COMPANY INTELLIGENCE", [111, 112, 140]
    elif fid <= 250:
        return "SIGNALS & INTENT", "LEAD DISCOVERY", [201, 205, 210]
    elif fid <= 300:
        return "COMPANY INTELLIGENCE", "ABM", [202, 255, 301]
    elif fid <= 350:
        return "ABM", "CRM & PIPELINE", [301, 305, 320]
    elif fid <= 400:
        return "WORKFLOW AUTOMATION", "SALES AUTOMATION", [301, 350, 390]
    elif fid <= 450:
        return "EMAIL OUTREACH", "CAMPAIGNS", [401, 402, 420]
    elif fid <= 500:
        return "WHATSAPP & OMNICHANNEL", "EMAIL OUTREACH", [401, 455, 480]
    elif fid <= 550:
        return "REVENUE INTELLIGENCE", "ANALYTICS", [501, 505, 520]
    else:
        return "ANALYTICS", "PLATFORM / DEVELOPER", [501, 560, 590]

# Build enriched registry
enhanced_registry = {}
matrix_rows = []

for fid_str, item in raw_features.items():
    fid = int(fid_str)
    name = item["name"]
    group = item["group"]
    primary_mod, secondary_mod, connected_fids = classify_feature(fid, name, group)
    
    # Generate business description
    desc = f"Enterprise-grade capability for {name.lower()} within {primary_mod.lower()} and {secondary_mod.lower()} workflows."
    
    enhanced_registry[fid_str] = {
        "id": fid,
        "name": name,
        "module": primary_mod,
        "secondary_module": secondary_mod,
        "description": desc,
        "group": group,
        "engine": item.get("engine", "CoreEngine"),
        "status": item.get("status", "READY"),
        "endpoint": f"/api/features/{fid}/execute",
        "ui_route": f"/app/features?id={fid}",
        "connected_features": connected_fids,
        "ai_powered": item.get("ai_powered", True),
        "approval_required": item.get("approval_required", False),
        "consent_required": item.get("consent_required", False)
    }
    
    matrix_rows.append({
        "id": fid,
        "name": name,
        "primary_module": primary_mod,
        "secondary_module": secondary_mod,
        "connected_features": ", ".join(f"#{c}" for c in connected_fids),
        "endpoint": f"/api/features/{fid}/execute",
        "status": item.get("status", "READY")
    })

# Save enhanced registry to lib/feature-registry-25.json
os.makedirs("lib", exist_ok=True)
os.makedirs("frontend/lib", exist_ok=True)
with open("lib/feature-registry-25.json", "w", encoding="utf-8") as f:
    json.dump(enhanced_registry, f, indent=2)

with open("frontend/lib/feature-registry-25.json", "w", encoding="utf-8") as f:
    json.dump(enhanced_registry, f, indent=2)

print("Saved lib/feature-registry-25.json and frontend/lib/feature-registry-25.json")

# Generate /docs/FEATURE_GROUPING_MATRIX.md
feature_grouping_md = [
    "# USMAN AI GTM — Feature Grouping & Relationship Matrix (1–600)\n",
    "Complete organizational architecture mapping all 600 system capabilities into 25 high-level Product Modules and end-to-end GTM pipeline relationships.\n",
    "### End-to-End GTM Pipeline Flow",
    "```",
    "LEAD DISCOVERY (1) -> DATA ENRICHMENT (2) -> DATA QUALITY (7) -> BUYER INTELLIGENCE (5)",
    "  -> SIGNALS & INTENT (6) -> AI RESEARCH (4) -> AI PERSONALIZATION (12) -> CRM & PIPELINE (8)",
    "  -> CAMPAIGNS (11) -> EMAIL OUTREACH (9) / WHATSAPP & OMNICHANNEL (10)",
    "  -> SALES AUTOMATION (13) -> REVENUE INTELLIGENCE (16) -> CUSTOMER SUCCESS (17)",
    "```\n",
    "| Feature ID | Feature Name | Primary Module | Secondary Module | Connected Features | Endpoint | Status |",
    "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
]

for r in matrix_rows:
    feature_grouping_md.append(f"| {r['id']} | {r['name']} | **{r['primary_module']}** | {r['secondary_module']} | {r['connected_features']} | `{r['endpoint']}` | **{r['status']}** |")

os.makedirs("docs", exist_ok=True)
with open("docs/FEATURE_GROUPING_MATRIX.md", "w", encoding="utf-8") as f:
    f.write("\n".join(feature_grouping_md))

print("Saved docs/FEATURE_GROUPING_MATRIX.md")

# Generate /docs/OUTREACH_SYSTEM_MATRIX.md
outreach_matrix_md = [
    "# USMAN AI GTM — Outreach System Matrix\n",
    "Comprehensive specification of all modules, pages, interactive buttons, APIs, backend services, database mutations, and external integrations across the Outreach & Cold Email Command Center.\n",
    "| Module | Page | Button / Action | API Endpoint | Backend Service | Database Effect | External Integration |",
    "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
    "| **Outreach Center** | `/app/outreach` | `Connect Google / Gmail` | `GET /api/auth/google/url` | `GoogleOAuthService` | Creates OAuth state token | Google Identity Platform |",
    "| **Outreach Center** | `/app/outreach` | `New Campaign` | `GET /app/outreach/campaigns/new` | UI Router | Navigation | Client Router |",
    "| **Outreach Center** | `/app/outreach` | `Send Test Email` | `POST /api/outreach/test-email` | `GmailSendingEngine` | Logs `outreach_audit_log` event | Google Gmail API (v1) |",
    "| **Sending Accounts** | `/app/outreach/accounts` | `Add Another Gmail Account` | `POST /api/accounts/google/connect` | `AccountManagerService` | Inserts `sending_accounts` row | Google OAuth 2.0 |",
    "| **Sending Accounts** | `/app/outreach/accounts` | `Send Test` | `POST /api/accounts/{id}/test` | `GmailSendingEngine` | Creates send event record | Gmail API / RFC 2822 MIME |",
    "| **Sending Accounts** | `/app/outreach/accounts` | `Disconnect` | `POST /api/accounts/{id}/disconnect` | `AccountManagerService` | Sets status = 'DISCONNECTED' | Google Token Revocation |",
    "| **Campaign Builder** | `/app/outreach/campaigns/new` | `Generate AI Personalization` | `POST /api/outreach/ai/personalize` | `AiPersonalizationService` | Stores prompt & cached pitch | OpenAI / Anthropic / Gemini |",
    "| **Campaign Builder** | `/app/outreach/campaigns/new` | `Safety Check` | `POST /api/campaigns/verify-safety` | `ComplianceService` | Verifies suppressions & limits | DNS SPF/DKIM / Suppression DB |",
    "| **Campaign Builder** | `/app/outreach/campaigns/new` | `Launch Campaign` | `POST /api/campaigns` | `CampaignService` | Inserts `campaigns`, `campaign_leads` | Gmail API Queue |",
    "| **Campaign Builder** | `/app/outreach/campaigns/new` | `Send Test Email` | `POST /api/outreach/test-email` | `GmailSendingEngine` | Writes test audit event | Google Gmail API |",
    "| **Campaign List** | `/app/outreach/campaigns` | `Duplicate Campaign` | `POST /api/campaigns/{id}/clone` | `CampaignService` | Duplicates sequence & settings | Internal DB |",
    "| **Campaign List** | `/app/outreach/campaigns` | `Pause / Resume` | `PUT /api/campaigns/{id}/status` | `CampaignExecutionEngine` | Updates campaign operational status | Cron / Background Worker |",
    "| **Sequences** | `/app/outreach/sequences` | `Add Sequence Step` | `POST /api/sequences/{id}/steps` | `SequenceService` | Appends step delay and email template | Internal DB |",
    "| **Sequences** | `/app/outreach/sequences` | `Update Stop Conditions` | `PUT /api/sequences/{id}/rules` | `SequenceService` | Updates reply/unsubscribe rules | Internal DB |",
    "| **Reply Inbox** | `/app/outreach/inbox` | `Run AI Sentiment Analysis` | `POST /api/inbox/{id}/analyze` | `AiReplyAnalysisEngine` | Classifies sentiment & recommended CTA | LLM Engine |",
    "| **Reply Inbox** | `/app/outreach/inbox` | `Approve AI Response` | `POST /api/inbox/{id}/reply` | `GmailSendingEngine` | Inserts message & sends RFC MIME | Google Gmail API |",
    "| **Templates** | `/app/outreach/templates` | `Generate AI Template` | `POST /api/templates/ai/generate` | `AiTemplateService` | Creates new template row | LLM Provider |",
    "| **Templates** | `/app/outreach/templates` | `Use in Campaign` | `GET /app/outreach/campaigns/new?template={id}` | UI Router | Prefills campaign composer | Client Router |",
    "| **Approvals Queue** | `/app/outreach/approvals` | `Approve Lead Outreach` | `POST /api/approvals/{id}/approve` | `ComplianceApprovalEngine` | Sets approved_for_sending = true | Audit Trail DB |",
    "| **Approvals Queue** | `/app/outreach/approvals` | `Reject / Suppress` | `POST /api/approvals/{id}/reject` | `ComplianceApprovalEngine` | Adds to suppression list | Global Suppression DB |",
    "| **Deliverability** | `/app/outreach/deliverability` | `Verify Domain DNS` | `POST /api/deliverability/verify` | `DeliverabilityCenterService` | Updates SPF/DKIM/DMARC status | Public DNS Resolvers |",
    "| **Deliverability** | `/app/outreach/deliverability` | `Add Global Suppression` | `POST /api/deliverability/suppressions` | `SuppressionService` | Inserts suppressed domain/email | Suppression DB |",
    "| **Lead Integration** | `/app/leads` | `Create Campaign for Lead` | `GET /app/outreach/campaigns/new?lead_id={id}` | UI Router | Pre-populates campaign audience | Client Router |",
    "| **Lead Integration** | `/app/leads` | `Write Personalized Email` | `POST /api/leads/{id}/personalize` | `AiPersonalizationService` | Stores tailored lead email pitch | LLM Engine |",
    "| **CRM Integration** | `/app/crm` | `Add to Campaign` | `POST /api/campaigns/{id}/add-contacts` | `CrmOutreachBridgeService` | Adds selected CRM contacts to queue | Internal DB |"
]

with open("docs/OUTREACH_SYSTEM_MATRIX.md", "w", encoding="utf-8") as f:
    f.write("\n".join(outreach_matrix_md))

print("Saved docs/OUTREACH_SYSTEM_MATRIX.md")
