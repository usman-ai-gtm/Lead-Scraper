import requests
import json
import sys

BASE_URL = "http://localhost:3000"

def run_tests():
    print(f"=== TESTING LIVE SYSTEM E2E ON {BASE_URL} ===")
    session = requests.Session()
    
    # 1. Test Login
    print("\n[1] Testing /api/auth/login...")
    login_res = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@usmanai.com",
        "password": "UsmanGTM@2026!"
    })
    print(f"Status: {login_res.status_code}")
    if login_res.status_code != 200:
        print(f"FAILED login: {login_res.text}")
        return False
    login_data = login_res.json()
    token = login_data.get("access_token")
    print(f"Obtained Token: {token[:25]}... Role: {login_data.get('user', {}).get('role')}")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    endpoints = [
        ("GET", "/api/auth/me", None, 200),
        ("GET", "/api/auth/workspaces", None, 200),
        ("GET", "/api/auth/google/url", None, 200),
        ("GET", "/api/features/catalog", None, 200),
        ("POST", "/api/features/501/execute", {"lead_id": 1, "deal_size": 25000}, 200),
        ("GET", "/api/leads?limit=5", None, 200),
        ("GET", "/api/crm/pipeline", None, 200),
        ("GET", "/api/crm/companies", None, 200),
        ("GET", "/api/crm/contacts", None, 200),
        ("GET", "/api/crm/deals", None, 200),
        ("GET", "/api/campaigns", None, 200),
        ("GET", "/api/campaigns/accounts", None, 200),
        ("GET", "/api/analytics/dashboard", None, 200),
        ("GET", "/api/providers", None, 200),
        ("GET", "/api/features-lab/catalog", None, 200),
        ("POST", "/api/copilot/chat", {"message": "Give me an overview of pipeline"}, 200),
        ("GET", "/api/admin/overview", None, 200),
        ("GET", "/api/admin/users", None, 200)
    ]
    
    passed = 0
    failed = []
    
    for method, ep, body, expected_status in endpoints:
        print(f"\nTesting {method} {ep}...")
        try:
            if method == "GET":
                res = session.get(f"{BASE_URL}{ep}", headers=headers, timeout=10)
            elif method == "POST":
                res = session.post(f"{BASE_URL}{ep}", headers=headers, json=body or {}, timeout=10)
                
            print(f"  Status: {res.status_code}")
            if res.status_code == expected_status:
                passed += 1
                raw_text = res.text[:80]
                safe_sample = raw_text.encode('ascii', errors='replace').decode('ascii')
                print(f"  PASS: {safe_sample}...")
            else:
                err_text = res.text[:150].encode('ascii', errors='replace').decode('ascii')
                print(f"  FAIL: Expected {expected_status}, got {res.status_code}: {err_text}")
                failed.append((ep, res.status_code, err_text))
        except Exception as e:
            print(f"  EXCEPTION: {e}")
            failed.append((ep, "EXC", str(e)))
            
    print("\n" + "=" * 50)
    print(f"E2E API RESULTS: {passed}/{len(endpoints)} PASSED")
    if failed:
        print(f"FAILED ENDPOINTS ({len(failed)}):")
        for f in failed:
            print(f"  - {f[0]} (Code: {f[1]}): {f[2]}")
    print("=" * 50)
    return len(failed) == 0

if __name__ == "__main__":
    success = run_tests()
    if not success:
        sys.exit(1)
