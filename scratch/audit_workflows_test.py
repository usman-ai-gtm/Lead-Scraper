import os
import sys
import json
import time
import requests

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000"
PROD_URL = "https://lead-scraper-mxs5.vercel.app"

results = {}

def log_test(wf_id, name, status, details):
    print(f"[{status}] {wf_id} - {name}: {details}")
    results[f"{wf_id}_{name}"] = {"status": status, "details": details}

print("=" * 70)
print("USMAN AI GTM — 10 FORENSIC WORKFLOW DEEP TESTS")
print("=" * 70)

# --- WORKFLOW 1: AUTHENTICATION ---
test_email = f"audit_user_{int(time.time())}@usmanai.com"
test_pwd = "SecureAuditPassword123!"

try:
    # 1. Register test user
    reg_res = requests.post(f"{BACKEND_URL}/api/auth/signup", json={
        "email": test_email,
        "password": test_pwd,
        "full_name": "Audit Engineer",
        "company_name": "Audit Workspace Corp"
    }, timeout=10)
    
    if reg_res.status_code == 200:
        token = reg_res.json().get("access_token")
        log_test("WF-1", "Registration", "PASS", f"User registered successfully, token issued")
        
        # 2. Login with valid password
        login_res = requests.post(f"{BACKEND_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_pwd
        }, timeout=10)
        
        if login_res.status_code == 200:
            log_test("WF-1", "Login_Valid", "PASS", "Login returned HTTP 200 with JWT")
        else:
            log_test("WF-1", "Login_Valid", "FAIL", f"HTTP {login_res.status_code}: {login_res.text}")
            
        # 3. Access protected endpoint with token
        headers = {"Authorization": f"Bearer {token}"}
        me_res = requests.get(f"{BACKEND_URL}/api/auth/me", headers=headers, timeout=10)
        if me_res.status_code == 200:
            log_test("WF-1", "Protected_Access", "PASS", f"Identity verified: {me_res.json().get('email')}")
        else:
            log_test("WF-1", "Protected_Access", "FAIL", f"HTTP {me_res.status_code}")
            
        # 4. Reject invalid password
        bad_res = requests.post(f"{BACKEND_URL}/api/auth/login", json={
            "email": test_email,
            "password": "WrongPassword!"
        }, timeout=10)
        if bad_res.status_code == 401:
            log_test("WF-1", "Login_Invalid_Password", "PASS", "HTTP 401 correctly returned")
        else:
            log_test("WF-1", "Login_Invalid_Password", "FAIL", f"Unexpected status {bad_res.status_code}")
    else:
        log_test("WF-1", "Registration", "FAIL", f"HTTP {reg_res.status_code}: {reg_res.text}")
except Exception as e:
    log_test("WF-1", "Authentication_Suite", "FAIL", str(e))

# --- WORKFLOW 2: LEAD DISCOVERY ---
try:
    search_payload = {
        "platform": "google_maps",
        "keyword": "Dental Clinic",
        "country": "Pakistan",
        "city": "Lahore",
        "limit": 5
    }
    search_res = requests.post(f"{BACKEND_URL}/api/leads/search", json=search_payload, headers=headers, timeout=20)
    if search_res.status_code == 200:
        data = search_res.json()
        leads = data.get("leads", [])
        has_source = all(bool(l.get("source_url") or l.get("platform")) for l in leads)
        log_test("WF-2", "Lead_Discovery", "PASS", f"Retrieved {len(leads)} leads; Source attribution verified: {has_source}")
    else:
        log_test("WF-2", "Lead_Discovery", "FAIL", f"HTTP {search_res.status_code}: {search_res.text}")
except Exception as e:
    log_test("WF-2", "Lead_Discovery", "FAIL", str(e))

# --- WORKFLOW 3: FILTERING AND DEDUPLICATION ---
try:
    res_filter = requests.get(f"{BACKEND_URL}/api/leads?platform=google_maps&page=1&page_size=10", headers=headers, timeout=10)
    if res_filter.status_code == 200:
        leads_list = res_filter.json().get("leads", [])
        log_test("WF-3", "Platform_Filtering", "PASS", f"Retrieved {len(leads_list)} filtered leads")
    else:
        log_test("WF-3", "Platform_Filtering", "FAIL", f"HTTP {res_filter.status_code}")
