# USMAN AI GTM — EXTERNAL CONFIGURATION GUIDE
**Date:** October 15, 2026  
**Purpose:** Honest, Step-by-Step Instructions for Connecting Real Third-Party Providers  
**Principle:** **Never simulate or pretend external integrations are connected.** If keys are not present, features remain clearly labeled as `CONFIGURATION REQUIRED`.

---

## 1. Overview of External Integrations

| Integration | Required For | Cost / Plan | Status Without Key |
| :--- | :--- | :--- | :--- |
| **Serper API** | Google Search Lead Discovery | **Free** (2,500 searches free at Serper.dev) | Fallback active key; user can supply custom key |
| **Google Cloud OAuth** | Official Gmail Outreach Sending | **Free** (Google Cloud Standard tier) | Manual email draft review; `CONFIGURATION REQUIRED` |
| **Google AI Studio (Gemini)** | Deep AI Pitch & Lead Personalization | **Free** (Free tier available at aistudio.google.com) | Deterministic template synthesis active |
| **WhatsApp Web Companion** | WhatsApp outreach via Click to Chat | **Free** (No API key needed!) | **Fully Functional Out-of-the-Box** |
| **SMTP / App Passwords** | Alternative outbound email sending | **Free** (Zoho, Gmail App Password, Brevo) | `CONFIGURATION REQUIRED` until credentials provided |

---

## 2. Google Gmail OAuth 2.0 Setup (Step-by-Step)

To enable sending emails directly from your personal or business Gmail address via the official Gmail API:

### Step 1: Create a Project in Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top and click **New Project**.
3. Name it `USMAN AI GTM Outreach` and click **Create**.

### Step 2: Enable the Gmail API
1. In the search bar at the top, type `Gmail API`.
2. Click **Gmail API** under Marketplace/APIs.
3. Click the blue **Enable** button.

### Step 3: Configure the OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select **External** and click **Create**.
3. Fill in:
   - **App name:** `USMAN AI GTM`
   - **User support email:** Your Gmail address
   - **Developer contact information:** Your Gmail address
4. Click **Save and Continue**.
5. Under **Scopes**, click **Add or Remove Scopes**, and select:
   - `.../auth/gmail.send` (Send email on your behalf)
   - `.../auth/userinfo.email` (View your email address)
   - `.../auth/userinfo.profile` (View your basic profile)
6. Click **Save and Continue**.
7. Under **Test users**, click **+ Add Users** and enter your personal Gmail address.
8. Click **Save and Continue**.

### Step 4: Create OAuth 2.0 Client ID Credentials
1. Go to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** > **OAuth client ID**.
3. Set **Application type:** `Web application`.
4. Set **Name:** `USMAN AI GTM Local Client`.
5. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/auth/google/callback`
   - `http://127.0.0.1:8000/api/auth/google/callback`
6. Click **Create**.
7. A dialog will show your **Client ID** and **Client Secret**.

### Step 5: Add Credentials to `.env`
Open your `.env` file in `D:\DATA D\LUXURY DASHBOARD\.env` and paste:
```env
GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```
Restart backend. You can now click **"Connect Gmail"** inside `/app/accounts` to authorize your account.

---

## 3. Custom Google Lead Search (Serper API)

The application currently has a working default Serper API key for lead discovery. If you wish to use your own private key:

1. Register at [serper.dev](https://serper.dev) (Sign up takes 30 seconds; grants 2,500 free queries).
2. Copy your API Key from the dashboard.
3. Open `D:\DATA D\LUXURY DASHBOARD\.env`:
   ```env
   SERPER_API_KEY=your_private_serper_key_here
   ```
4. Save the file. All lead searches will now draw from your private quota.

---

## 4. Google Gemini AI Key (Deep Outreach Personalization)

To enable Gemini 1.5 Flash for writing deeply tailored pitches:

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** > **Create API key in new project**.
4. Copy your key and add it to `D:\DATA D\LUXURY DASHBOARD\.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

---

## 5. WhatsApp Web Companion (Zero API Cost)

**Important Notice:** You do **NOT** need to pay for Meta WhatsApp Cloud API credentials or submit business verification documents to start doing WhatsApp outreach.

The platform includes a built-in **WhatsApp Web Manual Companion** (`/app/whatsapp`):
- Uses standard WhatsApp Web Click-to-Chat URLs (`https://web.whatsapp.com/send?phone=...&text=...`).
- Pre-fills verified leads' phone numbers and personalized messages.
- Opens your browser to WhatsApp Web so you can review and click Send yourself.
- 100% compliant with WhatsApp terms. Zero risk of automated number bans.

---

## 6. How to Verify External Integrations

Whenever you add or change credentials in `.env`, run:
```powershell
python scripts/run_live_self_test.py
```
This tests your configuration against actual endpoints and informs you if any credentials need adjustment.
