# USMAN AI GTM — Master Repair Changelog

This document logs all confirmed bugs, their forensic root cause, files changed, fixes implemented, and corresponding regression tests.

---

### BUG-001: Missing FastAPI and Modern Backend Dependencies in `requirements.txt`
- **Severity**: P1 (High)
- **Root Cause & Evidence**: `requirements.txt` only listed 7 legacy Streamlit dependencies (`streamlit`, `pandas`, `requests`, `beautifulsoup4`, `reportlab`, `cryptography`, `openpyxl`). It omitted `fastapi`, `uvicorn`, `pydantic`, `PyJWT`, `python-dotenv`, and `python-multipart`, causing runtime failures in environments deployed from `requirements.txt`.
- **Files Changed**:
  - `requirements.txt`
- **Fix Implemented**: Added `fastapi>=0.110.0`, `uvicorn[standard]>=0.28.0`, `pydantic>=2.6.0`, `PyJWT>=2.8.0`, `python-dotenv>=1.0.0`, and `python-multipart>=0.0.9` while strictly preserving all existing packages.
- **Regression Test**: Verified Python backend startup via Uvicorn on port 8000; all FastAPI route imports loaded cleanly.
- **Compatibility**: Fully backward compatible with legacy Streamlit modules and modern FastAPI backend.

---

### BUG-002: Wildcard CORS with Credentials Allowed
- **Severity**: P0 (Critical Security)
- **Root Cause & Evidence**: In `backend/app/main.py:27`, CORS middleware used `allow_origins=["*"]` with `allow_credentials=True`. In HTTP specifications and browser security models, wildcard origin with credentials allows arbitrary cross-origin sites to execute authenticated requests against the API.
- **Files Changed**:
  - `backend/app/core/config.py`
  - `backend/app/main.py`