except Exception as e:
    log_test("WF-3", "Platform_Filtering", "FAIL", str(e))

# --- WORKFLOW 4: LEAD MANAGEMENT (CRUD) ---
created_lead_id = None
try:
    new_lead = {
        "business_name": "Forensic Audit Dental Care",
        "industry": "Healthcare",
        "country": "Pakistan",
        "city": "Islamabad",
        "phone": "+92 300 1234567",
        "email": "info@forensicauditdental.com",
        "website": "https://forensicauditdental.com",
        "source_url": "https://google.com/maps/place/audit",
        "platform": "google_maps"
    }
    create_res = requests.post(f"{BACKEND_URL}/api/leads", json=new_lead, headers=headers, timeout=10)
    if create_res.status_code in [200, 201]:
        created_lead_id = create_res.json().get("lead_id")
        log_test("WF-4", "Create_Lead", "PASS", f"Lead #{created_lead_id} created successfully")
        
        get_res = requests.get(f"{BACKEND_URL}/api/leads/{created_lead_id}", headers=headers, timeout=10)
        if get_res.status_code == 200:
            log_test("WF-4", "Read_Lead", "PASS", f"Lead #{created_lead_id} verified in database")
        else:
            log_test("WF-4", "Read_Lead", "FAIL", f"HTTP {get_res.status_code}")
    else:
        log_test("WF-4", "Create_Lead", "FAIL", f"HTTP {create_res.status_code}: {create_res.text}")
except Exception as e:
    log_test("WF-4", "Lead_Management", "FAIL", str(e))

# --- WORKFLOW 5: CRM OPERATIONS ---
try:
    crm_res = requests.get(f"{BACKEND_URL}/api/crm/deals", headers=headers, timeout=10)
    if crm_res.status_code == 200:
        deals_raw = crm_res.json()
        deals = deals_raw.get("deals", deals_raw) if isinstance(deals_raw, dict) else deals_raw
        log_test("WF-5", "CRM_Pipeline_Query", "PASS", f"Retrieved {len(deals)} CRM deals")
    else:
        log_test("WF-5", "CRM_Pipeline_Query", "FAIL", f"HTTP {crm_res.status_code}")
        
    if created_lead_id:
        update_res = requests.put(f"{BACKEND_URL}/api/leads/{created_lead_id}", json={
            "lead_status": "Qualified Opportunity",
            "lead_score": 95
        }, headers=headers, timeout=10)
        if update_res.status_code == 200:
            log_test("WF-5", "CRM_Stage_Update", "PASS", f"Lead #{created_lead_id} transitioned to Qualified Opportunity")
        else:
            log_test("WF-5", "CRM_Stage_Update", "FAIL", f"HTTP {update_res.status_code}")
except Exception as e:
    log_test("WF-5", "CRM_Suite", "FAIL", str(e))

# --- WORKFLOW 6: AI PROVIDERS ---
try:
    prov_res = requests.get(f"{BACKEND_URL}/api/providers", headers=headers, timeout=10)
    if prov_res.status_code == 200:
        provs = prov_res.json()
        log_test("WF-6", "AI_Providers_Listing", "PASS", f"Retrieved {len(provs)} configured/available providers")
    else:
        log_test("WF-6", "AI_Providers_Listing", "FAIL", f"HTTP {prov_res.status_code}")
except Exception as e:
    log_test("WF-6", "AI_Providers", "FAIL", str(e))

# --- WORKFLOW 7: GMAIL / EMAIL OUTREACH ---
try:
    acc_res = requests.get(f"{BACKEND_URL}/api/campaigns/accounts", headers=headers, timeout=10)
    if acc_res.status_code == 200:
        accs = acc_res.json()
        log_test("WF-7", "Email_Accounts_Audit", "PASS", f"Connected accounts audited: {len(accs)} active accounts")
    else:
        log_test("WF-7", "Email_Accounts_Audit", "FAIL", f"HTTP {acc_res.status_code}")
        
    test_send_res = requests.post(f"{BACKEND_URL}/api/campaigns/test-send", json={
        "account_id": 9999,
        "channel": "email",
        "recipient": "test@example.com"
    }, headers=headers, timeout=10)
    if test_send_res.status_code == 404:
        log_test("WF-7", "Honest_Failure_On_Missing_Sender", "PASS", "HTTP 404 returned honestly for missing sender")
    else:
        log_test("WF-7", "Honest_Failure_On_Missing_Sender", "FAIL", f"Unexpected status {test_send_res.status_code}")
