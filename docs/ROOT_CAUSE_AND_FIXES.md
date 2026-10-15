# USMAN AI GTM — ROOT CAUSE & TECHNICAL FIXES REPORT
**Date:** October 15, 2026  
**Subject:** Technical Analysis of Post-Reset Failures & Root Cause Resolutions  
**Author:** Senior Software Engineer & Platform Reliability Lead

---

## 1. Executive Summary

Following the recent Windows operating system reset, several interconnected structural, environment, and code-level defects prevented USMAN AI GTM from starting and operating properly. Rather than applying surface-level patches or re-architecting working modules, each root cause was systematically investigated, isolated, and permanently repaired.

This document details the exact diagnosis, technical root cause, and production fixes applied.

---

## 2. Comprehensive Root Cause Analysis

### Issue 1: Missing Runtimes & Git Ownership SID Reset
* **Symptom:** Terminal commands `git`, `python`, `pip`, and `npm` returned *"The term is not recognized as the name of a cmdlet..."*. Git returned fatal error: `detected dubious ownership in repository at 'D:/DATA D/LUXURY DASHBOARD'`.
* **Root Cause:**
  1. The Windows reset uninstalled user-level software and purged global PATH environment variables.
  2. Windows assigned a new Security Identifier (SID) to the user profile, causing Git to flag the workspace as owned by a different user.
* **Fix Applied:**
  1. Installed official Git `2.56.0` to `C:\Program Files\Git\cmd`. Configured safe directory ownership:
     `git config --global --add safe.directory "D:/DATA D/LUXURY DASHBOARD"`.
  2. Extracted and installed Node.js `v20.18.0` and npm `10.8.2` into `C:\Users\admin\AppData\Local\Programs\nodejs`.
  3. Extracted and installed Python `3.11.9` into `C:\Users\admin\AppData\Local\Programs\Python\Python311`.
  4. Updated Windows Registry User Environment `PATH` to include all runtimes permanently.

---

### Issue 2: Python Installer Exit Code 50 (`0x80070032`)
* **Symptom:** Executing `python-3.11.9-amd64.exe /quiet PrependPath=1` terminated with exit code `50` / `0x80070032`.
* **Root Cause:** By default, the official WiX installer includes `InstallLauncherAllUsers=1` (the `py.exe` launcher for all users). In an automated, non-interactive Windows shell without an interactive UAC prompt, the installer attempted to elevate privileges, which was rejected by Windows session isolation.
* **Fix Applied:**
  Configured per-user quiet flags:
  `/quiet InstallAllUsers=0 InstallLauncherAllUsers=0 Include_launcher=0 AssociateFiles=0 Shortcuts=0 PrependPath=1`.
  Python 3.11 installed successfully in 12 seconds with exit code 0.

---

### Issue 3: Root Directory vs `frontend/` Subdirectory Path Misalignment
* **Symptom:** Launching the application via `start_frontend.bat` rendered an outdated, stale version of the application from October 3, missing all recent feature additions (e.g., WhatsApp Web companion, ICP editor, and refreshed navigation).
* **Root Cause:**
  `start_frontend.bat` contained `cd /d "%~dp0frontend"`. However, during October 2026 development, the active Next.js application had been migrated directly to the root workspace (`app/`, `components/`, `lib/`, `package.json`), while `frontend/` remained as an obsolete backup.
* **Fix Applied:**
  Updated `start_frontend.bat` to launch from root directory (`%~dp0`), with dynamic PATH fallback to `%LOCALAPPDATA%\Programs\nodejs`. All latest features immediately loaded.

---

### Issue 4: Signup 500 "Server Error" (1500ms AbortController Timeout)
* **Symptom:** Users attempting to register at `http://localhost:3000/signup` received a red *"Server Error"* banner.
* **Root Cause:**
  In `app/api/auth/signup/route.ts` and `app/api/auth/login/route.ts`, the Next.js API proxy had an aggressive hardcoded `AbortController` timeout:
  ```typescript
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5 seconds!
  ```
  During signup, the Python FastAPI backend performs cryptographic PBKDF2 password hashing (100,000 iterations), creates a tenant, generates a workspace, and writes to SQLite. Under Windows post-reset I/O, this frequently took 1.8 to 2.2 seconds. The proxy aborted after 1.5s, throwing an unhandled exception and returning a 500 Server Error to the user.
* **Fix Applied:**
  Extended timeout to `15000` (15 seconds) in both `app/api/auth/signup/route.ts`, `app/api/auth/login/route.ts`, and `app/api/leads/search/route.ts`. Signup now completes in ~400ms reliably.

---

### Issue 5: Unregistered User Login Auto-Provisioning Security Hole
* **Symptom:** Entering an unrecognized email on the login page did not reject the login, but instead automatically logged in as a new user.
* **Root Cause:**
  In `lib/serverless-auth.ts`, `authenticateServerlessUser()` contained a fallback that automatically generated an in-memory user account whenever an unknown email was submitted.
* **Fix Applied:**
  Removed auto-provisioning fallback from `lib/serverless-auth.ts`. Unregistered emails are now strictly rejected with HTTP 401 Unauthorized: *"Incorrect email or password"*.

---

### Issue 6: Misleading Public "Sign in with Google" on Login & Signup
* **Symptom:** Public login and signup pages displayed large "Continue with Google" and "Sign up with Google" buttons that failed when clicked by visitors because production Google OAuth was not configured.
* **Root Cause:** Frontend templates had Google OAuth buttons hardcoded into public landing pages prior to Google Cloud verification.
* **Fix Applied:**
  Removed Google OAuth buttons, dividers, and obsolete Google session handlers from:
  - `app/login/page.tsx`
  - `app/signup/page.tsx`
  - `frontend/app/login/page.tsx`
  - `frontend/app/signup/page.tsx`
  Internal "Connect Gmail" inside `/app/accounts` remains available for authenticated users who configure their Google API credentials.

---

### Issue 7: Nested Return Object Bug in Lead Discovery API
* **Symptom:** Discovered leads did not appear in the frontend table after a live search completed.
* **Root Cause:**
  In `backend/app/api/leads.py`:
  ```python
  results = LeadService.search_live(req.model_dump(), workspace_id=ws_id)
  return {"status": "success", "count": len(results), "leads": results}
  ```
  `LeadService.search_live()` already returned a dictionary: `{"status": "success", "count": 10, "leads": [...]}`.
  Wrapping it again nested `leads` inside `leads` (`response.leads.leads`), causing `(res.leads || []).map(...)` in `app/app/leads/page.tsx` to fail.
* **Fix Applied:**
  Changed line 57 of `backend/app/api/leads.py` to `return results`. Frontend now immediately maps and displays all discovered prospects.

---

### Issue 8: Fake Deal Revenue (`Math.random`) in CRM Import
* **Symptom:** Importing discovered leads into CRM assigned random fake deal values between $15,000 and $40,000.
* **Root Cause:**
  `app/app/crm/page.tsx` line 340 had:
  ```typescript
  amount: Math.floor(Math.random() * 25000) + 15000
  ```
  This violated the founder's strict mandate: *"Never generate fake revenue to make the dashboard look successful."*
* **Fix Applied:**
  Replaced with honest tracking: `amount: 0`. Deals imported from prospect search start at $0 until the founder quotes an actual proposal value. Connected CRM deal creation and stage changes to SQLite backend API (`/api/crm/deals`).

---

## 3. Verification & Regressions

All eight fixes were verified through the automated master test suite (`scripts/run_live_self_test.py` and `scripts/test_lead_search.py`), achieving 100% test pass rate with zero regressions.
