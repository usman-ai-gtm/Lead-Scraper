# USMAN AI GTM — Comprehensive Prioritized Bug Register

**Audit Date**: 2026-10-15T22:53:00+05:00  
**Classification Standard**: P0 (Critical/Blocker), P1 (High/Severe), P2 (Medium/Functional), P3 (Low/Cosmetic/Technical Debt)  
**Total Identified Bugs**: 10 (0 P0, 4 P1, 4 P2, 2 P3)  

---

## 1. Summary Bug Table

| Bug ID | Severity | Category | Component / File | Summary | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | **P1** | Build & Deployment | `requirements.txt` | Python dependencies missing FastAPI, Uvicorn, and Pydantic | Identified |
| **BUG-002** | **P1** | Architecture / DB | Architecture Topology | Serverless Vercel ephemeral storage lacks persistent backend DB | Identified |
| **BUG-003** | **P1** | Security | `backend/app/main.py:40` | Wildcard CORS (`*`) with `allow_credentials=True` | Identified |
| **BUG-004** | **P1** | Security | `backend/app/core/security.py:47`| Plaintext password fallback comparison in verify_password | Identified |
| **BUG-005** | **P2** | External Integration| `.env` / `whatsapp-setup` | Meta Cloud WABA credentials missing in environment | Blocked by Config |
| **BUG-006** | **P2** | Outreach / SMTP | `.env` / `campaigns.py` | System SMTP unconfigured in environment | Blocked by Config |
| **BUG-007** | **P2** | API Contract | `backend/app/api/crm.py:54` | `GET /api/crm/deals` returns raw array instead of wrapped object | Identified |
| **BUG-008** | **P2** | Frontend Security | `app/app/leads/page.tsx:100` | Custom third-party API keys stored in plaintext `localStorage` | Identified |
| **BUG-009** | **P3** | Technical Debt | `app.py`, `frontend/app/` | Monolithic legacy Streamlit app & duplicate frontend folder in root | Identified |
| **BUG-010** | **P3** | Frontend Build | `app/accounts/`, `app/admin/` | Deprecated viewport metadata configuration in Next.js 14 | Identified |

---

## 2. Granular Bug Details

### BUG-001: `requirements.txt` Out of Sync with FastAPI Backend
- **Severity**: **P1 (High)**
- **File**: `requirements.txt:1-8`
- **What is Wrong**: `requirements.txt` specifies only legacy Streamlit packages (`streamlit`, `pandas`, `requests`, `beautifulsoup4`, `reportlab`, `cryptography`, `openpyxl`). It completely lacks the production FastAPI backend dependencies: `fastapi`, `uvicorn`, `pydantic`, `PyJWT`, `python-dotenv`, and `python-multipart`.
- **Reproduction**: Create a clean Python virtualenv and run `pip install -r requirements.txt`. Attempt to run `uvicorn backend.app.main:app`. Result: `ModuleNotFoundError: No module named 'fastapi'`.
- **Business Impact**: If the backend is deployed to a cloud container or virtual machine (Render, AWS, DigitalOcean), the deployment will fail immediately.
- **Suggested Fix**: Update `requirements.txt` to include `fastapi>=0.110.0`, `uvicorn>=0.28.0`, `pydantic>=2.6.0`, `PyJWT>=2.8.0`, `python-dotenv>=1.0.0`, `python-multipart>=0.0.9`.

---

### BUG-002: Serverless Vercel Ephemeral Storage Disconnect
- **Severity**: **P1 (High)**
- **Component**: Architecture Topology (Next.js Serverless vs. Local SQLite)
- **What is Wrong**: The primary database `usman_data_analytics.db` is an SQLite file that lives on the local Windows filesystem. When deployed to Vercel, serverless lambdas run in read-only/ephemeral container runtimes. Next.js API routes on Vercel cannot write to a persistent SQLite file on a developer's desktop without an external database service (Turso / Supabase / PostgreSQL).
- **Current Mitigation**: The frontend in `app/app/whatsapp/page.tsx` and `app/app/crm/page.tsx` uses a client-side `localStorage` fallback bridge.
- **Business Impact**: Different browsers or devices accessing `https://lead-scraper-mxs5.vercel.app/` do not share a single synchronized multi-tenant database.
- **Suggested Fix**: Provision a serverless cloud database (e.g. Turso SQLite or Supabase Postgres) and configure `DATABASE_URL` in Vercel project environment variables.

---

