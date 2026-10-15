# USMAN AI GTM — Application Security & Privacy Audit Report

**Audit Date**: 2026-10-15T22:52:00+05:00  
**Target Systems**: Next.js App Router (Vercel) + FastAPI Python Backend + SQLite Database  
**Auditor**: Senior Application Security Engineer & DevOps Auditor  

---

## 1. Executive Summary & Security Posture

The USMAN AI GTM platform exhibits a strong cryptographic foundation in its core authentication layer (PBKDF2-HMAC-SHA256 with 100,000 iterations, random 16-byte salt, constant-time `hmac.compare_digest`, and HS256 JWT tokens). No hardcoded private production API keys or credentials were found in the application repository.

However, forensic inspection identified **7 security vulnerabilities** (2 High/P1, 5 Medium/P2) concerning CORS policies, plaintext fallback logic, unencrypted browser `localStorage` credential storage, dynamic SQL interpolation, and missing rate limiting.

---

## 2. Granular Security Findings

### SEC-001: Permissive Wildcard CORS with Credentials
- **Severity**: **P1 (High)**
- **Location**: `backend/app/main.py:38-44`
- **Description**:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- **Exploit Risk**: The combination of `allow_origins=["*"]` with `allow_credentials=True` permits any third-party website visited by an authenticated user to issue cross-origin requests to the local/hybrid backend, potentially reading leads, deals, or triggering outreach actions without consent.
- **Remediation**: Restrict `allow_origins` to explicitly configured domain origins from `settings.ALLOWED_ORIGINS` (e.g., `["https://lead-scraper-mxs5.vercel.app", "http://localhost:3000"]`).

---

### SEC-002: Plaintext Password Matching Fallback
- **Severity**: **P1 (High)**
- **Location**: `backend/app/core/security.py:46-48`
- **Description**:
  ```python
  if hashed_password.startswith("pbkdf2_sha256$"):
      ...
  else:
      # Fallback check for initial admin/test passwords if plain
      return plain_password == hashed_password
  ```
- **Exploit Risk**: If any legacy user record in `users` table possesses an unhashed password, the system accepts plaintext comparison without forcing a cryptographic upgrade. Furthermore, standard non-constant-time equality (`==`) is vulnerable to timing analysis attacks.
- **Remediation**: Remove plaintext equality. On first login with a legacy hash, immediately compute `hash_password(plain_password)` and write back to the database; reject pure plaintext strings.

---

### SEC-003: Plaintext Custom API Keys Stored in Browser `localStorage`
- **Severity**: **P2 (Medium)**
- **Location**: `app/app/leads/page.tsx:99-101`
- **Description**:
  ```typescript
  if (typeof window !== "undefined") {
    localStorage.setItem("usman_custom_provider_keys", JSON.stringify(updated));
  }
  ```
- **Exploit Risk**: Custom third-party provider keys (OpenAI, Anthropic, Gemini, SerpApi, Apollo) entered via the 29-Provider Modal are persisted in plain JSON in the browser's `window.localStorage`. Any Cross-Site Scripting (XSS) vulnerability or untrusted browser extension can extract these keys.
- **Remediation**: Store provider keys exclusively server-side in encrypted form using AES-256-GCM, masking them in the frontend and only transmitting them via HTTPS to serverless API routes.

---

### SEC-004: Lack of Cross-Site Request Forgery (CSRF) Protection on Next.js Serverless Routes
- **Severity**: **P2 (Medium)**
- **Location**: `app/api/*` (Mutation routes: `POST /api/leads/search`, `POST /api/crm/deals`, `POST /api/campaigns`)
- **Description**: Serverless API routes accept JSON payloads relying on `Authorization` headers or cookie tokens without verifying an anti-CSRF token or validating `Origin`/`Referer` headers against the canonical production origin.
- **Exploit Risk**: Authenticated sessions using ambient cookies could be leveraged by external attackers via forged requests if cookie-based authentication is enabled.
- **Remediation**: Enforce strict Origin checking in a Next.js middleware and implement SameSite=Strict cookies.

---

### SEC-005: Absence of Endpoint Rate Limiting on Scraper & Discovery APIs
- **Severity**: **P2 (Medium)**
- **Location**: `backend/app/api/leads.py:50-57` & `app/api/leads/search/route.ts`
- **Description**: The live search endpoint `/api/leads/search` executes external web requests and multi-source scraping without per-user or per-IP rate-limiting middleware.
- **Exploit Risk**: Malicious or runaway client loops could rapidly exhaust external search quotas (SerpApi, Google, Tavily) or cause IP-level blocking from target directories.
- **Remediation**: Integrate a Token Bucket or Redis/memory-based sliding window rate limiter (e.g., maximum 10 discovery requests per minute per workspace).

---

### SEC-006: Dynamic SQL String Interpolation in Table Introspection & Migrations
- **Severity**: **P2 (Medium)**
- **Location**: `backend/app/core/database.py:123, 183` & `app.py:10260, 10270, 14738`
- **Description**:
  ```python
  cur.execute(f"ALTER TABLE users ADD COLUMN {col} {ctype}")
  ```
- **Exploit Risk**: While `{col}` is sourced from internal schema definition lists, using f-strings inside `execute()` sets a dangerous coding precedent and bypasses SQL query parameterization safeguards.
- **Remediation**: Validate column names against a strict alphanumeric whitelist regex (`^[a-zA-Z_][a-zA-Z0-9_]*$`) before interpolation, and wrap column identifiers in standard double quotes.

---

### SEC-007: Missing Webhook Signature Verification
- **Severity**: **P2 (Medium)**
- **Location**: `backend/app/api/whatsapp.py` & `app/api/integrations/`
- **Description**: Incoming webhooks from external providers do not validate HMAC signatures (such as `X-Hub-Signature-256` for Meta WhatsApp or Stripe/Slack webhook signatures).
- **Exploit Risk**: Attackers could forge incoming webhook events (e.g., fabricating fake WhatsApp delivery receipts or fake incoming customer responses) by POSTing arbitrary JSON payloads to public webhook endpoints.
- **Remediation**: Implement HMAC-SHA256 signature verification matching the provider's shared secret before processing any incoming webhook payload.
