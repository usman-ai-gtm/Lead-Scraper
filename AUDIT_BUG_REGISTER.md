# USMAN AI GTM — Master Forensic Bug Register & Remediation Catalog

**Audit Date**: 2026-10-16  
**Auditor**: Principal Software Architect & QA Automation Lead  
**Scope**: Full-stack codebase covering Next.js, FastAPI, database, API contracts, and security posture.

---

## 1. Master Bug Register Summary

| Bug ID | Severity | Category | File & Line Reference | Short Description | Remediation Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-015 / SEC-008** | **P0** | Security / Auth | `backend/app/core/security.py:83` | Bearer prefix bypass (`jwt_session_`) grants instant ADMIN rights | **RESOLVED / REMEDIATED** |
| **BUG-011 / SEC-007** | **P1** | Security / Auth | `backend/app/api/auth.py:284` | Password reset single-use token leaked in JSON response | **RESOLVED / REMEDIATED** |
| **BUG-012** | **P2** | Feature Realism | `backend/app/api/agents.py:185` | AI Agent run returns simulated metrics without calling LLMs | **RESOLVED / REMEDIATED** |
| **BUG-013** | **P2** | Feature Realism | `backend/app/services/providers_service.py:78` | Provider health check simulates latency via `sleep(0.08)` without live ping | **RESOLVED / REMEDIATED** |
| **BUG-014** | **P3** | Feature Realism | `backend/app/services/features_501_600_service.py:138` | Feature lab engines 501-600 return hardcoded mock telemetry | **RESOLVED / REMEDIATED** |
| **BUG-001** | **P1** | Deployment | `requirements.txt:8-13` | Missing FastAPI, Uvicorn, Pydantic dependencies | **RESOLVED (Commit d3d988c)** |
| **BUG-002 / SEC-001** | **P0** | Security / CORS | `backend/app/main.py:27` | Wildcard CORS allowlist with credentials allowed | **RESOLVED (Commit d3d988c)** |
| **BUG-003 / SEC-002** | **P0** | Security / Auth | `backend/app/core/security.py:44` | Plaintext password fallback check | **RESOLVED (Commit d3d988c)** |
| **BUG-004 / SEC-003** | **P2** | Security / Secrets | `lib/default-providers.ts:15` | Static provider key strings exposed in client JS bundles | **RESOLVED (Commit d3d988c)** |
| **BUG-005 / SEC-005** | **P1** | Abuse Control | `backend/app/core/rate_limit.py:1` | Absence of rate limiting on discovery and auth endpoints | **RESOLVED (Commit d3d988c)** |
| **BUG-006 / SEC-006** | **P1** | Security / SQL | `backend/app/core/database.py:122` | Dynamic SQL migration missing column name validation | **RESOLVED (Commit d3d988c)** |
| **BUG-007** | **P2** | API Contract | `backend/app/api/crm.py:54` | `GET /api/crm/deals` returned raw array instead of wrapped object | **RESOLVED (Commit d3d988c)** |
| **BUG-008** | **P2** | Export Safety | `app/app/leads/page.tsx:285` | CSV export lacked formula injection escaping | **RESOLVED (Commit d3d988c)** |
| **BUG-009 / BUG-010** | **P3** | Build Hygiene | `app/layout.tsx:5` | Deprecated viewport export in Next.js 14 metadata | **RESOLVED (Commit d3d988c)** |
| **BUG-010** | **P2** | Metric Honesty | `backend/app/api/admin.py:41` | Hardcoded marketing claims in admin overview | **RESOLVED (Commit d3d988c)** |

---

## 2. Detailed Forensic Register for Confirmed Active Bugs

### BUG-015 / SEC-008: Hardcoded Bearer Prefix Authentication Bypass
- **Severity**: **P0 (Critical Security)**
- **Component**: `backend/app/core/security.py:83-91`
- **Root Cause**: `decode_access_token` contains a fallback allowing any token string beginning with `jwt_session_`, `google_`, or `usman_jwt_` to impersonate `admin@usmanai.com` with User ID 1 and role `ADMIN`.
- **Status**: **RESOLVED / REMEDIATED**.
- **Fix Applied**: Removed insecure prefix checks in `decode_access_token`. Enforced strict cryptographic HMAC-SHA256 signature and expiration verification. Next.js Google OAuth callback replaced with verified Google OpenID `id_token` verification against Google tokeninfo.
- **Verification**: `scratch/test_security_remediations.py` passed with 8/8 invalid/forged prefix tokens rejected with HTTP 401.

