# USMAN AI GTM — Comprehensive Codebase File Inventory & Architecture Map

**Project Root**: `D:\DATA D\LUXURY DASHBOARD`  
**Git Remote**: `https://github.com/usman-ai-gtm/Lead-Scraper.git`  
**Active Branch**: `main` (Commit SHA: `bafa456`)  
**Production Target**: `https://lead-scraper-mxs5.vercel.app/`  
**Audit Date**: 2026-10-15  

---

## 1. High-Level Architecture Topology

USMAN AI GTM is a hybrid full-stack system consisting of:
1. **Next.js 14 App Router Frontend & Serverless API**: Primary user interface and production API layer running on Vercel. 42 pages, 57 serverless route handlers, dark luxury glassmorphism design system.
2. **FastAPI Backend (Python 3.11)**: Local/enterprise execution engine running on port 8000. Provides 14 API routers (68 endpoints), Pydantic schemas, and direct SQLite database access.
3. **SQLite Database Layer**: Primary storage in `usman_data_analytics.db` (1.28 MB, 171 tables).
4. **Legacy Streamlit Layer (Streamlit 1.30)**: Pre-migration standalone prototype (`app.py`, `enterprise_core/`, 23,000+ lines).
5. **Browser Storage Layer (`localStorage`)**: Client-side persistence bridge used when Vercel serverless functions operate without a persistent backend proxy.

