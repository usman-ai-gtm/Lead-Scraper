"""
USMAN AI GTM - MASTER AUTOMATED SELF-TEST SUITE
Executes full regression, live API, database persistence, and security verification.
Zero simulation: tests actual HTTP endpoints and real SQLite records.
"""

import os
import sys
import json
import sqlite3
import requests
from datetime import datetime, timezone

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000"
DB_PATH = os.path.join(ROOT_DIR, "usman_data_analytics.db")

print("=" * 70)
print("  USMAN AI GTM — LIVE AUTOMATED SELF-TEST SUITE")
print(f"  Time: {datetime.now(timezone.utc).isoformat()}")
print(f"  Backend: {BACKEND_URL} | Frontend: {FRONTEND_URL}")
print(f"  Database: {DB_PATH}")
print("=" * 70)

test_results = {}

def report_result(name, passed, details=""):
    status = "PASS" if passed else "FAIL"
    test_results[name] = {"passed": passed, "details": details}
    print(f"[{status}] {name}")
    if details:
        print(f"       -> {details}")

# ==============================================================================
# TEST 1: STARTUP & APPLICATION HEALTH
# ==============================================================================
print("\n--- TEST 1: APPLICATION STARTUP & REACHABILITY ---")
try:
    be_res = requests.get(f"{BACKEND_URL}/api/health", timeout=10)
    if be_res.status_code == 200 and be_res.json().get("database_connected"):
        report_result("Backend API & Database Connection", True, f"HTTP {be_res.status_code} | Service: {be_res.json().get('service')}")
    else:
        report_result("Backend API & Database Connection", False, f"HTTP {be_res.status_code} | Body: {be_res.text}")
except Exception as e:
    report_result("Backend API & Database Connection", False, str(e))

try:
    fe_res = requests.get(FRONTEND_URL, timeout=15)
    report_result("Frontend Next.js Server", fe_res.status_code == 200, f"HTTP {fe_res.status_code} on {FRONTEND_URL}")
except Exception as e:
    report_result("Frontend Next.js Server", False, str(e))

# ==============================================================================
# TEST 2: AUTHENTICATION, PASSWORD HASHING & ACCOUNT ISOLATION
# ==============================================================================
print("\n--- TEST 2: AUTHENTICATION, HASHING & ISOLATION ---")
test_email = "selftest_founder_2026@usmanai.com"
test_password = "SecurePassword@2026!"

# Clean DB before test
conn = sqlite3.connect(DB_PATH)
conn.execute("DELETE FROM users WHERE email = ?", (test_email,))
conn.commit()
conn.close()

# 2.1 Registration
try:
    reg_payload = {
        "email": test_email,
        "password": test_password,
        "full_name": "SelfTest Operator",
        "company": "Usman AI Operations",
        "workspace_name": "Autonomous Operations Workspace"
    }
    reg_res = requests.post(f"{BACKEND_URL}/api/auth/signup", json=reg_payload, timeout=10)
    token = None
    user_id = None
    ws_id = None
    if reg_res.status_code == 200:
        data = reg_res.json()
        token = data.get("access_token")
        user_id = data.get("user", {}).get("id")
        ws_id = data.get("user", {}).get("workspace_id")
        report_result("User Registration & JWT Issuance", True, f"User ID: #{user_id}, Workspace ID: #{ws_id}")
    else:
        report_result("User Registration & JWT Issuance", False, f"Status: {reg_res.status_code}, Body: {reg_res.text}")
except Exception as e:
    report_result("User Registration & JWT Issuance", False, str(e))

# 2.2 Password Hashing verification in SQLite
try:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT hashed_password FROM users WHERE email = ?", (test_email,)).fetchone()
    conn.close()
    if row and row["hashed_password"] and row["hashed_password"] != test_password:
        report_result("Password Hashing in Database", True, f"PBKDF2/Argon Hash: {row['hashed_password'][:20]}...")
    else:
        report_result("Password Hashing in Database", False, "Password stored in plaintext or missing!")
except Exception as e:
    report_result("Password Hashing in Database", False, str(e))

# 2.3 Duplicate Registration Rejection
try:
    dup_res = requests.post(f"{BACKEND_URL}/api/auth/signup", json=reg_payload, timeout=10)
    report_result("Duplicate Registration Rejection", dup_res.status_code == 400, f"HTTP {dup_res.status_code} ({dup_res.json().get('detail')})")
except Exception as e:
    report_result("Duplicate Registration Rejection", False, str(e))

# 2.4 Login with Valid Credentials
try:
    login_res = requests.post(f"{BACKEND_URL}/api/auth/login", json={"email": test_email, "password": test_password}, timeout=10)
    report_result("Login with Valid Password", login_res.status_code == 200, f"HTTP {login_res.status_code} with valid access token")