### BUG-003: Permissive Wildcard CORS with Credentials
- **Severity**: **P1 (High)**
- **File**: `backend/app/main.py:40-41`
- **What is Wrong**: FastAPI middleware specifies `allow_origins=["*"]` with `allow_credentials=True`.
- **Reproduction**: Send an OPTIONS preflight request with `Origin: https://evil-site.com`. The response includes `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Credentials: true`.
- **Business Impact**: Cross-origin vulnerability allowing external malicious sites to execute authenticated requests against the local API.
- **Suggested Fix**: Replace `allow_origins=["*"]` with `allow_origins=settings.ALLOWED_ORIGINS` (pointing to `lead-scraper-mxs5.vercel.app` and `localhost`).

---

### BUG-004: Plaintext Password Matching Fallback
- **Severity**: **P1 (High)**
- **File**: `backend/app/core/security.py:46-48`
- **What is Wrong**: `verify_password()` contains an insecure fallback: `return plain_password == hashed_password`.
- **Reproduction**: Set a database user's `password_hash` column to plain text `"password"`. Logging in with `"password"` succeeds.
- **Business Impact**: Weakens password security and allows non-constant-time comparison on legacy records.
- **Suggested Fix**: Remove plaintext equality. Enforce PBKDF2 hashing across all records and reject unhashed strings.

---

### BUG-005: Meta WhatsApp Cloud API Credentials Unconfigured
- **Severity**: **P2 (Medium)**
- **Component**: `.env` & `app/api/campaigns/whatsapp-setup/route.ts`
- **What is Wrong**: Environment variables `WHATSAPP_WABA_ID`, `WHATSAPP_TOKEN`, and `WHATSAPP_PHONE_NUMBER_ID` are unconfigured. The setup wizard correctly returns HTTP 400 Bad Request to prevent simulated success.
- **Status**: **BLOCKED BY CREDENTIALS**.
- **Alternative Working Workflow**: The **Manual Click-to-Chat Web Companion** (`https://wa.me/...`) is fully operational and requires no Meta API fees.

---

### BUG-006: System SMTP Outbound Email Unconfigured
- **Severity**: **P2 (Medium)**
- **Component**: `.env` & `backend/app/api/campaigns.py`
- **What is Wrong**: Default platform SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`) are not set in `.env`.
- **Status**: **BLOCKED BY CONFIGURATION**.
- **Alternative Working Workflow**: Individual user-connected Google OAuth / custom SMTP accounts configured in the UI at `/app/outreach/accounts` work independently.

---

### BUG-007: Inconsistent Response Structure for `GET /api/crm/deals`
- **Severity**: **P2 (Medium)**
- **File**: `backend/app/api/crm.py:54`
- **What is Wrong**: `GET /api/crm/deals` returns a raw JSON array `[...]`, whereas `/api/leads` and `/api/whatsapp/leads` return wrapped dictionaries `{"leads": [...]}`.
- **Business Impact**: Frontend code must handle two different response shapes depending on whether it consumes the Python backend directly or the Next.js serverless route proxy.
- **Suggested Fix**: Standardize `GET /api/crm/deals` to return `{"status": "success", "deals": deals}`.

---

### BUG-008: Plaintext Provider Keys in Browser `localStorage`
- **Severity**: **P2 (Medium)**
- **File**: `app/app/leads/page.tsx:100`
- **What is Wrong**: Custom API keys configured via the 29-provider modal are saved unencrypted under `localStorage.getItem("usman_custom_provider_keys")`.
- **Business Impact**: Vulnerable to XSS key extraction in shared or compromised browser profiles.
- **Suggested Fix**: Migrate provider key storage to encrypted server-side SQLite/Postgres.

---

### BUG-009: Monolithic Legacy Files Retained in Root Workspace
- **Severity**: **P3 (Low)**
- **Files**: `app.py` (12,850 lines), `enterprise_core/`, `ui/`, `frontend/app/`
- **What is Wrong**: The repository retains the legacy Streamlit application alongside the modern Next.js + FastAPI architecture, inflating repository size and creating ambiguity.
- **Suggested Fix**: Move legacy Streamlit files into an archive directory `archive/streamlit_legacy/` after ensuring no production references remain.

---

### BUG-010: Deprecated Viewport Metadata Export Warning
- **Severity**: **P3 (Low)**
- **Files**: `app/accounts/page.tsx`, `app/admin/page.tsx`, `app/analytics/page.tsx`, etc.
- **What is Wrong**: Next.js 14 build emits warnings: `Unsupported metadata viewport is configured in metadata export. Please move it to viewport export instead.`
- **Business Impact**: Harmless build warning, does not break compilation.
- **Suggested Fix**: Separate `viewport` into `export const viewport = { ... }` per Next.js 14 documentation.
