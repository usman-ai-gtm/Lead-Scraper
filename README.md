# USMAN AI GTM — Autonomous B2B Sales Intelligence & Revenue Engine

> **Tagline:** *Find. Engage. Convert. Grow.*  
> **Positioning:** Enterprise-grade AI-powered B2B prospecting, omnichannel outreach, CRM pipeline management, and autonomous revenue execution platform.

---

## 1. Architecture Overview

USMAN AI GTM has been fully re-architected from a legacy monolithic Streamlit script into a high-performance, decoupled, modern SaaS web application:

```
[ Browser / Mobile Client ]
            │
            ▼ (HTTPS / WSS)
┌────────────────────────────────────────────────────────┐
│  Next.js 14 Web Application (App Router + TypeScript) │
│  - Tailwind CSS + Lucide Icons + Glassmorphism UI     │
│  - Customer-Facing & Admin Route Architecture          │
│  - Instant Optimistic State & Live Telemetry Modals    │
└───────────────────────────────────┬────────────────────┘
                                    │
                         REST API & WebSockets (/api/*)
                                    │
                                    ▼
┌────────────────────────────────────────────────────────┐
│         FastAPI High-Performance Python Backend         │
│  - Pydantic v2 Input/Output Validation                 │
│  - PBKDF2-HMAC-SHA256 Auth & JWT Session Tokens        │
│  - Role-Based Access Control (Admin, Manager, User)   │
│  - Asynchronous Background Task Queue                  │
└────────────┬──────────────┬──────────────┬─────────────┘
             │              │              │
             ▼              ▼              ▼
┌──────────────────┐ ┌───────────────┐ ┌───────────────────┐
│ Primary Database │ │ Multi-AI Vault│ │ Channel Adapters  │
│ - SQLite (Local) │ │ - 29+ Engines │ │ - Official Gmail  │
│ - PostgreSQL(Prod│ │ - OpenAI,Groq │ │   OAuth 2.0       │
│ - 222+ Tables    │ │   Gemini, etc.│ │ - Meta WhatsApp   │
│ - Non-destructive│ └───────────────┘ │   Cloud API (WABA)│
└──────────────────┘                   └───────────────────┘
```

---

## 2. Repository & Folder Structure

```
d:/LUXURY DASHBOARD/
├── backend/
│   ├── app/
│   │   ├── api/                   # API Endpoints (Auth, Leads, CRM, Campaigns, AI, etc.)
│   │   │   ├── admin.py
│   │   │   ├── analytics.py
│   │   │   ├── auth.py
│   │   │   ├── campaigns.py
│   │   │   ├── copilot.py
│   │   │   ├── crm.py
│   │   │   ├── features_lab.py
│   │   │   ├── leads.py
│   │   │   ├── providers.py
│   │   │   └── research.py
│   │   ├── core/                  # Security, Database connection & configuration
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── models/                # Database ORM models
│   │   ├── schemas/               # Pydantic validation schemas
│   │   ├── services/              # Business logic (Leads, Outreach, CRM, AI, etc.)
│   │   │   ├── analytics_service.py
│   │   │   ├── campaign_service.py
│   │   │   ├── copilot_service.py
│   │   │   ├── crm_service.py
│   │   │   ├── features_501_600_service.py
│   │   │   ├── lead_service.py
│   │   │   ├── providers_service.py
│   │   │   └── research_service.py
│   │   └── main.py                # FastAPI Application Entrypoint
│   └── requirements.txt
├── frontend/
│   ├── app/                       # Next.js 14 App Router
│   │   ├── (marketing)/           # Public Marketing Website
│   │   │   ├── about/page.tsx
│   │   │   ├── contact/page.tsx
│   │   │   ├── features/page.tsx
│   │   │   ├── pricing/page.tsx
│   │   │   ├── resources/page.tsx
│   │   │   ├── solutions/page.tsx
│   │   │   └── page.tsx           # Premium Homepage
│   │   ├── (auth)/                # Authentication Pages
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── onboarding/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── app/                   # Real SaaS Product Dashboard (/app/*)
│   │   │   ├── abm/page.tsx
│   │   │   ├── accounts/page.tsx
│   │   │   ├── admin/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   ├── copilot/page.tsx
│   │   │   ├── crm/page.tsx
│   │   │   ├── customers/page.tsx
│   │   │   ├── features-lab/page.tsx
│   │   │   ├── leads/page.tsx
│   │   │   ├── outreach/page.tsx
│   │   │   ├── providers/page.tsx
│   │   │   ├── research/page.tsx
│   │   │   ├── revenue/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   ├── whatsapp/page.tsx
│   │   │   ├── layout.tsx         # Dashboard Shell (Sidebar, Topbar, Command K)
│   │   │   └── page.tsx           # Command Center
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/                # Modular UI Components
│   │   └── marketing/
│   │       ├── Header.tsx
│   │       └── Footer.tsx
│   ├── lib/
│   │   ├── api.ts                 # Typed API Client
│   │   ├── auth-context.tsx       # Authentication & Session State Provider
│   │   └── types.ts               # Shared TypeScript Interfaces
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── .github/
│   └── workflows/
│       └── deploy.yml             # Automatic CI/CD Pipeline
├── .env.example                   # Secure Configuration Template
└── README.md                      # Comprehensive Architecture Documentation
```

---

## 3. Local Setup & Quickstart

### Prerequisites
- **Python 3.10+** (64-bit)
- **Node.js 18.x or 20.x LTS** & **npm 10.x+**

### Step-by-Step Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/usman-ai-gtm/Lead-Scraper.git
   cd "d:/LUXURY DASHBOARD"
   ```

2. **Backend Setup:**
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate

   pip install -r backend/requirements.txt
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   ```

