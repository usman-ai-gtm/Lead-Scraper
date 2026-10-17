# USMAN AI GTM — Comprehensive Codebase File Inventory & Architecture Map

**Project Root**: `D:\DATA D\LUXURY DASHBOARD`  
**Git Remote**: `https://github.com/usman-ai-gtm/Lead-Scraper.git`  
**Active Branch**: `main` (Synchronized at Commit SHA: `d3d988c`)  
**Production Target**: `https://lead-scraper-mxs5.vercel.app/`  
**Audit Date**: 2026-10-16  

---

## 1. Programming Languages & Code Metrics Breakdown

| Programming Language | Files | Lines of Code | Percentage of Codebase | Subsystem & Role |
| :--- | :--- | :--- | :--- | :--- |
| **JSON** | 13 | 40,337 | 34.8% | Configuration, dependencies (`package-lock.json`), schemas |
| **TypeScript / TSX (React)** | 225 | 34,846 | 30.0% | Next.js 14 frontend pages, UI components, API route handlers |
| **Python** | 99 | 34,096 | 29.4% | FastAPI backend, services, security, legacy `app.py`, data models |
| **Markdown** | 30 | 4,943 | 4.3% | Audit documentation, architectural specs, API references |
| **CSS** | 3 | 1,018 | 0.9% | Global luxury glassmorphism styles, Tailwind directives |
| **PowerShell** | 7 | 272 | 0.2% | Environment automation, diagnostic runners, background scripts |
| **SQL** | 1 | 258 | 0.2% | Exported Cloud PostgreSQL DDL schema (`docs/cloud_postgres_schema.sql`) |
| **YAML** | 2 | 126 | 0.1% | Render hosting configuration, container definitions |
| **Batch** | 5 | 93 | 0.1% | Local server runners (`start_all.bat`, `start_backend.bat`, etc.) |
| **JavaScript** | 4 | 44 | <0.1% | Build & tooling configuration (`tailwind.config.js`, `postcss.config.js`) |
| **Java** | **0** | **0** | **0.0%** | **ENTIRELY ABSENT**: Zero `.java`, `.class`, `.jar`, `pom.xml`, or `build.gradle` |
| **TOTAL** | **389** | **116,033** | **100.0%** | Comprehensive Multi-Tier SaaS System |

---

## 2. Directory Hierarchy & Architectural Mapping

```
D:\DATA D\LUXURY DASHBOARD
├── app/                                # Next.js 14 App Router (Primary Frontend & API)
│   ├── (auth)/                         # Login, signup, onboarding, forgot/reset password
│   ├── api/                            # 58 Serverless API Handlers (/api/*)
│   │   ├── admin/                      # Overview, users, roles, audit-logs, persistence
│   │   ├── agents/                     # Autonomous AI workforce runners
│   │   ├── analytics/                  # Revenue, conversion, and pipeline dashboards
│   │   ├── auth/                       # Login, signup, me, workspaces, Google OAuth
│   │   ├── campaigns/                  # Email & WhatsApp outreach cadences
│   │   ├── copilot/                    # Natural language sales copilot & search
│   │   ├── crm/                        # Deals, pipeline Kanban, companies, contacts
│   │   ├── features/                   # Features catalog (1-500)
│   │   ├── features-lab/               # Advanced Feature Lab (501-600)
│   │   ├── integrations/               # 3rd-party connector testing & config
│   │   ├── leads/                      # Discovery, search, scoring, bulk actions
│   │   ├── providers/                  # 29-provider health & key configuration
│   │   ├── research/                   # Deep website domain intelligence
│   │   └── whatsapp/                   # Companion, templates, suppressions, drafts
│   ├── app/                            # Authenticated GTM Command Center (42 luxury views)
│   │   ├── abm/                        # Account-Based Marketing dashboard
│   │   ├── accounts/                   # Connected accounts registry
│   │   ├── admin/                      # RBAC governance & system oversight
│   │   ├── ai-agents/                  # Autonomous agent roster & execution
│   │   ├── analytics/                  # ROI & performance telemetry
│   │   ├── copilot/                    # Interactive conversational sales agent
│   │   ├── crm/                        # Live Kanban deal pipeline & stage editor
│   │   ├── customers/                  # Retention & customer success engine
│   │   ├── features-lab/               # Features 501-600 live execution console
│   │   ├── integrations/               # Third-party integrations hub
│   │   ├── leads/                      # Prospect discovery, filtering, CSV export
│   │   ├── outreach/                   # Multi-channel campaigns & cadence
│   │   ├── providers/                  # 29-provider health monitoring grid
│   │   ├── research/                   # Domain reconnaissance & tech stack scanner
│   │   ├── revenue/                    # Revenue forecasting & ASC 606 ledger
│   │   ├── settings/                   # Workspace, profile & ICP configuration
│   │   ├── whatsapp/                   # WhatsApp Companion & click-to-chat console
│   │   └── workflows/                  # Automation builder & trigger queues
│   ├── globals.css                     # Tailwind & custom CSS tokens
│   └── layout.tsx                      # Root layout, AuthProvider, Viewport export
├── backend/                            # Python 3.11 FastAPI Backend Engine
│   └── app/
│       ├── api/                        # 14 FastAPI Router Modules (70+ endpoints)
│       │   ├── admin.py                # RBAC governance, audit trail, persistence API
│       │   ├── agents.py               # Autonomous agent dispatch & telemetry
│       │   ├── analytics.py            # Real-time metric aggregation
│       │   ├── auth.py                 # PBKDF2 authentication, JWT, OAuth, workspaces
│       │   ├── campaigns.py            # Cadence execution & SMTP testing
│       │   ├── copilot.py              # Natural language sales instruction engine
│       │   ├── crm.py                  # Deal pipeline, stages, contacts, companies
│       │   ├── features_lab.py         # Feature engines 501-600 runner
│       │   ├── integrations.py         # External connectors & webhooks
│       │   ├── leads.py                # Lead search, ICP scoring, CRUD operations
│       │   ├── providers.py            # Multi-provider health & latency tracking
│       │   ├── research.py             # Domain recon & website scraping
│       │   ├── universal_features.py   # Universal enterprise feature adapters
│       │   └── whatsapp.py             # WhatsApp companion & Meta Cloud API router
│       ├── core/                       # Core infrastructure & security
│       │   ├── cloud_db.py             # Dual-mode cloud PostgreSQL / SQLite adapter
│       │   ├── config.py               # Dynamic settings & CORS origin allowlist
│       │   ├── database.py             # Thread-safe SQLite access & non-destructive DDL
│       │   ├── rate_limit.py           # In-memory sliding window rate limiter
│       │   └── security.py             # PBKDF2-HMAC-SHA256, JWT signing, RBAC dependencies
│       ├── schemas/                    # Pydantic v2 validation models
│       ├── services/                   # Business logic services
│       └── main.py                     # FastAPI application factory & CORS middleware
├── components/                         # Shared React UI Component Library
│   ├── auth/                           # Protected route guards & auth modals
│   ├── crm/                            # Kanban deal cards, columns, modals
│   ├── leads/                          # Lead table, filter bar, export modals
│   ├── navigation/                     # App sidebar, executive command palette
│   └── ui/                             # Glassmorphism cards, badges, buttons, inputs
├── docs/                               # Architectural & API Specifications
│   ├── API_REFERENCE.md                # REST API endpoints contract
│   ├── cloud_postgres_schema.sql       # 16-table PostgreSQL DDL schema
│   └── FEATURE_REALITY_MATRIX.md       # Real vs mock capability analysis
├── lib/                                # Frontend Utility Libraries
│   ├── api-client.ts                   # Unified Axios/Fetch API wrapper
│   ├── auth-context.tsx                # Client-side user & workspace session provider
│   ├── backend-proxy.ts                # Vercel-to-FastAPI resilience proxy & fallback
│   └── default-providers.ts            # Sanitized provider definitions
├── scripts/                            # DevOps, Database & Automated Test Utilities
│   ├── cloud_db_migration.py           # Database migration CLI (--status, --export-ddl, --migrate)
│   ├── run_live_self_test.py           # 16 master automated self-tests
│   └── test_live_e2e_api.py            # 18 live REST API route tests
├── usman_data_analytics.db             # Primary SQLite application database (1.24 MB, 170 tables)
├── package.json                        # Frontend dependencies (Next.js 14.2, React 18, Lucide)
├── requirements.txt                    # Backend dependencies (FastAPI, Uvicorn, Pydantic v2, PyJWT)
└── app.py                              # Legacy Streamlit prototype (23,000+ lines, preserved intact)
```