```
+---------------------------------------------------------------------------------------------------------+
|                                        CLIENT BROWSER (User Desktop / Mobile)                            |
|                                                     |                                                   |
|                +------------------------------------+------------------------------------+              |
|                v                                                                         v              |
|   [Next.js App Router (Vercel Serverless)]                              [Local / Hybrid FastAPI Engine] |
|   - 42 Rich Pages (Dark Luxury UI)                                      - Python 3.11 / Uvicorn :8000   |
|   - 57 Serverless API Handlers (/api/*)                                 - 14 Routers / 68 Endpoints     |
|   - Client-side State & localStorage Cache                              - PBKDF2 / Argon2 Password Auth |
|                |                                                                         |              |
|                +------------------------------------+------------------------------------+              |
|                                                     |                                                   |
|                                                     v                                                   |
|                                    [SQLite Storage: usman_data_analytics.db]                            |
|                                    - 171 Tables (Users, Leads, Deals, Workspaces, WhatsApp)             |
|                                                     |                                                   |
|                                                     v                                                   |
|                         [External Integrations: Email SMTP, wa.me, Google, AI Providers]                |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. Frontend Pages Inventory (42 Pages)

| URL Path | File Path | Lines | Purpose & Functionality | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `app/page.tsx` | 512 | Public luxury landing page, value props, live stats, ICP CTAs | Active |
| `/login` | `app/login/page.tsx` | 275 | Sign in with email/password or demo login | Active |
| `/signup` | `app/signup/page.tsx` | 280 | Organization & user registration with workspace provisioning | Active |
| `/forgot-password` | `app/forgot-password/page.tsx` | 134 | Password reset request form | Active |
| `/reset-password` | `app/reset-password/page.tsx` | 140 | Password reset confirmation with token validation | Active |
| `/onboarding` | `app/onboarding/page.tsx` | 240 | New user 4-step onboarding wizard | Active |
| `/features` | `app/features/page.tsx` | 280 | Public capabilities showcase (Lead scraping, AI, CRM) | Active |
| `/pricing` | `app/pricing/page.tsx` | 245 | Public pricing tiers (Starter, Growth, Enterprise) | Active |
| `/solutions` | `app/solutions/page.tsx` | 230 | Industry solutions (Agencies, B2B SaaS, Luxury) | Active |
| `/about` | `app/about/page.tsx` | 86 | Company mission, security posture, founder story | Active |
| `/contact` | `app/contact/page.tsx` | 185 | Direct contact form & founder connection links | Active |
| `/resources` | `app/resources/page.tsx` | 170 | Whitepapers, guides, and GTM playbooks | Active |
| `/app` | `app/app/page.tsx` | 475 | Main GTM Command Center dashboard, pipeline overview, quick actions | Active (Auth Gated) |
| `/app/leads` | `app/app/leads/page.tsx` | 940 | Multi-source lead search, discovery modal, 29 provider key modal | Active (Auth Gated) |
| `/app/crm` | `app/app/crm/page.tsx` | 740 | 9-stage Kanban pipeline, deal creation, value tracking | Active (Auth Gated) |
| `/app/whatsapp` | `app/app/whatsapp/page.tsx` | 2203 | WhatsApp Companion: Click-to-Chat deep links, templates, activity log | Active (Auth Gated) |
| `/app/outreach` | `app/app/outreach/page.tsx` | 480 | Outreach command center, email & multi-channel campaign overview | Active (Auth Gated) |
| `/app/outreach/campaigns` | `app/app/outreach/campaigns/page.tsx` | 320 | Active and scheduled email campaigns listing | Active (Auth Gated) |
| `/app/outreach/campaigns/new` | `app/app/outreach/campaigns/new/page.tsx` | 680 | 4-step campaign builder: Audience, Cadence, Templates, Review | Active (Auth Gated) |
| `/app/outreach/sequences` | `app/app/outreach/sequences/page.tsx` | 360 | Multi-step drip sequence builder | Active (Auth Gated) |
| `/app/outreach/templates` | `app/app/outreach/templates/page.tsx` | 410 | Email template library with merge tag preview | Active (Auth Gated) |
| `/app/outreach/inbox` | `app/app/outreach/inbox/page.tsx` | 330 | Unified outreach replies inbox | Active (Auth Gated) |
| `/app/outreach/accounts` | `app/app/outreach/accounts/page.tsx` | 510 | Sender inbox management (Google OAuth & Custom SMTP) | Active (Auth Gated) |
| `/app/outreach/deliverability` | `app/app/outreach/deliverability/page.tsx` | 360 | SPF/DKIM/DMARC health score and inbox warmup tracker | Active (Auth Gated) |
| `/app/outreach/approvals` | `app/app/outreach/approvals/page.tsx` | 320 | Pre-send compliance & manual review queue | Active (Auth Gated) |
| `/app/outreach/analytics` | `app/app/outreach/analytics/page.tsx` | 310 | Open rates, reply rates, bounce metrics | Active (Auth Gated) |
| `/app/admin` | `app/app/admin/page.tsx` | 204 | RBAC management, tenant overview, immutable audit logs | Active (Admin Gated) |
| `/app/admin/integrations/google` | `app/app/admin/integrations/google/page.tsx` | 180 | Google OAuth Client ID & Secret configuration | Active (Admin Gated) |
| `/app/analytics` | `app/app/analytics/page.tsx` | 240 | Revenue forecasting, pipeline velocity, lead acquisition stats | Active (Auth Gated) |
| `/app/accounts` | `app/app/accounts/page.tsx` | 510 | Organization account profiles, domain lists, firmographics | Active (Auth Gated) |
| `/app/ai-agents` | `app/app/ai-agents/page.tsx` | 420 | Autonomous GTM AI agents (Research, Outreach, Enrichment) | Active (Auth Gated) |
| `/app/copilot` | `app/app/copilot/page.tsx` | 280 | Natural language assistant for pipeline analysis & lead drafting | Active (Auth Gated) |
| `/app/customers` | `app/app/customers/page.tsx` | 210 | Converted paying accounts directory | Active (Auth Gated) |
| `/app/features` | `app/app/features/page.tsx` | 450 | Interactive feature catalog (Features 1–500) | Active (Auth Gated) |
| `/app/features-lab` | `app/app/features-lab/page.tsx` | 290 | Experimental enterprise capability sandbox (Features 501–600) | Active (Auth Gated) |
| `/app/integrations` | `app/app/integrations/page.tsx` | 460 | Connector hub: HubSpot, Salesforce, Slack, Webhooks | Active (Auth Gated) |
| `/app/providers` | `app/app/providers/page.tsx` | 146 | AI provider latency auditor & API key manager | Active (Auth Gated) |
| `/app/research` | `app/app/research/page.tsx` | 560 | Deep company research & executive intelligence | Active (Auth Gated) |
| `/app/revenue` | `app/app/revenue/page.tsx` | 220 | Financial telemetry, MRR tracking, deal attribution | Active (Auth Gated) |
| `/app/settings` | `app/app/settings/page.tsx` | 480 | Workspace settings, ICP configuration, profile management | Active (Auth Gated) |
| `/app/workflows` | `app/app/workflows/page.tsx` | 310 | Workflow automation builder & event trigger rules | Active (Auth Gated) |
| `/app/abm` | `app/app/abm/page.tsx` | 150 | Account-Based Marketing tier assignments | Active (Auth Gated) |

---

## 3. Frontend Serverless API Routes (57 Routes)

| API Route | Methods | Path | Function |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | POST | `app/api/auth/login/route.ts` | Serverless user authentication with PBKDF2 / local fallback |
| `/api/auth/signup` | POST | `app/api/auth/signup/route.ts` | Serverless user registration & workspace creation |
| `/api/auth/me` | GET | `app/api/auth/me/route.ts` | Current authenticated session identity |
| `/api/auth/forgot-password` | POST | `app/api/auth/forgot-password/route.ts` | Password reset link generator |
| `/api/auth/reset-password` | POST | `app/api/auth/reset-password/route.ts` | Password update with token check |
| `/api/auth/google/url` | GET | `app/api/auth/google/url/route.ts` | Google OAuth consent screen redirect generator |
| `/api/auth/google/callback` | GET | `app/api/auth/google/callback/route.ts` | Google OAuth exchange token handler |
| `/api/auth/google/session` | POST | `app/api/auth/google/session/route.ts` | Google session verification |
| `/api/auth/icp` | GET, POST | `app/api/auth/icp/route.ts` | Ideal Customer Profile query & update |
| `/api/auth/workspaces` | GET | `app/api/auth/workspaces/route.ts` | User workspace list |
| `/api/leads` | GET | `app/api/leads/route.ts` | Retrieve paginated leads |
| `/api/leads/search` | POST | `app/api/leads/search/route.ts` | Execute multi-source web discovery search |
| `/api/leads/[id]/score` | POST | `app/api/leads/[id]/score/route.ts` | Calculate lead quality score |
| `/api/leads/bulk-action` | POST | `app/api/leads/bulk-action/route.ts` | Batch delete or export leads |
| `/api/crm/deals` | GET, POST | `app/api/crm/deals/route.ts` | CRM deals query & deal creation |
| `/api/crm/deals/[id]/stage` | PUT | `app/api/crm/deals/[id]/stage/route.ts` | Update deal pipeline stage |
| `/api/crm/pipeline` | GET | `app/api/crm/pipeline/route.ts` | Retrieve all 9 stages & summary |
| `/api/crm/companies` | GET | `app/api/crm/companies/route.ts` | Distinct company accounts list |
| `/api/crm/contacts` | GET | `app/api/crm/contacts/route.ts` | CRM contact records |
| `/api/whatsapp/overview` | GET | `app/api/whatsapp/overview/route.ts` | WhatsApp metrics (chats, sent, replied) |
| `/api/whatsapp/leads` | GET | `app/api/whatsapp/leads/route.ts` | Leads formatted with phone normalization |
| `/api/whatsapp/settings` | GET, POST | `app/api/whatsapp/settings/route.ts` | WhatsApp companion settings & profile |
| `/api/whatsapp/activities` | GET, POST | `app/api/whatsapp/activities/route.ts` | Log & query outreach touchpoints |
| `/api/whatsapp/templates` | GET, POST | `app/api/whatsapp/templates/route.ts` | WhatsApp template CRUD |
| `/api/whatsapp/templates/[id]` | PUT, DELETE | `app/api/whatsapp/templates/[id]/route.ts` | Edit or delete specific template |
| `/api/whatsapp/templates/[id]/duplicate` | POST | `app/api/whatsapp/templates/[id]/duplicate/route.ts` | Duplicate existing template |
| `/api/whatsapp/suppressions` | GET, POST | `app/api/whatsapp/suppressions/route.ts` | Opt-out / Do-Not-Contact list |
| `/api/whatsapp/suppressions/[id]` | DELETE | `app/api/whatsapp/suppressions/[id]/route.ts` | Remove number from suppression |
| `/api/whatsapp/ai-draft` | POST | `app/api/whatsapp/ai-draft/route.ts` | Generate luxury personalized WhatsApp copy |
| `/api/whatsapp/drafts` | POST | `app/api/whatsapp/drafts/route.ts` | Save draft message for lead |
| `/api/campaigns` | GET, POST | `app/api/campaigns/route.ts` | Email campaigns query & creation |
| `/api/campaigns/[id]/status` | PUT | `app/api/campaigns/[id]/status/route.ts` | Pause, resume, or cancel campaign |
| `/api/campaigns/accounts` | GET, POST | `app/api/campaigns/accounts/route.ts` | Sender email accounts registry |
| `/api/campaigns/accounts/[id]` | DELETE | `app/api/campaigns/accounts/[id]/route.ts` | Remove sender account |
| `/api/campaigns/accounts/connect` | POST | `app/api/campaigns/accounts/connect/route.ts` | Connect Google / SMTP sender |
| `/api/campaigns/test-send` | POST | `app/api/campaigns/test-send/route.ts` | Send safe test email via SMTP |
| `/api/campaigns/whatsapp-setup` | POST | `app/api/campaigns/whatsapp-setup/route.ts` | Meta Cloud WABA validator (strict 400 rejection) |
| `/api/admin/overview` | GET | `app/api/admin/overview/route.ts` | Admin tenant stats & DB size |
| `/api/admin/users` | GET | `app/api/admin/users/route.ts` | User directory with RBAC roles |
| `/api/admin/users/[id]/role` | POST | `app/api/admin/users/[id]/role/route.ts` | Change user role (ADMIN, MANAGER, USER) |
| `/api/admin/audit-logs` | GET | `app/api/admin/audit-logs/route.ts` | Security event audit log |
| `/api/analytics/dashboard` | GET | `app/api/analytics/dashboard/route.ts` | KPI aggregate cards & chart data |
| `/api/agents` | GET | `app/api/agents/route.ts` | AI agents registry |
| `/api/agents/[id]/run` | POST | `app/api/agents/[id]/run/route.ts` | Trigger agent execution cycle |
| `/api/agents/[id]/toggle` | POST | `app/api/agents/[id]/toggle/route.ts` | Enable/disable autonomous agent |
| `/api/copilot/chat` | POST | `app/api/copilot/chat/route.ts` | Copilot conversational query |
| `/api/copilot/search` | GET | `app/api/copilot/search/route.ts` | Copilot universal search index |
| `/api/features/catalog` | GET | `app/api/features/catalog/route.ts` | Catalog of Features 1–500 |
| `/api/features/[id]/execute` | POST | `app/api/features/[id]/execute/route.ts` | Execute specific feature |
| `/api/features-lab/catalog` | GET | `app/api/features-lab/catalog/route.ts` | Catalog of Features 501–600 |
| `/api/features-lab/[id]/execute` | POST | `app/api/features-lab/[id]/execute/route.ts` | Execute experimental feature |
| `/api/integrations` | GET | `app/api/integrations/route.ts` | Connected third-party tools |
| `/api/integrations/[id]/configure` | POST | `app/api/integrations/[id]/configure/route.ts` | Save integration credentials |
| `/api/integrations/[id]/test` | POST | `app/api/integrations/[id]/test/route.ts` | Test connector health |
| `/api/providers` | GET | `app/api/providers/route.ts` | AI & search provider registry |
| `/api/providers/[id]/test` | POST | `app/api/providers/[id]/test/route.ts` | Test provider latency & key validity |
| `/api/research` | POST | `app/api/research/route.ts` | Execute AI company enrichment |

---

## 4. Backend Python / FastAPI Architecture (35 Files)

| File Path | Role | Endpoints / Symbols |
| :--- | :--- | :--- |
| `backend/app/main.py` | FastAPI Application Entrypoint | CORS, Telemetry WebSocket, `/api/health`, router mounting |
| `backend/app/core/config.py` | Settings & Environment Variables | Pydantic Settings, DB paths, JWT secret, token expiry |
| `backend/app/core/database.py` | SQLite DB Interface | `get_db()`, `execute_query()`, `execute_write()`, init migrations |
| `backend/app/core/security.py` | Cryptography & JWT | `verify_password()`, `get_password_hash()`, `create_access_token()` |
| `backend/app/api/auth.py` | Auth Router (9 endpoints) | `/login`, `/signup`, `/me`, `/forgot-password`, `/reset-password` |
| `backend/app/api/leads.py` | Leads Router (8 endpoints) | `/search`, `/{id}`, bulk actions, scoring |
| `backend/app/api/crm.py` | CRM Router (6 endpoints) | `/pipeline`, `/deals`, `/companies`, `/contacts` |
| `backend/app/api/whatsapp.py` | WhatsApp Router (16 endpoints) | `/overview`, `/leads`, `/templates`, `/activities`, `/suppressions` |
| `backend/app/api/campaigns.py` | Outreach Router (9 endpoints) | Campaigns, sender accounts, SMTP test send |
| `backend/app/api/admin.py` | Admin Router (4 endpoints) | Overview, user RBAC role assignment, audit logs |
| `backend/app/api/agents.py` | Agents Router (3 endpoints) | Agent runs, status toggles |
| `backend/app/api/analytics.py` | Analytics Router (1 endpoint) | `/dashboard` KPIs |
| `backend/app/api/copilot.py` | Copilot Router (2 endpoints) | `/chat`, `/search` |
| `backend/app/api/integrations.py` | Integrations Router (3 endpoints)| Connector status, test, configuration |
| `backend/app/api/providers.py` | Providers Router (4 endpoints) | Provider health, key updates |
| `backend/app/api/research.py` | Research Router (1 endpoint) | Deep enrichment |
| `backend/app/api/universal_features.py`| Features Router (4 endpoints)| Catalog, feature execution, smoke test |
| `backend/app/schemas/` | Pydantic Request/Response Models | `auth.py`, `leads.py`, `crm.py`, `campaigns.py`, `analytics.py` |
| `backend/app/services/` | Core Business Logic Services | `lead_service.py` (533 lines), `crm_service.py`, `campaign_service.py` |

---

## 5. Legacy & Duplicate Implementations

- **`app.py`** (12,850 lines): Original monolithic Streamlit application. Contains older Python implementations of lead scraper, UI controls, and direct SQLite calls. Superseded by Next.js frontend and FastAPI backend, but still present in root.
- **`enterprise_core/`** (5 files, 8,200 lines): Streamlit enterprise helper modules.
- **`ui/`** (6 files, 2,100 lines): Streamlit layout and CSS components.
- **`frontend/app/`**: Duplicate copy of Next.js login/signup components created during earlier development. Note: Root `app/` is the active Next.js App Router root configured in `package.json` and `tsconfig.json`.