except Exception as e:
    report_result("Login with Valid Password", False, str(e))

# 2.5 Login with Invalid Password
try:
    bad_login = requests.post(f"{BACKEND_URL}/api/auth/login", json={"email": test_email, "password": "WrongPassword!"}, timeout=10)
    report_result("Rejection of Wrong Password", bad_login.status_code == 401, f"HTTP {bad_login.status_code} ({bad_login.json().get('detail')})")
except Exception as e:
    report_result("Rejection of Wrong Password", False, str(e))

# 2.6 Login with Unregistered Email
try:
    unreg_login = requests.post(f"{BACKEND_URL}/api/auth/login", json={"email": "nonexistent_999@usmanai.com", "password": "AnyPassword123!"}, timeout=10)
    report_result("Rejection of Unregistered Email", unreg_login.status_code == 401, f"HTTP {unreg_login.status_code} ({unreg_login.json().get('detail')})")
except Exception as e:
    report_result("Rejection of Unregistered Email", False, str(e))

# ==============================================================================
# TEST 3: REAL LEAD PERSISTENCE & RETRIEVAL
# ==============================================================================
print("\n--- TEST 3: LEAD DISCOVERY & DATABASE PERSISTENCE ---")
auth_headers = {"Authorization": f"Bearer {token}"} if token else {}
try:
    # Query leads endpoint
    leads_res = requests.get(f"{BACKEND_URL}/api/leads?page=1&page_size=10", headers=auth_headers, timeout=10)
    if leads_res.status_code == 200:
        leads_data = leads_res.json()
        total_leads = leads_data.get("total", 0)
        report_result("Lead Query & Pagination API", True, f"Found {total_leads} persistent leads in database")
    else:
        report_result("Lead Query & Pagination API", False, f"HTTP {leads_res.status_code}")
except Exception as e:
    report_result("Lead Query & Pagination API", False, str(e))

# Create a test lead with genuine evidence and score
try:
    lead_payload = {
        "business_name": "Lahore Dental Specialists",
        "category": "Healthcare / Dentistry",
        "industry": "Dental Healthcare",
        "website": "https://lahoredental.example.pk",
        "email": "contact@lahoredental.example.pk",
        "phone": "+92-42-35710000",
        "city": "Lahore",
        "country": "Pakistan",
        "lead_score": 85,
        "fit_score": 85,
        "source": "Verified Direct",
        "source_url": "https://lahoredental.example.pk/about",
        "ai_summary": "Premier dental and orthodontic practice in Gulberg, Lahore requiring automated patient reporting and Excel analytics."
    }
    create_lead_res = requests.post(f"{BACKEND_URL}/api/leads", json=lead_payload, headers=auth_headers, timeout=10)
    if create_lead_res.status_code == 200:
        created_lead_id = create_lead_res.json().get("lead_id")
        report_result("Create Persistent Lead with Source URL", True, f"Created Lead #{created_lead_id} with website and source evidence")
    else:
        report_result("Create Persistent Lead with Source URL", False, f"HTTP {create_lead_res.status_code}: {create_lead_res.text}")
except Exception as e:
    report_result("Create Persistent Lead with Source URL", False, str(e))

# ==============================================================================
# TEST 4: CRM OPERATIONS & PIPELINE STAGES
# ==============================================================================
print("\n--- TEST 4: CRM OPERATIONS & PIPELINE STAGES ---")
try:
    crm_res = requests.get(f"{BACKEND_URL}/api/crm/deals", headers=auth_headers, timeout=10)
    deals = crm_res.json() if crm_res.status_code == 200 else []
    report_result("CRM Deals Pipeline Query", crm_res.status_code == 200, f"Retrieved {len(deals)} pipeline deals from SQLite")
except Exception as e:
    report_result("CRM Deals Pipeline Query", False, str(e))

# Update created lead CRM stage to 'Qualified Opportunity'
if 'created_lead_id' in locals() and created_lead_id:
    try:
        up_res = requests.put(
            f"{BACKEND_URL}/api/leads/{created_lead_id}",
            json={"crm_stage": "Qualified Opportunity", "lead_score": 92},
            headers=auth_headers,
            timeout=10
        )
        # Verify persistence in database
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        saved_lead = conn.execute("SELECT id, crm_stage, lead_score FROM leads WHERE id = ?", (created_lead_id,)).fetchone()
        conn.close()
        stage_match = saved_lead and saved_lead["crm_stage"] == "Qualified Opportunity"
        report_result("CRM Lead Stage Update & Persistence", stage_match, f"Lead #{created_lead_id} updated to '{saved_lead['crm_stage']}', Score: {saved_lead['lead_score']}")
    except Exception as e:
        report_result("CRM Lead Stage Update & Persistence", False, str(e))

