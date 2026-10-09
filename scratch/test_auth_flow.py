"""
Test suite for Priority 1: Authentication & Password Reset Flow
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + "/.."))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_auth_full_lifecycle():
    import uuid
    unique_suffix = str(uuid.uuid4())[:8]
    test_email = f"test_{unique_suffix}@example.com"
    test_pass = "SecurePass2026!"
    new_pass = "UpdatedSecure2026!"

    print("\n--- 1. Testing Registration ---")
    reg_res = client.post("/api/auth/signup", json={
        "email": test_email,
        "password": test_pass,
        "full_name": "Test Engineer",
        "company": "Test Org",
        "workspace_name": f"Workspace {unique_suffix}"
    })
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    data = reg_res.json()
    assert "access_token" in data
    assert data["user"]["email"] == test_email
    print(f"PASS: User registered successfully with ID {data['user']['id']}")

    print("\n--- 2. Testing Duplicate Registration Prevention ---")
    dup_res = client.post("/api/auth/signup", json={
        "email": test_email,
        "password": test_pass,
        "full_name": "Duplicate Attempt",
    })
    assert dup_res.status_code == 400, f"Expected 400 for duplicate, got {dup_res.status_code}: {dup_res.text}"
    print("PASS: Duplicate registration correctly rejected with 400 Bad Request")

    print("\n--- 3. Testing Login with Invalid Credentials ---")
    bad_login = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401
    print("PASS: Invalid password correctly rejected with 401 Unauthorized")

    nonexistent_login = client.post("/api/auth/login", json={
        "email": "nonexistent_user_99999@example.com",
        "password": "AnyPassword!"
    })
    assert nonexistent_login.status_code == 401
    print("PASS: Nonexistent account correctly rejected with 401 Unauthorized")

    print("\n--- 4. Testing Login with Valid Credentials ---")
    good_login = client.post("/api/auth/login", json={
        "email": test_email,
        "password": test_pass
    })
    assert good_login.status_code == 200
    token = good_login.json()["access_token"]
    print("PASS: Valid login authenticated successfully")

    print("\n--- 5. Testing /auth/me Profile Verification ---")
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == test_email
    print("PASS: /auth/me returned verified profile")

    print("\n--- 6. Testing Forgot Password Flow ---")
    forgot_res = client.post("/api/auth/forgot-password", json={"email": test_email})
    assert forgot_res.status_code == 200
    forgot_data = forgot_res.json()
    token_test = forgot_data.get("token_available_for_local_test")
    assert token_test is not None, "Password reset token was not generated"
    print(f"PASS: Reset token generated: {token_test[:10]}...")

    print("\n--- 7. Testing Reset Password Flow ---")
    reset_res = client.post("/api/auth/reset-password", json={
        "token": token_test,
        "new_password": new_pass
    })
    assert reset_res.status_code == 200
    print("PASS: Password successfully updated via single-use token")

    print("\n--- 8. Testing Token Single-Use Invalidation ---")
    reuse_res = client.post("/api/auth/reset-password", json={
        "token": token_test,
        "new_password": "AnotherPassword!"
    })
    assert reuse_res.status_code == 400
    print("PASS: Reusing spent reset token correctly rejected with 400 Bad Request")

    print("\n--- 9. Testing Login with Updated Password ---")
    old_pass_login = client.post("/api/auth/login", json={
        "email": test_email,
        "password": test_pass
    })
    assert old_pass_login.status_code == 401
    print("PASS: Old password no longer works")

    new_pass_login = client.post("/api/auth/login", json={
        "email": test_email,
        "password": new_pass
    })
    assert new_pass_login.status_code == 200
    print("PASS: New password successfully authenticates")

    print("\n--- 10. Testing Google Verify Endpoint ---")
    google_res = client.post("/api/auth/google-verify", json={
        "email": f"google_{unique_suffix}@gmail.com",
        "full_name": "Google Verified User"
    })
    assert google_res.status_code == 200
    g_data = google_res.json()
    assert "access_token" in g_data
    assert g_data["user"]["email"] == f"google_{unique_suffix}@gmail.com"
    print("PASS: Google Verify provisioned and authenticated user")

    print("\n>>> ALL 10 AUTHENTICATION & PASSWORD RESET TESTS PASSED! <<<")

if __name__ == "__main__":
    test_auth_full_lifecycle()