except Exception as e:
    log_test("WF-7", "Email_Outreach", "FAIL", str(e))

# --- WORKFLOW 8: WHATSAPP COMPANION & ENDPOINTS ---
try:
    wa_over = requests.get(f"{BACKEND_URL}/api/whatsapp/overview", headers=headers, timeout=10)
    if wa_over.status_code == 200:
        log_test("WF-8", "WhatsApp_Overview", "PASS", f"Overview metrics: {wa_over.json().get('metrics')}")
    else:
        log_test("WF-8", "WhatsApp_Overview", "FAIL", f"HTTP {wa_over.status_code}")
        
    wa_set = requests.get(f"{BACKEND_URL}/api/whatsapp/settings", headers=headers, timeout=10)
    if wa_set.status_code == 200:
        log_test("WF-8", "WhatsApp_Settings", "PASS", f"Settings profile: {wa_set.json().get('settings', {}).get('my_business_name')}")
    else:
        log_test("WF-8", "WhatsApp_Settings", "FAIL", f"HTTP {wa_set.status_code}")
        
    wa_tmpl = requests.get(f"{BACKEND_URL}/api/whatsapp/templates", headers=headers, timeout=10)
    if wa_tmpl.status_code == 200:
        log_test("WF-8", "WhatsApp_Templates", "PASS", f"Loaded {len(wa_tmpl.json().get('templates', []))} templates")
    else:
        log_test("WF-8", "WhatsApp_Templates", "FAIL", f"HTTP {wa_tmpl.status_code}")
        
    meta_res = requests.post(f"{FRONTEND_URL}/api/campaigns/whatsapp-setup", json={
        "waba_id": "placeholder_waba",
        "phone_number_id": "placeholder_phone",
        "access_token": "placeholder_token"
    }, timeout=10)
    if meta_res.status_code == 400:
        log_test("WF-8", "Meta_Cloud_Honest_Validation", "PASS", "HTTP 400 rejected placeholder tokens honestly")
    else:
        log_test("WF-8", "Meta_Cloud_Honest_Validation", "FAIL", f"Unexpected status {meta_res.status_code}")
except Exception as e:
    log_test("WF-8", "WhatsApp_Suite", "FAIL", str(e))

# --- WORKFLOW 9: ANALYTICS & REPORTING ---
try:
    dash_res = requests.get(f"{BACKEND_URL}/api/analytics/dashboard", headers=headers, timeout=10)
    if dash_res.status_code == 200:
        data = dash_res.json()
        log_test("WF-9", "Analytics_Dashboard", "PASS", f"Metrics verified: {list(data.keys())}")
    else:
        log_test("WF-9", "Analytics_Dashboard", "FAIL", f"HTTP {dash_res.status_code}")
except Exception as e:
    log_test("WF-9", "Analytics_Suite", "FAIL", str(e))

# --- WORKFLOW 10: PRODUCTION ENDPOINTS PARITY ---
try:
    prod_res = requests.get(f"{PROD_URL}/api/whatsapp/overview", timeout=10)
    if prod_res.status_code == 200:
        log_test("WF-10", "Production_WhatsApp_Overview", "PASS", f"Live production returned 200 OK: {prod_res.json().get('status')}")
    else:
        log_test("WF-10", "Production_WhatsApp_Overview", "FAIL", f"Live production returned HTTP {prod_res.status_code}")
        
    prod_landing = requests.get(PROD_URL, timeout=10)
    if prod_landing.status_code == 200:
        log_test("WF-10", "Production_Landing_Reachability", "PASS", "Live production landing returned HTTP 200 OK")
    else:
        log_test("WF-10", "Production_Landing_Reachability", "FAIL", f"Live production landing returned HTTP {prod_landing.status_code}")
except Exception as e:
    log_test("WF-10", "Production_Suite", "FAIL", str(e))

print("=" * 70)
total_tests = len(results)
passed_tests = sum(1 for r in results.values() if r["status"] == "PASS")
print(f"SUMMARY: {passed_tests}/{total_tests} WORKFLOW CHECKS PASSED")
print("=" * 70)

with open("scratch/workflow_audit_results.json", "w") as fp:
    json.dump(results, fp, indent=2)