- **Fix Implemented**: Replaced wildcard with an explicit, configurable origin allowlist loaded via `get_cors_origins` property (`http://localhost:3000`, `http://127.0.0.1:3000`, `https://lead-scraper-mxs5.vercel.app`, and custom `ALLOWED_ORIGINS`). Explicitly declared allowed HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`) and headers.
- **Regression Test**: Verified CORS preflight and credential handling in `scratch/audit_workflows_test.py` and `scripts/test_live_e2e_api.py`.
- **Compatibility**: Supports both local development on port 3000/8000 and the live production website.

---

### BUG-003: Plaintext Password Comparison Fallback
- **Severity**: P0 (Critical Security)
- **Root Cause & Evidence**: `backend/app/core/security.py:44` contained `if plain_password == hashed_password: return True`. If a database record or injection ever introduced an unhashed string, an attacker supplying that string could authenticate directly without cryptographic verification.
- **Files Changed**:
  - `backend/app/core/security.py`
- **Fix Implemented**: Removed the plaintext equality check entirely. Enforced constant-time PBKDF2-HMAC-SHA256 (100,000 iterations) verification using `hmac.compare_digest`. Database audit verified that all 14 existing user records in `usman_data_analytics.db` already use `pbkdf2_sha256$100000...` hashes, so zero users are locked out.
- **Regression Test**: Verified in `scripts/run_live_self_test.py` Test 2: Valid PBKDF2 login succeeds; wrong password returns HTTP 401; unhashed attempts are strictly rejected.
- **Compatibility**: Seamlessly preserves all existing legitimate user accounts.

---

### BUG-004: Client-Side Provider API Key Sanitization
- **Severity**: P2 (Security / Credential Exposure)
- **Root Cause & Evidence**: Provider keys entered via the frontend modal were stored in browser `localStorage.getItem("usman_custom_provider_keys")` and `lib/default-providers.ts` contained an unmasked key string bundled into client JavaScript.
- **Files Changed**:
  - `lib/default-providers.ts`
  - `app/app/leads/page.tsx`
- **Fix Implemented**: Masked static provider key values in client bundles. In `app/app/leads/page.tsx`, masked keys before saving to `localStorage` and synchronized the key securely to server-side `/api/providers/[id]/key`.
- **Regression Test**: Inspected frontend bundle outputs in production build; zero raw credentials bundled.
- **Compatibility**: Preserves user custom key overrides while preventing credential harvesting.

---

### BUG-005: Absence of Rate Limiting on Discovery & Auth
- **Severity**: P1 (Abuse / Cost Control)
- **Root Cause & Evidence**: `POST /api/leads/search` and `POST /api/auth/login` lacked rate limits, leaving the backend vulnerable to automated credential stuffing and rapid consumption of paid API credits.
- **Files Changed**:
  - `backend/app/core/rate_limit.py` (New module)
  - `backend/app/api/auth.py`
  - `backend/app/api/leads.py`
- **Fix Implemented**: Implemented an in-memory sliding-window rate limiter. Applied `search_rate_limiter` (30 req/min per IP/token) on live lead discovery and `auth_rate_limiter` (20 attempts/min per IP) on login.
- **Regression Test**: Verified in `scratch/audit_workflows_test.py` that legitimate requests pass while excessive bursts are metered.
- **Compatibility**: Completely transparent to normal interactive usage.

---

### BUG-006: Dynamic SQL Table Migration Injection Protection
- **Severity**: P1 (Security / Input Safety)
- **Root Cause & Evidence**: In `backend/app/core/database.py:124`, `ALTER TABLE` statements appended column names directly without identifier validation.
- **Files Changed**:
  - `backend/app/core/database.py`
- **Fix Implemented**: Added regex validation (`^[a-zA-Z0-9_]+$`) and identifier double-quoting on all dynamic column and table alterations.
- **Regression Test**: Verified during `init_app_database()` execution during startup; all 170 tables and schema checks executed cleanly.
- **Compatibility**: Preserves non-destructive additive schema migrations.

---

### BUG-007: Inconsistent Response Structure for `GET /api/crm/deals`
- **Severity**: P2 (API Consistency)
- **Root Cause & Evidence**: `GET /api/crm/deals` returned a raw array `[...]`, whereas other entity endpoints returned wrapped objects `{"leads": [...]}`. Frontend components had brittle handling if the response format shifted.
- **Files Changed**:
  - `backend/app/api/crm.py`
  - `app/api/crm/deals/route.ts`
  - `frontend/app/api/crm/deals/route.ts`
  - `app/app/crm/page.tsx`
- **Fix Implemented**: Standardized `GET /api/crm/deals` to return `{"status": "success", "deals": deals, "count": len(deals)}`. Updated `app/app/crm/page.tsx` and proxy fallbacks to support both wrapped format and raw arrays seamlessly.
- **Regression Test**: Tested in `scratch/audit_workflows_test.py:WF-5` and `scripts/test_live_e2e_api.py`.
- **Compatibility**: Fully backward compatible with legacy callers and modern clients.

---

### BUG-008: Formula Injection Risk in CSV Lead Exports
- **Severity**: P2 (Export Safety)
- **Root Cause & Evidence**: In `app/app/leads/page.tsx`, `exportCSV` joined raw field values without escaping leading spreadsheet formula characters (`=`, `+`, `-`, `@`), posing a CSV injection risk if untrusted prospect website data was opened in Excel.
- **Files Changed**:
  - `app/app/leads/page.tsx`
- **Fix Implemented**: Implemented `sanitizeCell()` helper prefixing risky formula characters with a single quote and escaping double quotes.
- **Regression Test**: Verified export generation logic; formula injection vectors neutralized.
- **Compatibility**: Preserves valid CSV exports while protecting user spreadsheet applications.

---

### BUG-009: Deprecated Viewport Metadata Export Warning
- **Severity**: P3 (Build Hygiene)
- **Root Cause & Evidence**: In `app/layout.tsx` and `frontend/app/layout.tsx`, `viewport` was declared inside the `metadata` object, triggering Next.js 14 deprecation warnings.
- **Files Changed**:
  - `app/layout.tsx`
  - `frontend/app/layout.tsx`
- **Fix Implemented**: Separated `viewport: Viewport` into its own top-level export per Next.js 14 specification.
- **Regression Test**: `npm run build` completed with zero warnings and exited with code 0.
- **Compatibility**: Clean forward-compatibility with Next.js 14 and 15.

---

### BUG-010: Hardcoded Marketing Claims in Admin Overview
- **Severity**: P2 (Metric Honesty)
- **Root Cause & Evidence**: `backend/app/api/admin.py` returned hardcoded strings: `"active_ai_providers": 29`, `"system_health_score": 99.4`, `"security_posture": "SOC2 Compliant / AES-256 Gated"`.
- **Files Changed**:
  - `backend/app/api/admin.py`
- **Fix Implemented**: Replaced hardcoded claims with dynamic database engine inspection (`database_engine`, `persistence_mode`) and truthful security posture (`PBKDF2-HMAC-SHA256 / RBAC Isolation / Whitelisted CORS`).
- **Regression Test**: Verified via `GET /api/admin/overview` returning dynamic values.
- **Compatibility**: UI displays truthful metrics without breaking layout.
