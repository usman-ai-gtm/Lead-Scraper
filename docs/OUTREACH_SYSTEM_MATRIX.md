# USMAN AI GTM — Outreach System Matrix

Comprehensive specification of all modules, pages, interactive buttons, APIs, backend services, database mutations, and external integrations across the Outreach & Cold Email Command Center.

| Module | Page | Button / Action | API Endpoint | Backend Service | Database Effect | External Integration |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Outreach Center** | `/app/outreach` | `Connect Google / Gmail` | `GET /api/auth/google/url` | `GoogleOAuthService` | Creates OAuth state token | Google Identity Platform |
| **Outreach Center** | `/app/outreach` | `New Campaign` | `GET /app/outreach/campaigns/new` | UI Router | Navigation | Client Router |
| **Outreach Center** | `/app/outreach` | `Send Test Email` | `POST /api/outreach/test-email` | `GmailSendingEngine` | Logs `outreach_audit_log` event | Google Gmail API (v1) |
| **Sending Accounts** | `/app/outreach/accounts` | `Add Another Gmail Account` | `POST /api/accounts/google/connect` | `AccountManagerService` | Inserts `sending_accounts` row | Google OAuth 2.0 |
| **Sending Accounts** | `/app/outreach/accounts` | `Send Test` | `POST /api/accounts/{id}/test` | `GmailSendingEngine` | Creates send event record | Gmail API / RFC 2822 MIME |
| **Sending Accounts** | `/app/outreach/accounts` | `Disconnect` | `POST /api/accounts/{id}/disconnect` | `AccountManagerService` | Sets status = 'DISCONNECTED' | Google Token Revocation |
| **Campaign Builder** | `/app/outreach/campaigns/new` | `Generate AI Personalization` | `POST /api/outreach/ai/personalize` | `AiPersonalizationService` | Stores prompt & cached pitch | OpenAI / Anthropic / Gemini |
| **Campaign Builder** | `/app/outreach/campaigns/new` | `Safety Check` | `POST /api/campaigns/verify-safety` | `ComplianceService` | Verifies suppressions & limits | DNS SPF/DKIM / Suppression DB |
| **Campaign Builder** | `/app/outreach/campaigns/new` | `Launch Campaign` | `POST /api/campaigns` | `CampaignService` | Inserts `campaigns`, `campaign_leads` | Gmail API Queue |
| **Campaign Builder** | `/app/outreach/campaigns/new` | `Send Test Email` | `POST /api/outreach/test-email` | `GmailSendingEngine` | Writes test audit event | Google Gmail API |
| **Campaign List** | `/app/outreach/campaigns` | `Duplicate Campaign` | `POST /api/campaigns/{id}/clone` | `CampaignService` | Duplicates sequence & settings | Internal DB |
| **Campaign List** | `/app/outreach/campaigns` | `Pause / Resume` | `PUT /api/campaigns/{id}/status` | `CampaignExecutionEngine` | Updates campaign operational status | Cron / Background Worker |
| **Sequences** | `/app/outreach/sequences` | `Add Sequence Step` | `POST /api/sequences/{id}/steps` | `SequenceService` | Appends step delay and email template | Internal DB |
| **Sequences** | `/app/outreach/sequences` | `Update Stop Conditions` | `PUT /api/sequences/{id}/rules` | `SequenceService` | Updates reply/unsubscribe rules | Internal DB |
| **Reply Inbox** | `/app/outreach/inbox` | `Run AI Sentiment Analysis` | `POST /api/inbox/{id}/analyze` | `AiReplyAnalysisEngine` | Classifies sentiment & recommended CTA | LLM Engine |
| **Reply Inbox** | `/app/outreach/inbox` | `Approve AI Response` | `POST /api/inbox/{id}/reply` | `GmailSendingEngine` | Inserts message & sends RFC MIME | Google Gmail API |
| **Templates** | `/app/outreach/templates` | `Generate AI Template` | `POST /api/templates/ai/generate` | `AiTemplateService` | Creates new template row | LLM Provider |
| **Templates** | `/app/outreach/templates` | `Use in Campaign` | `GET /app/outreach/campaigns/new?template={id}` | UI Router | Prefills campaign composer | Client Router |
| **Approvals Queue** | `/app/outreach/approvals` | `Approve Lead Outreach` | `POST /api/approvals/{id}/approve` | `ComplianceApprovalEngine` | Sets approved_for_sending = true | Audit Trail DB |
| **Approvals Queue** | `/app/outreach/approvals` | `Reject / Suppress` | `POST /api/approvals/{id}/reject` | `ComplianceApprovalEngine` | Adds to suppression list | Global Suppression DB |
| **Deliverability** | `/app/outreach/deliverability` | `Verify Domain DNS` | `POST /api/deliverability/verify` | `DeliverabilityCenterService` | Updates SPF/DKIM/DMARC status | Public DNS Resolvers |
| **Deliverability** | `/app/outreach/deliverability` | `Add Global Suppression` | `POST /api/deliverability/suppressions` | `SuppressionService` | Inserts suppressed domain/email | Suppression DB |
| **Lead Integration** | `/app/leads` | `Create Campaign for Lead` | `GET /app/outreach/campaigns/new?lead_id={id}` | UI Router | Pre-populates campaign audience | Client Router |
| **Lead Integration** | `/app/leads` | `Write Personalized Email` | `POST /api/leads/{id}/personalize` | `AiPersonalizationService` | Stores tailored lead email pitch | LLM Engine |
| **CRM Integration** | `/app/crm` | `Add to Campaign` | `POST /api/campaigns/{id}/add-contacts` | `CrmOutreachBridgeService` | Adds selected CRM contacts to queue | Internal DB |