import requests
import json

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000"

print("--- Testing Authentication for Search ---")
login_res = requests.post(
    f"{BACKEND_URL}/api/auth/login",
    json={"email": "selftest_founder_2026@usmanai.com", "password": "SecurePassword@2026!"},
    timeout=10
)
print("Login status:", login_res.status_code)
token = login_res.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}

payload = {
    "keyword": "dentist",
    "city": "Lahore",
    "country": "Pakistan",
    "limit": 5
}

print("\n--- Testing Search via Backend (/api/leads/search) ---")
be_search = requests.post(f"{BACKEND_URL}/api/leads/search", json=payload, headers=headers, timeout=20)
print("Backend search status:", be_search.status_code)
print("Backend search response:", json.dumps(be_search.json(), indent=2)[:500])

print("\n--- Testing Search via Next.js Proxy (/api/leads/search) ---")
fe_search = requests.post(f"{FRONTEND_URL}/api/leads/search", json=payload, headers=headers, timeout=25)
print("Frontend search status:", fe_search.status_code)
print("Frontend search response:", json.dumps(fe_search.json(), indent=2)[:500])
