# USMAN AI GTM — FINAL FEATURES REPORT
**Date:** November 13, 2026  
**Platform:** Next.js 14 App Router + Vercel Serverless / Python 3.11 FastAPI  
**Production URL:** `https://lead-scraper-mxs5.vercel.app/`  
**GitHub Repository:** `https://github.com/usman-ai-gtm/Lead-Scraper` (`main` branch)  
**Status:** **SIMPLIFIED, CLEANED, PERSISTENT & FULLY OPERATIONAL**

---

## 1. Executive Summary

In accordance with explicit authorization, the USMAN AI GTM platform has undergone a comprehensive architectural simplification. All nonfunctional, simulated, and synthetic features (including fake ARR metrics, fake AI agents, and dead workflow builders) have been decommissioned. The product has been refactored into a high-performance, professional **B2B Lead Extraction SaaS** that provides real, verified public commercial intelligence across 193 countries.

---

## 2. Core Retained & Upgraded Features

### A. Business Discovery & Multi-Platform Search (`/app/leads`)
- **Country Filter:** Complete 193-country selection with ISO 3166 compliance.
- **State / Province Filter:** Granular state/province filtering where available.
- **City Filter:** City input with 1-click metropolitan suggestions for major global hubs.
- **Industry Selection (14 Real B2B Sectors):**
  1. Real Estate & Property Development
  2. Healthcare, Clinics & Medical Practices
  3. Technology, Software & IT Services
  4. Hospitality, Hotels & Tourism
  5. Professional Services & Consulting
  6. Legal Services & Law Firms
  7. Financial & Wealth Management
  8. Construction, Architecture & Engineering
  9. Logistics, Freight & Supply Chain
  10. E-Commerce, Retail & Wholesale
  11. Manufacturing & Industrial
  12. Automotive & Transport
  13. Marketing, Advertising & Media
  14. Education & Corporate Training
- **Custom Keywords:** Free-text targeted niche search (e.g. "Commercial Roofing", "Orthodontist Clinics").
- **Discovery Sources:**
  - Google Maps & Google Places API (Local businesses with physical address, ratings, phone)
  - Google Search & SERP Web Extraction (Company websites, contact pages)
  - LinkedIn Business Directory (Commercial corporate entities)
  - Business Directories (YellowPages, Yelp, Industry registries)

### B. Real Lead Extraction (Zero Synthetic Data)
Every extracted lead collects only genuinely available public information:
1. **Business Name:** Verified registered or trading entity name.
2. **Industry & Category:** Standardized B2B sector classification.
3. **Location:** Complete street address, city, state/province, and country.
4. **Website:** Clean domain with protocol verification.
5. **Public Business Email:** Scraped from official contact pages with verification status pills:
   - `VERIFIED`: Source-matched and deliverable.
   - `UNVERIFIED`: Extracted from public directory without SMTP check.
   - `NOT FOUND`: Honestly displayed as missing (no synthetic fake emails).
6. **Public Business Phone:** Normalized international format with country code detection.
7. **WhatsApp Click-to-Chat:** Official `https://wa.me/<number>` link generated only for valid mobile phone numbers.
8. **Public Social Profiles:** Detected URLs for LinkedIn, Instagram, Facebook, and Twitter/X.
9. **Original Source & Evidence URL:** Direct link to where the business listing was identified.
10. **Timestamp:** ISO 8601 extraction timestamp.

### C. Workspace Lead Vault (`/app/saved-leads`)
- **Private Database Storage:** Save selected search results directly to caller's isolated workspace.
- **Search & Filtering:** Instant client-side and server-side filtering by business name, city, industry, or contact availability.
- **Single & Bulk Management:** 1-click single deletion or bulk selection deletion with confirmation.
- **Export from Vault:** Immediate CSV and XLSX export of saved leads.

### D. Export Center (`/app/exports`)
- **Native Microsoft Excel (.xlsx):** Generates genuine binary OpenXML spreadsheets formatted with headers and typed cells using the verified `xlsx` engine.
- **Comma-Separated Values (CSV):** Generates RFC 4180 CSV files encoded with UTF-8 BOM so Microsoft Excel, Numbers, and Google Sheets open foreign characters (Urdu, Arabic, accents) cleanly without mangling.
- **Targeted Export Filtering:** Download leads filtered by specific country or industry.
- **Direct Workspace Export:** One-click download of all leads in caller's workspace.

### E. 50-Client Account Provisioning & Auth System
- **Invitation-Only Access:** Public self-signup (`/api/auth/signup`) is blocked with HTTP 403 Forbidden.
- **50-Seat Quota:** Administrator panel provisions accounts up to 50 active client seats initially.
- **Isolated 0-Lead Workspaces:** Each newly provisioned client receives a dedicated workspace with 0 leads.
- **Single-Use Temporary Credentials:** 16-character cryptographically secure temporary passwords displayed to admin once.
- **Forced Password Rotation:** Enforces mandatory password change on first client login via `must_change_password=true`.
- **PBKDF2-SHA256 Encryption:** Unique 16-byte random salt per user with 100,000 hash iterations.

### F. Administrator Governance (`/app/admin`)
- **Client Accounts (`/app/admin/clients`):** Provision clients, toggle status (`ACTIVE`, `SUSPENDED`, `REVOKED`), reset credentials.
- **API Configuration (`/app/admin/providers`):** Real-time health testing, latency checks, and rate limits for Serper, Firecrawl, and OpenAI.
- **System Health (`/app/admin/system`):** Database footprint metrics, cryptographic posture, and immutable audit logs.

---

## 3. Simplified User Navigation

### Client Navigation (5 Clean Items)
1. **Dashboard** (`/app`) — Overview metrics, quick search launcher, recently saved leads.
2. **Lead Search** (`/app/leads`) — Multi-platform business discovery with country and industry selectors.
3. **Saved Leads** (`/app/saved-leads`) — Private workspace lead repository with bulk delete.
4. **Exports** (`/app/exports`) — Download CSV and XLSX spreadsheets with full source URLs.
5. **Account Settings** (`/app/settings`) — Profile settings and password management.

### Administrator Navigation (4 Governance Items)
1. **Admin Dashboard** (`/app/admin`) — Overview of platform users, database size, and system health.
2. **Client Accounts** (`/app/admin/clients`) — 50-client provisioning and seat management.
3. **API Configuration** (`/app/admin/providers`) — External search API status and latency tests.
4. **System Health** (`/app/admin/system`) — System telemetry, uptime, and immutable security audit logs.

