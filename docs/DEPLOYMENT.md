# USMAN AI GTM — Production Deployment & Operations Guide

This guide describes how to run, deploy, and maintain USMAN AI GTM in development and production environments without dependency on local Streamlit servers.

---

## 1. Local Development
1. **Clone repository:**
   ```bash
   git clone https://github.com/usman-ai-gtm/Lead-Scraper.git
   cd "d:/LUXURY DASHBOARD"
   ```
2. **Start Backend (FastAPI):**
   ```powershell
   python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *(Or double-click `start_backend.bat`)*
3. **Start Frontend (Next.js):**
   ```powershell
   cd frontend
   npm run dev
   ```
   *(Or double-click `start_frontend.bat`)*

---

## 2. Environment Variables Configuration
Copy `.env.example` to `.env`:
```ini
ENVIRONMENT="production"
SECRET_KEY="generate_random_64_character_hex_string"
DATABASE_URL="postgresql://user:password@host:5432/usman_gtm"
NEXT_PUBLIC_API_URL="https://api.yourdomain.com/api"
```

---

## 3. Database Production Migration (PostgreSQL)
The application uses additive migrations:
```bash
python -c "from backend.app.core.database import init_app_database; init_app_database()"
```
This preserves all 222 tables and adds multi-tenant workspace tables.

---

## 4. Google Gmail OAuth 2.0 Setup
1. Create project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable Gmail API.
3. Configure OAuth Consent Screen (Internal or External).
4. Add Authorized Redirect URI:
   `https://api.yourdomain.com/api/email/oauth/callback`
5. Populate `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in environment variables.

---

## 5. Meta WhatsApp Cloud API Setup
1. Open [Meta for Developers](https://developers.facebook.com/).
2. Configure WhatsApp Business App.
3. Set Webhook URL:
   `https://api.yourdomain.com/api/whatsapp/webhook`
4. Set Webhook Token: `usman_gtm_webhook_verification_token_2026`
5. Populate `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and `WHATSAPP_WABA_ID`.

---

## 6. Multi-Device Production Access (Office & Home)
- **Architecture:** The production web app is deployed on a cloud host (Vercel / Render / Docker).
- **Access:** Users simply navigate to `https://yourdomain.com/app` from any browser (Mac, Windows, iPhone, Android).
- **No local machine requirement:** The office computer does not need to stay on.

---

## 7. Automated CI/CD & Updates
When changes are committed and pushed to `main`:
1. GitHub Actions runs `.github/workflows/deploy.yml`.
2. Backend tests are verified.
3. Next.js production build (`npm run build`) is compiled.
4. Automatic deploy webhook triggers production updates.

---

## 8. Rollback Procedure
If a regression occurs:
```bash
git checkout <previous_commit_hash>
git push origin main --force
```
GitHub Actions will automatically redeploy the previous stable build.
