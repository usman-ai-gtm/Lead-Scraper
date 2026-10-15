import sys
import os

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import get_db_connection

client = TestClient(app)

print("=== 1. TESTING HEALTH CHECK ===")
res = client.get("/api/health")
print(f"Health check status: {res.status_code}, response: {res.json()}")

print("\n=== 2. TESTING SIGNUP ENDPOINT ===")
test_email = "test_founder_2026@usmanai.com"
signup_payload = {
    "email": test_email,
    "password": "StrongPassword123!",
    "full_name": "Test Founder",
    "company": "Test Enterprise Ltd",
    "workspace_name": "Test Growth Workspace"
}

# First check if user already exists from past run, delete test user if needed
conn = get_db_connection()
conn.execute("DELETE FROM users WHERE email = ?", (test_email,))
conn.commit()
conn.close()

try:
    res = client.post("/api/auth/signup", json=signup_payload)
    print(f"Signup response status: {res.status_code}")
    print(f"Signup body: {res.text}")
    if res.status_code == 200:
        print("SUCCESS: Signup returned 200 OK!")
        token_data = res.json()
        token = token_data.get("access_token")
        print(f"Received access token: {token[:20]}...")
    else:
        print(f"SIGNUP FAILED: {res.status_code} - {res.text}")
except Exception as e:
    import traceback
    print("EXCEPTION during signup:")
    traceback.print_exc()

print("\n=== 3. TESTING LOGIN ENDPOINT ===")
try:
    login_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "StrongPassword123!"
    })
    print(f"Login status: {login_res.status_code}")
    print(f"Login body: {login_res.text}")
except Exception as e:
    import traceback
    print("EXCEPTION during login:")
    traceback.print_exc()

print("\n=== 4. TESTING DUPLICATE SIGNUP ===")
try:
    dup_res = client.post("/api/auth/signup", json=signup_payload)
    print(f"Duplicate signup status: {dup_res.status_code}")
    print(f"Duplicate signup body: {dup_res.text}")
except Exception as e:
    import traceback
    traceback.print_exc()

print("\n=== 5. CHECKING DATABASE RECORD ===")
conn = get_db_connection()
row = conn.execute("SELECT id, email, full_name, role, workspace_id FROM users WHERE email = ?", (test_email,)).fetchone()
if row:
    print(f"User in DB: {dict(row)}")
else:
    print("User NOT found in DB!")
conn.close()