---

## 4. Running the Application Locally

### Running the FastAPI Backend
From the project root:
```bash
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Docs: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/api/health`

### Running the Next.js Frontend
In a separate terminal:
```bash
cd frontend
npm run dev
```
- Public Website: `http://localhost:3000`
- SaaS Product App: `http://localhost:3000/app`

---

## 5. Seeded Credentials (Demo / Admin Mode)

For immediate access and testing without manual setup:
- **Email:** `admin@usmanai.com`
- **Password:** `UsmanGTM@2026!`
- **Role:** `ADMIN` (Workspace: `default-enterprise-workspace`)

---

## 6. Database Configuration

The application uses an additive migration layer that preserves all 222 existing business tables in `usman_data_analytics.db` while creating multi-tenant workspace tables:
- `tenants`: Multi-tenant organization records
- `workspaces`: Sub-account isolation
- `users`: PBKDF2 hashed credentials with RBAC
- `user_activity_logs`: Immutable SOC 2 audit events
- `system_notifications`: Real-time telemetry feed

### Switching to PostgreSQL (Production)
In `.env`, update the `DATABASE_URL`:
```ini
DATABASE_URL="postgresql://user:password@pg-cluster.internal:5432/usman_gtm_enterprise"
```

---

## 7. Environment Variables Reference

See `.env.example` for the full parameter template. Key production variables:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `SECRET_KEY` | Hex token for signing JWT sessions | 64-char random hex string |
| `DATABASE_URL` | SQLite or PostgreSQL connection string | `sqlite:///./usman_data_analytics.db` |
| `ENVIRONMENT` | Environment flag (`development` or `production`) | `development` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000,https://usmanai.com` |
| `NEXT_PUBLIC_API_URL`| Frontend target for backend REST requests | `http://localhost:8000/api` |

---

## 8. Official Google OAuth 2.0 (Gmail Outreach)

To enable genuine Gmail campaign delivery and bi-directional inbox synchronization without requesting user passwords:
1. Navigate to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project and configure the **OAuth Consent Screen**.
3. Under **APIs & Services > Credentials**, create an **OAuth 2.0 Client ID** (Web application).
4. Add Authorized Redirect URI:
   `http://localhost:8000/api/email/oauth/callback` (or your production URL).
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your `.env` file.
6. Connect in the application via **/app/accounts**.

---

## 9. Official Meta WhatsApp Business Platform (Cloud API)

USMAN AI GTM strictly avoids unofficial browser scrapers or fragile QR code logins. It interfaces directly with Meta's Official WhatsApp Cloud API:
1. Open the [Meta for Developers Portal](https://developers.facebook.com/).
2. Create an App with the **Business** type and add the **WhatsApp** product.
3. Configure your **WhatsApp Business Account (WABA)** and assign a phone number.
4. Copy your **System User Access Token**, **Phone Number ID**, and **WABA ID** into `.env`:
   ```ini
   WHATSAPP_TOKEN="EAAG..."
   WHATSAPP_PHONE_NUMBER_ID="1092837465"
   WHATSAPP_WABA_ID="9823746152"
   WHATSAPP_VERIFY_TOKEN="usman_gtm_webhook_verification_token_2026"
   ```
5. Configure webhooks in Meta App Dashboard pointing to `https://YOUR-DOMAIN.com/api/whatsapp/webhook`.

---

## 10. Multi-AI Provider Architecture (29+ Engines)

The Multi-AI Center dynamically balances tasks, optimizes latency, and executes automated fallback across configured providers:
- **Primary AI Reasoning:** OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet)
- **High-Speed Inference:** Groq (Llama-3.3-70B), Mistral AI
- **Web Grounding & Citations:** Perplexity AI, Google Gemini 1.5 Pro
- All keys remain safely masked in the frontend UI (`sk-••••••••`).

---

## 11. Search & Lead Discovery Providers

Discover B2B accounts and verified contact data using integrated search engines:
- **Serper.dev API:** `SERPER_API_KEY`
- **SerpApi:** `SERPAPI_API_KEY`
- **Tavily Search API:** `TAVILY_API_KEY`
- Leads are automatically enriched with technology stack detection, executive role classification, and verified email syntaxes.

---

## 12. Automated CI/CD & Deployment Pipeline

Every push to `main` or `master` triggers `.github/workflows/deploy.yml`:
1. **Backend QA:** Runs Pydantic schema validation, endpoint imports, and database checks.
2. **Frontend QA:** Installs dependencies and runs `npm run build` with full TypeScript and styling validation.
3. **Automated Deploy:** Dispatches webhooks to Render/Docker for the backend and Vercel/Cloudflare for the Next.js frontend.

---

## 13. Production Deployment Recommendations

- **Frontend:** [Vercel](https://vercel.com) or [Cloudflare Pages](https://pages.cloudflare.com) (Root directory: `frontend`)
- **Backend:** [Render](https://render.com), [Railway](https://railway.app), or AWS ECS (Root directory: `backend`)
- **Database:** Managed PostgreSQL (AWS RDS, Supabase, Neon) or High-IOPS NVMe SSD volume for SQLite.

---

## 14. Troubleshooting & FAQ

**Q: Can I still run the legacy Streamlit dashboard if needed?**  
A: Yes, legacy files remain available for archival purposes, but the production web application runs completely independently via Next.js + FastAPI.

**Q: Where are newly created leads and deals saved?**  
A: All records are inserted directly into `usman_data_analytics.db` with workspace and tenant scoping.

**Q: Why do external providers show "Configuration Required"?**  
A: If an API key or OAuth credential has not been supplied in `.env`, the system safely disables the live call and displays the configuration wizard instead of failing silently.