---

## 3. Serverless & REST API Route Inventory

### Next.js Serverless Routes (`app/api/*`)
All 58 routes proxy requests to the FastAPI backend via `lib/backend-proxy.ts` when `BACKEND_URL` is set, and fall back to resilient local/localStorage state when running serverless on Vercel without an external Python runtime.

| Route | HTTP Methods | Underlying Service | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | POST | `auth.py` | PBKDF2 password verification, rate limited, JWT issued |
| `/api/auth/signup` | POST | `auth.py` | Account creation, auto-provisions tenant & workspace |
| `/api/auth/me` | GET | `auth.py` | Authenticated user profile & active workspace context |
| `/api/auth/workspaces` | GET | `auth.py` | Multi-tenant workspace listing |
| `/api/auth/forgot-password` | POST | `auth.py` | Password reset request; non-enumerating |
| `/api/auth/reset-password` | POST | `auth.py` | Single-use token validation & password update |
| `/api/leads` | GET, POST | `leads.py` | Lead filtering, pagination, manual lead creation |
| `/api/leads/search` | POST | `leads.py` | Serper API / SerpApi search execution & ICP scoring |
| `/api/crm/deals` | GET, POST | `crm.py` | Standardized `{status, deals, count}` Kanban deals |
| `/api/crm/deals/[id]/stage`| PUT | `crm.py` | Drag-and-drop Kanban pipeline stage updates |
| `/api/crm/pipeline` | GET | `crm.py` | Grouped deals by stage with value metrics |
| `/api/whatsapp/overview` | GET | `whatsapp.py` | Phone count, drafts prepared, chats opened, sent |
| `/api/whatsapp/settings` | GET, PUT | `whatsapp.py` | Business profile, hours, default templates |
| `/api/whatsapp/templates` | GET, POST | `whatsapp.py` | Custom B2B outreach message templates |
| `/api/whatsapp/leads` | GET | `whatsapp.py` | Scored leads filtered for valid telephone points |
| `/api/campaigns` | GET, POST | `campaigns.py` | Multi-step outreach sequence management |
| `/api/campaigns/accounts` | GET, POST | `campaigns.py` | Connected sender accounts (SMTP, WhatsApp, etc.) |
| `/api/analytics/dashboard` | GET | `analytics.py` | Cross-system aggregated performance metrics |
| `/api/admin/overview` | GET | `admin.py` | RBAC governance, database health, engine type |
| `/api/admin/users` | GET, POST | `admin.py` | User management & role assignment |
| `/api/admin/persistence` | GET | `cloud_db.py` | Active database persistence engine telemetry |
| `/api/providers` | GET | `providers.py` | 29-provider health, masked keys, latency |
| `/api/copilot/chat` | POST | `copilot.py` | Natural language sales copilot assistant |
