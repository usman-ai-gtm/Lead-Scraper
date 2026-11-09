import os
import sys
import requests

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def test_endpoints():
    print("=== Testing FastAPI Endpoints on :8000 ===")
    be_url = "http://127.0.0.1:8000"

    # 1. Health
    h_res = requests.get(f"{be_url}/api/health", timeout=5)
    print("Health:", h_res.status_code, h_res.json().get("status"))
    assert h_res.status_code == 200

    # 2. Login to get token
    login_res = requests.post(f"{be_url}/api/auth/login", json={
        "email": "selftest_founder_2026@usmanai.com",
        "password": "SecurePassword@2026!"
    }, timeout=5)
    if login_res.status_code != 200:
        # Create user
        requests.post(f"{be_url}/api/auth/signup", json={
            "email": "selftest_founder_2026@usmanai.com",
            "password": "SecurePassword@2026!",
            "full_name": "Test Founder",
            "company": "Test Co"
        }, timeout=5)
        login_res = requests.post(f"{be_url}/api/auth/login", json={
            "email": "selftest_founder_2026@usmanai.com",
            "password": "SecurePassword@2026!"
        }, timeout=5)
    token = login_res.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Test AI Strategy endpoint
    strat_res = requests.post(f"{be_url}/api/leads/ai-strategy", json={
        "prompt": "Find luxury boutique hotels in Dubai needing website redesign and booking automation"
    }, headers=headers, timeout=10)
    print("AI Strategy Status:", strat_res.status_code)
    strat_data = strat_res.json()
    print("Suggested Keyword:", strat_data.get("suggested_keyword"))
    print("Country / City:", strat_data.get("country"), "/", strat_data.get("city"))
    print("Platforms:", strat_data.get("recommended_platforms"))
    assert strat_res.status_code == 200
    assert strat_data.get("country") == "United Arab Emirates"

    # 4. Test Lead Scoring endpoint
    score_res = requests.post(f"{be_url}/api/leads/1/score", headers=headers, timeout=10)
    print("Lead 1 Score Status:", score_res.status_code)
    score_data = score_res.json()
    print("Scores -> Final:", score_data.get("final_lead_score"), "| ICP:", score_data.get("icp_fit_score"), "| Opp:", score_data.get("business_opportunity_score"))
    assert score_res.status_code == 200
    assert "final_lead_score" in score_data

    # 5. Test Buying Intent endpoint
    intent_res = requests.post(f"{be_url}/api/leads/1/intent", json={
        "target_service": "Website / Redesign"
    }, headers=headers, timeout=10)
    print("Lead 1 Intent Status:", intent_res.status_code)
    intent_data = intent_res.json()
    print("Intent -> Success:", intent_data.get("success"), "| Level:", intent_data.get("synthesis", {}).get("buying_intent_level"))
    assert intent_res.status_code == 200
    assert intent_data.get("success") is True

    # 6. Test Feature Execution endpoint (Features 18 & 19)
    f18_res = requests.post(f"{be_url}/api/features/18/execute", json={"lead_id": 1}, headers=headers, timeout=10)
    print("Feature 18 Execute Status:", f18_res.status_code, "| Name:", f18_res.json().get("feature_name"))
    assert f18_res.status_code == 200

    f19_res = requests.post(f"{be_url}/api/features/19/execute", json={"lead_id": 1}, headers=headers, timeout=10)
    print("Feature 19 Execute Status:", f19_res.status_code, "| Name:", f19_res.json().get("feature_name"))
    assert f19_res.status_code == 200

    print("\n>>> ALL API ENDPOINT INTEGRATION TESTS PASSED! <<<")

if __name__ == "__main__":
    test_endpoints()