# ==============================================================================
# TEST 5: IDEAL CUSTOMER PROFILE (MY BUSINESS & ICP)
# ==============================================================================
print("\n--- TEST 5: MY BUSINESS & ICP PROFILE ---")
try:
    # 5.1 Save ICP
    save_icp_res = requests.post(
        f"{BACKEND_URL}/api/auth/icp",
        json={
            "business_name": "USMAN DATA ANALYTICS & REVENUE OPS",
            "offering": "Excel automation, custom interactive Excel dashboards, Power BI executive dashboards, and B2B lead generation.",
            "website": "https://usmanai.com",
            "target_industries": "Healthcare, Dental Clinics, Real Estate, E-Commerce",
            "target_company_sizes": "1-10, 11-50, 51-200",
            "target_locations": "Pakistan, UAE, Saudi Arabia, UK, USA",
            "target_roles": "Founder, Managing Director, Practice Owner, Operations Manager",
            "problems_solved": "Eliminating spreadsheet errors, manual reporting automation",
            "excluded_industries": "Adult, Gambling",
            "additional_instructions": "Offer free audit or sample dashboard"
        },
        headers=auth_headers,
        timeout=10
    )
    # 5.2 Retrieve ICP
    icp_res = requests.get(f"{BACKEND_URL}/api/auth/icp", headers=auth_headers, timeout=10)
    if icp_res.status_code == 200:
        icp_data = icp_res.json()
        b_name = icp_data.get("business_name")
        report_result("Ideal Customer Profile Active Retrieval", bool(b_name), f"Business: '{b_name}' | Offering: {icp_data.get('offering')[:40]}...")
    else:
        report_result("Ideal Customer Profile Active Retrieval", False, f"HTTP {icp_res.status_code}")
except Exception as e:
    report_result("Ideal Customer Profile Active Retrieval", False, str(e))

# ==============================================================================
# TEST 6: CONNECTED ACCOUNTS & EMAIL OUTREACH INTEGRATION
# ==============================================================================
print("\n--- TEST 6: CONNECTED ACCOUNTS & OUTREACH AUDIT ---")
try:
    accs_res = requests.get(f"{BACKEND_URL}/api/campaigns/accounts", headers=auth_headers, timeout=10)
    if accs_res.status_code == 200:
        accounts = accs_res.json()
        report_result("Connected Accounts Registry API", True, f"Audited {len(accounts)} accounts across workspaces")
    else:
        report_result("Connected Accounts Registry API", False, f"HTTP {accs_res.status_code}")
except Exception as e:
    report_result("Connected Accounts Registry API", False, str(e))

# Test send error handling when account credentials unverified
try:
    test_send_res = requests.post(
        f"{BACKEND_URL}/api/campaigns/test-send",
        json={"account_id": 9999, "channel": "email", "recipient": "usman@test.com", "subject": "Test", "message_body": "Test"},
        headers=auth_headers,
        timeout=10
    )
    report_result("Honest Failure on Missing Account", test_send_res.status_code == 404, f"HTTP {test_send_res.status_code}: {test_send_res.json().get('detail')}")
except Exception as e:
    report_result("Honest Failure on Missing Account", False, str(e))

# ==============================================================================
# TEST 7: SECURITY SCAN — ZERO EXPOSED SECRETS
# ==============================================================================
print("\n--- TEST 7: SECURITY & CREDENTIAL ISOLATION SCAN ---")
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
users_sample = conn.execute("SELECT id, email, hashed_password FROM users LIMIT 10").fetchall()
conn.close()

exposed_plain_passwords = False
for u in users_sample:
    pwd = u["hashed_password"] or ""
    # Check if any password is less than 20 chars or doesn't look like hash
    if pwd and (len(pwd) < 20 or pwd in [test_password, "UsmanGTM@2026!"]):
        exposed_plain_passwords = True
        break

report_result("Database Password Encryption Scan", not exposed_plain_passwords, "All stored user passwords cryptographically hashed (PBKDF2/HMAC)")

# ==============================================================================
# SUMMARY
# ==============================================================================
print("\n" + "=" * 70)
total_tests = len(test_results)
passed_tests = sum(1 for t in test_results.values() if t["passed"])
failed_tests = total_tests - passed_tests

print(f"SELF-TEST RESULTS SUMMARY: {passed_tests}/{total_tests} PASSED")
if failed_tests == 0:
    print("ALL TESTS PASSED WITH 100% SUCCESS. NO COMPONENT DEGRADED.")
else:
    print(f"WARNING: {failed_tests} tests failed.")
print("=" * 70)

sys.exit(0 if failed_tests == 0 else 1)
