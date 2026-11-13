# USMAN AI GTM — PROJECT HANDOFF & OPERATIONAL GUIDE
**Date:** November 13, 2026  
**Project:** USMAN AI GTM / Lead Scraper SaaS  
**Production URL:** `https://lead-scraper-mxs5.vercel.app/`  
**Target Repository:** `https://github.com/usman-ai-gtm/Lead-Scraper`  
**Current Branch:** `main`

---

## 1. System Overview

USMAN AI GTM is an enterprise B2B Lead Extraction platform designed to allow administrators to sell high-quality, genuine commercial prospecting data across 193 countries to clients in 14 major industries.

The application operates as a unified, dual-tier platform:
1. **Next.js 14 (App Router) on Vercel:** Provides the responsive luxury web UI, serverless API routes, PBKDF2 authentication, and native OpenXML XLSX/CSV export engines.
2. **FastAPI (Python 3.11):** Provides the backend intelligence, database persistence, and external scraping integrations.

---

## 2. Administrator Guide

### A. Logging In as Administrator
1. Navigate to: `https://lead-scraper-mxs5.vercel.app/login`
2. Enter your administrator credentials:
   - **Email:** `admin@usmanai.com` (or `admin@usmangtm.com` / `mu0602503@gmail.com`)
   - **Password:** `UsmanGTM@2026!`
3. Click **Sign In**.
4. You will be taken directly to the **Admin Dashboard** (`/app/admin`).

### B. Provisioning a New Client Seat (Up to 50 Seats)
1. Go to **Client Accounts** (`/app/admin/clients` or click "Client Accounts" in the sidebar).
2. Under **Provision New Client Seat**, fill in:
   - **Client Full Name:** e.g. "Ahmed Khan"
   - **Client Company / Workspace Name:** e.g. "Khan Global Real Estate"
   - **Login Email ID:** e.g. "ahmed@khanglobal.com"
3. Click **Provision Client Seat**.
4. **Important:** The system will generate a secure, 16-character temporary password (e.g. `kX82-mP91-vB73-wQ19`) and display it in an amber banner **ONCE**.
5. Copy this temporary password and send it securely to your client along with the login URL `https://lead-scraper-mxs5.vercel.app/login`.

### C. Managing Client Status
In the **Active Client Seats** table, you can:
- View current lead count and workspace quota for each client.
- Change client status (`ACTIVE`, `SUSPENDED`, `REVOKED`).
- Issue a password reset to generate a fresh temporary password.

---

## 3. Client Onboarding Guide

### A. First-Time Login
1. Client visits `https://lead-scraper-mxs5.vercel.app/login`.
2. Client logs in with their assigned email and temporary password.
3. Because `must_change_password` is set to `true`, the system immediately displays the **Mandatory Password Change Modal**.
4. The client enters their temporary password and chooses a new permanent password.
5. The password is encrypted with a unique per-user 16-byte salt using PBKDF2-SHA256 (100,000 rounds).
6. The client is redirected to their private, empty workspace (0 initial leads).

### B. Searching for Leads (`/app/leads`)
1. Click **Lead Search** in the sidebar.
2. Select target **Country** (193 countries available) and enter **City / State** (e.g. "Dubai" or "Miami").
3. Select an **Industry** (e.g. "Healthcare & Medical Clinics" or "Real Estate").
4. Enter target keywords (e.g. "Dentists", "Commercial Property").
5. Choose discovery platforms (Google Maps, Google Search, LinkedIn, Directories).
6. Click **Find Leads**.
7. Real-time extraction runs via official APIs and public web scrapers. Results display business names, verified addresses, public emails, phones, and social URLs.

### C. Saving & Managing Leads (`/app/saved-leads`)
1. In the search results table, check the boxes next to desired businesses.
2. Click **Save to Workspace**.
3. Saved leads are stored in the client's private workspace database.
4. Clients can visit **Saved Leads** (`/app/saved-leads`) at any time to review, filter, or delete records.

### D. Exporting Leads (`/app/exports`)
1. Click **Exports** in the sidebar.
2. Choose **Download CSV** (RFC 4180 with UTF-8 BOM) or **Download XLSX** (genuine Microsoft Excel OpenXML).
3. All fields including business name, address, verified contacts, and original source URLs are preserved.

---

## 4. Maintenance & Safety Backups

All pre-simplification databases and files are safely preserved in:
- `backups/pre_simplification_backup/usman_data_analytics.db.bak`
- `backups/pre_simplification_backup/usman_luxury_engine.db.bak`
- `backups/pre_simplification_backup/frontend_backup/` (115 files)
- `backups/pre_simplification_backup/removed_routes/`

If you ever need to restore any archived component, copy the desired folder from `backups/pre_simplification_backup/`.
