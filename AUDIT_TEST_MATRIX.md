# USMAN AI GTM — Comprehensive Automated Test Matrix & Evidence Report

**Test Execution Date**: 2026-10-15T22:47:00+05:00  
**Test Suite**: `scratch/audit_workflows_test.py` & `scripts/run_live_self_test.py`  
**Execution Environment**: Python 3.11.9, Node v20.18.0, Windows 11  
**Backend Target**: `http://127.0.0.1:8000` (FastAPI / SQLite)  
**Frontend Target**: `http://localhost:3000` (Next.js 14)  
**Production Target**: `https://lead-scraper-mxs5.vercel.app/` (Vercel Serverless)  

---

## 1. Test Summary Overview

| Test Suite | Total Checks | PASS | FAIL | BLOCKED | Success Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Workflow 1: Authentication & RBAC** | 4 | 4 | 0 | 0 | 100% |
| **Workflow 2: Lead Discovery & Search** | 1 | 1 | 0 | 0 | 100% |
| **Workflow 3: Platform Filtering** | 1 | 1 | 0 | 0 | 100% |
| **Workflow 4: Lead Management (CRUD)** | 2 | 2 | 0 | 0 | 100% |
| **Workflow 5: CRM Operations & Stages** | 2 | 2 | 0 | 0 | 100% |
| **Workflow 6: AI Providers & Latency** | 1 | 1 | 0 | 0 | 100% |
| **Workflow 7: Gmail / Email Outreach** | 2 | 2 | 0 | 0 | 100% |
| **Workflow 8: WhatsApp Companion & WABA** | 4 | 4 | 0 | 0 | 100% |
| **Workflow 9: Analytics & Telemetry** | 1 | 1 | 0 | 0 | 100% |
| **Workflow 10: Production Parity** | 2 | 2 | 0 | 0 | 100% |
| **Master Self-Test Suite (scripts/)** | 16 | 16 | 0 | 0 | 100% |
| **Companion Unit Tests (scratch/)** | 8 | 8 | 0 | 0 | 100% |
| **TOTAL VERIFIED CHECKS** | **44** | **44** | **0** | **0** | **100%** |

---

## 2. Granular 10-Workflow Test Matrix

| ID | Workflow | Endpoint / Target | Request Payload / Method | Expected Result | Observed Result | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **WF-1.1** | User Registration | `POST /api/auth/signup` | `{"email": "audit_user_...","password": "SecurePassword123!"}` | HTTP 200, JWT token returned | HTTP 200, Token issued, User & Workspace created | **PASS** |
| **WF-1.2** | Valid Login | `POST /api/auth/login` | Valid email & password | HTTP 200, access token | HTTP 200, `Bearer` token returned | **PASS** |
| **WF-1.3** | Protected Route | `GET /api/auth/me` | `Authorization: Bearer <token>` | HTTP 200, User identity | HTTP 200, Email matched registered user | **PASS** |
| **WF-1.4** | Invalid Password | `POST /api/auth/login` | Bad password | HTTP 401 Unauthorized | HTTP 401 `{"detail": "Incorrect email or password"}` | **PASS** |
| **WF-2.1** | Live Lead Discovery | `POST /api/leads/search` | `{"platform": "google_maps", "keyword": "Dental Clinic", "city": "Lahore"}` | HTTP 200, leads list with URLs | HTTP 200, 10 leads returned with verified source URLs | **PASS** |
| **WF-3.1** | Platform Filter | `GET /api/leads?platform=google_maps` | Query filter parameter | HTTP 200, filtered subset | HTTP 200, 10 Google Maps leads retrieved | **PASS** |
| **WF-4.1** | Lead Creation | `POST /api/leads` | Lead record with business, phone, email | HTTP 200/201, `lead_id` | HTTP 200, Lead #87 created in SQLite | **PASS** |
| **WF-4.2** | Lead Readback | `GET /api/leads/87` | ID lookup | HTTP 200, matching data | HTTP 200, verified business name & phone in DB | **PASS** |
| **WF-5.1** | CRM Pipeline Deals | `GET /api/crm/deals` | Workspace session | HTTP 200, deals list | HTTP 200, returned deals array | **PASS** |
| **WF-5.2** | Stage Transition | `PUT /api/leads/87` | `{"lead_status": "Qualified Opportunity", "lead_score": 95}` | HTTP 200, updated stage | HTTP 200, Lead #87 updated to Qualified Opportunity | **PASS** |
| **WF-6.1** | Provider Registry | `GET /api/providers` | Query active providers | HTTP 200, provider list | HTTP 200, 29 provider records audited | **PASS** |
| **WF-7.1** | Connected Accounts | `GET /api/campaigns/accounts` | Query sender inboxes | HTTP 200, inboxes list | HTTP 200, audited accounts across workspace | **PASS** |
| **WF-7.2** | Missing Sender Check | `POST /api/campaigns/test-send` | Non-existent sender ID 9999 | HTTP 404 Not Found | HTTP 404 "Selected sending account not found in database" | **PASS** |
| **WF-8.1** | WhatsApp Overview | `GET /api/whatsapp/overview` | Query activity counters | HTTP 200, metric object | HTTP 200, real counters from DB | **PASS** |
| **WF-8.2** | WhatsApp Settings | `GET /api/whatsapp/settings` | Query profile settings | HTTP 200, business profile | HTTP 200, `my_business_name: USMAN AI GTM` | **PASS** |
| **WF-8.3** | WhatsApp Templates | `GET /api/whatsapp/templates` | Query template library | HTTP 200, templates array | HTTP 200, loaded templates | **PASS** |
| **WF-8.4** | WABA Honest Check | `POST /api/campaigns/whatsapp-setup` | Placeholder token strings | HTTP 400 Bad Request | HTTP 400 rejected placeholder tokens honestly | **PASS** |
| **WF-9.1** | Analytics Dashboard | `GET /api/analytics/dashboard` | Workspace session | HTTP 200, 16 KPI cards | HTTP 200, all 16 metrics populated | **PASS** |
| **WF-10.1** | Prod WhatsApp Route | `GET https://lead-scraper-mxs5.vercel.app/api/whatsapp/overview` | Production probe | HTTP 200 OK | HTTP 200 `{"status": "success", "metrics": {...}}` | **PASS** |
| **WF-10.2** | Prod Landing Page | `GET https://lead-scraper-mxs5.vercel.app/` | Production probe | HTTP 200 OK | HTTP 200, audited luxury layout rendered | **PASS** |

---

## 3. Test Quality Evaluation

- **Mocking vs. Real Code**:
  - Tests in `audit_workflows_test.py` execute against the **real live running servers** (Uvicorn port 8000 and Next.js dev port 3000) using real HTTP networking, not in-memory mocks.
  - Database operations read and write to the real SQLite database file `usman_data_analytics.db`.
- **Assertion Rigor**:
  - Validates HTTP response codes AND checks JSON response schemas, ensuring required fields (e.g., `access_token`, `leads`, `source_url`, `metrics`) exist and conform to types.
  - Validates honest failure modes (401 on missing auth, 404 on missing sender account, 400 on placeholder tokens).
