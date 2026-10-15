import requests
import json
import sqlite3

BASE_URL = "http://localhost:3000"
test_email = "e2e_founder_live@usmanai.com"
test_password = "SecurePassword2026!"

print(f"=== E2E TESTING VIA NEXT.JS ON {BASE_URL} ===")

# 1. Clean up test user from DB first if present
conn = sqlite3.connect("d:/DATA D/LUXURY DASHBOARD/usman_data_analytics.db")
conn.execute("DELETE FROM users WHERE email = ?", (test_email,))
conn.commit()
conn.close()

# 2. Test registration via Next.js endpoint
print("\n[Test 1] Testing /api/auth/signup...")
payload = {
    "email": test_email,
    "password": test_password,
    "full_name": "E2E Live Founder",
    "company": "Live Enterprise",
    "workspace_name": "Live Growth Center"
}

res = requests.post(f"{BASE_URL}/api/auth/signup", json=payload, timeout=20)
print(f"Status Code: {res.status_code}")
print(f"Response: {res.text}")

token = None
if res.status_code == 200:
    data = res.json()
    token = data.get("access_token")
    print(f"Access Token: {token[:25]}...")
    print(f"User: {data.get('user')}")

# 3. Test duplicate registration
print("\n[Test 2] Testing duplicate signup rejection...")
dup_res = requests.post(f"{BASE_URL}/api/auth/signup", json=payload, timeout=20)
print(f"Duplicate status: {dup_res.status_code}")
print(f"Duplicate response: {dup_res.text}")

# 4. Test login via Next.js endpoint
print("\n[Test 3] Testing /api/auth/login with valid credentials...")
login_payload = {
    "email": test_email,
    "password": test_password
}
login_res = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload, timeout=20)
print(f"Login status: {login_res.status_code}")
print(f"Login response: {login_res.text}")

# 5. Test login with invalid password
print("\n[Test 4] Testing login with wrong password...")
bad_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": test_email, "password": "WrongPassword!"}, timeout=20)
print(f"Wrong password status: {bad_res.status_code}")
print(f"Wrong password response: {bad_res.text}")

# 6. Test login with unregistered email
print("\n[Test 5] Testing login with unregistered email...")
unreg_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "nonexistent_email_404@nowhere.com", "password": "AnyPassword123!"}, timeout=20)
print(f"Unregistered user status: {unreg_res.status_code}")
print(f"Unregistered user response: {unreg_res.text}")

# 7. Verify persistent database record in usman_data_analytics.db
print("\n[Test 6] Verifying SQLite database persistence...")
conn = sqlite3.connect("d:/DATA D/LUXURY DASHBOARD/usman_data_analytics.db")
conn.row_factory = sqlite3.Row
row = conn.execute("SELECT id, email, full_name, role, workspace_id, created_at FROM users WHERE email = ?", (test_email,)).fetchone()
if row:
    print(f"SUCCESS: User record verified in usman_data_analytics.db -> {dict(row)}")
else:
    print("FAILURE: User record not found in database!")
conn.close()