---

### BUG-011 / SEC-007: Password Reset Single-Use Token Leaked in API Response
- **Severity**: **P1 (High Security)**
- **Component**: `backend/app/api/auth.py:284`
- **Root Cause**: `"token_available_for_local_test": reset_token if os.getenv("ENVIRONMENT") == "development" or reset_token is not None else None`. Because `reset_token is not None` evaluates to `True`, the token is returned even in production.
- **Status**: **RESOLVED / REMEDIATED**.
- **Fix Applied**: Removed `token_available_for_local_test` from public response models and route handler. Enforced non-enumerating generic response for all emails. Redacted sample tokens from documentation. Executed SQL sanitization setting `used = 1` for all outstanding tokens in database. Added rate limiting.
- **Verification**: `scratch/test_security_remediations.py` passed verifying no token in response and identical generic response for registered/unregistered emails.

---

### BUG-012: Simulated AI Agent Execution Results
- **Severity**: **P2 (Feature Realism)**
- **Component**: `backend/app/api/agents.py:185-207`
- **Root Cause**: `execute_agent` synthesizes mock execution metrics (`tokens_consumed: 840`, `confidence_score: 0.96`, `latency_ms: 142`) instead of dispatching the prompt to a real configured LLM provider.
- **Status**: **RESOLVED / REMEDIATED**.
- **Fix Applied**: Rewrote `execute_agent` to distinguish dry-run simulation (consumes 0 tokens, measures real local latency, sets `simulated: True`) from live execution. If live execution is requested with missing provider credentials, returns honest `status: "blocked"`, `outcome: "NOT_CONFIGURED"`. If provider is configured, measures real latency and consumes real tokens.
- **Verification**: `scratch/test_security_remediations.py` verified dry-run returns `tokens_consumed: 0` and real latency.

---

### BUG-013: Simulated Latency and Mock Health Check in Providers Service
- **Severity**: **P2 (Feature Realism)**
- **Component**: `backend/app/services/providers_service.py:78-90`
- **Root Cause**: `test_provider` executes `time.sleep(0.08)` and updates provider status to `"Operational"` without issuing an HTTP request to the external provider endpoint.
- **Status**: **RESOLVED / REMEDIATED**.
- **Fix Applied**: Removed `time.sleep(0.08)` simulation. Implemented provider-specific zero-cost bounded HTTP health probes (Serper credits, SerpApi account, Groq/Gemini/OpenRouter models). Returns honest statuses: `NOT_CONFIGURED`, `OPERATIONAL`, `AUTH_FAILED`, `RATE_LIMITED`, `TIMEOUT`, `FAILED`. Masked secrets in responses.
- **Verification**: `scratch/test_security_remediations.py` verified unconfigured providers return `NOT_CONFIGURED`.

---

### BUG-014: Fallback Mock Telemetry for Features 501–600
- **Severity**: **P3 (Feature Realism)**
- **Component**: `backend/app/services/features_501_600_service.py:138-160`
- **Root Cause**: When a feature function `ultra_feature_{id}` is not found in legacy `app.py`, the service returns static mock data (`records_evaluated: 184`, `trend: "+14.2%"`).
- **Status**: **RESOLVED / REMEDIATED**.
- **Fix Applied**: Features 501 (Deal Win Probability), 507 (Sales Velocity), 508 (Pipeline Coverage), and 582 (SOC 2 Continuous Evidence Collector) now calculate genuine metrics from SQLite `crm_deals` and `account_audit_logs`. Unpopulated features return honest `insufficient_data` states with 0 evaluated records and zero fabricated trends.
- **Verification**: `scratch/test_security_remediations.py` verified Feature 501 evaluates real live deals and Feature 502 returns `insufficient_data` with 0 records.
