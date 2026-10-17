"""
USMAN AI GTM — Security Remediation Regression Test Suite
Validates fixes for:
- SEC-008 / BUG-015: Authentication Bypass Elimination
- SEC-007 / BUG-011: Password Reset Token Leak Elimination
- SEC-010: SSRF Protection on Outbound Domain Crawling
- BUG-012: AI Agent Execution Realism
- BUG-013: Genuine Provider Health Verification
- BUG-014: Realistic Features Lab Telemetry (Zero Fabricated Metrics)
"""

import sys
import os

# Ensure current directory is on sys.path
sys.path.insert(0, os.path.abspath("."))

import time
import requests
import sqlite3

BASE_URL = "http://127.0.0.1:8000"

passed = 0
failed = 0

def assert_test(name, condition, details=""):
    global passed, failed
    if condition:
        print(f"[PASS] {name} {details}")
        passed += 1
    else:
        print(f"[FAIL] {name} {details}")
        failed += 1

print("=" * 70)
print("RUNNING SECURITY REMEDIATION REGRESSION TESTS")
print("=" * 70)

# ==============================================================================
# 1. SEC-008: Authentication Bypass Elimination (Invalid & Forged Bearer Tokens)
# ==============================================================================
print("\n--- 1. SEC-008: Bearer Token Prefix Bypass Elimination ---")
insecure_prefixes = [
    "jwt_session_admin_bypass_attempt",
    "jwt_session_1",
    "google_oauth_bypass_token_9999",
    "google_1234567890",
    "usman_jwt_superadmin_forged",
    "usman_jwt_1",
    "arbitrary_garbage_token_xyz",
    "Bearer jwt_session_nested",
]

for token in insecure_prefixes:
    res = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert_test(
        f"Reject prefix token '{token[:20]}...'",
        res.status_code == 401,
        f"Expected 401, got {res.status_code}"
    )

# Expired token test
from datetime import datetime, timedelta, timezone
import jwt
from backend.app.core.config import settings

expired_payload = {
    "sub": "admin@usmanai.com",
    "user_id": 1,
    "role": "ADMIN",
    "exp": datetime.now(timezone.utc) - timedelta(hours=1),
    "iat": datetime.now(timezone.utc) - timedelta(hours=2)
}
expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
res_exp = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
assert_test("Reject expired JWT", res_exp.status_code == 401, f"Status: {res_exp.status_code}")

# Forged signature test (signed with wrong key)
forged_token = jwt.encode(
    {"sub": "admin@usmanai.com", "user_id": 1, "role": "ADMIN", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
    "completely_wrong_secret_key_12345",
    algorithm="HS256"
)
res_forged = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {forged_token}"})
assert_test("Reject forged HMAC signature", res_forged.status_code == 401, f"Status: {res_forged.status_code}")

# Valid signed token should still succeed
valid_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "selftest_founder_2026@usmanai.com", "password": "SecurePassword@2026!"})
if valid_login.status_code == 200:
    valid_token = valid_login.json()["access_token"]
    res_me = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {valid_token}"})
    assert_test("Legitimate signed JWT accepted", res_me.status_code == 200 and res_me.json()["email"] == "selftest_founder_2026@usmanai.com")
else:
    assert_test("Legitimate login succeeded", False, f"Login returned {valid_login.status_code}")

# ==============================================================================
# 2. SEC-007: Password Reset Token Leak Elimination
# ==============================================================================
print("\n--- 2. SEC-007: Password Reset Leak & Workflow Hardening ---")
# Reset request for registered user
res_forgot_reg = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": "admin@usmanai.com"})
assert_test("Forgot password returned 200", res_forgot_reg.status_code == 200)
reg_body = res_forgot_reg.json()
assert_test(
    "Response does NOT contain 'token_available_for_local_test'",
    "token_available_for_local_test" not in reg_body,
    f"Keys present: {list(reg_body.keys())}"
)
assert_test(
    "Response contains generic non-enumerating message",
    "password reset instructions have been sent" in reg_body.get("message", "").lower()
)

# Reset request for unregistered email (must return identical generic response)
res_forgot_unreg = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": "does_not_exist_98765@example.com"})
assert_test("Unregistered email returned 200", res_forgot_unreg.status_code == 200)
unreg_body = res_forgot_unreg.json()
assert_test("Unregistered email also has NO reset token", "token_available_for_local_test" not in unreg_body)
assert_test("Messages match (non-enumerating)", reg_body.get("message") == unreg_body.get("message"))

# Invalidate / reject invalid reset token
res_bad_reset = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
    "token": "completely_fake_invalid_reset_token",
    "new_password": "NewSecurePassword123!"
})
assert_test("Reject invalid reset token", res_bad_reset.status_code == 400)

# ==============================================================================
# 3. SEC-010: SSRF Protection
# ==============================================================================
print("\n--- 3. SEC-010: SSRF Protection on Outbound Requests ---")
from backend.app.core.ssrf_protection import validate_url_safety, is_ip_safe

safe_1, r_1 = validate_url_safety("http://127.0.0.1:8000/api/health")
assert_test("SSRF blocks loopback 127.0.0.1:8000", not safe_1, f"Reason: {r_1}")

safe_2, r_2 = validate_url_safety("http://169.254.169.254/latest/meta-data")
assert_test("SSRF blocks cloud metadata 169.254.169.254", not safe_2, f"Reason: {r_2}")

safe_3, r_3 = validate_url_safety("http://192.168.1.1/admin")
assert_test("SSRF blocks private RFC1918 192.168.1.1", not safe_3, f"Reason: {r_3}")

safe_4, r_4 = validate_url_safety("http://localhost/")
assert_test("SSRF blocks localhost resolution", not safe_4, f"Reason: {r_4}")

safe_5, r_5 = validate_url_safety("https://example.com/")
assert_test("SSRF permits safe public domain (example.com)", safe_5, f"Reason: {r_5}")

# ==============================================================================
# 4. BUG-012: AI Agent Execution Realism
# ==============================================================================
print("\n--- 4. BUG-012: AI Agent Execution Realism ---")
from backend.app.api.agents import execute_agent, RunAgentRequest

dry_res = execute_agent("research-recon", RunAgentRequest(dry_run=True), {"workspace_id": 1, "email": "admin@usmanai.com"})
dry_metrics = dry_res["result"]["metrics"]
assert_test("Dry-run consumes 0 tokens", dry_metrics["tokens_consumed"] == 0)
assert_test("Dry-run marked as simulated", dry_metrics.get("simulated") is True)
assert_test("Dry-run records real latency", dry_metrics["latency_ms"] >= 0)

# ==============================================================================
# 5. BUG-013: Provider Health Checks Realism
# ==============================================================================
print("\n--- 5. BUG-013: Provider Health Checks Realism ---")
from backend.app.services.providers_service import ProvidersService

p_unconf = ProvidersService.test_provider(2) # Crawl4AI has no key
assert_test("Unconfigured provider returns NOT_CONFIGURED", p_unconf["status"] == "NOT_CONFIGURED")

p_missing = ProvidersService.test_provider(9999)
assert_test("Non-existent provider returns FAILED", p_missing["status"] == "FAILED")

# ==============================================================================
# 6. BUG-014: Features Lab 501-600 Realism (Zero Fabricated Metrics)
# ==============================================================================
print("\n--- 6. BUG-014: Realistic Features Lab Calculations ---")
from backend.app.services.features_501_600_service import Features501To600Service

f501 = Features501To600Service.execute_feature(501, workspace_id=1)
assert_test("Feature 501 uses verified live data", f501["telemetry"]["status"] == "VERIFIED_LIVE_DATA")
assert_test("Feature 501 records_evaluated is real count", f501["telemetry"]["records_evaluated"] > 0)
assert_test("Feature 501 no longer has fake 184 records", f501["telemetry"]["records_evaluated"] != 184)

f502 = Features501To600Service.execute_feature(502, workspace_id=1)
assert_test("Feature 502 returns honest insufficient_data", f502["status"] == "insufficient_data")
assert_test("Feature 502 records_evaluated is 0 (not fake)", f502["telemetry"]["records_evaluated"] == 0)
assert_test("Feature 502 has NO fake trend string", f502["output_data"] is None)

# ==============================================================================
# Summary
# ==============================================================================
print("\n" + "=" * 70)
print(f"SECURITY REMEDIATION TEST RESULTS: {passed} PASSED, {failed} FAILED")
print("=" * 70)

if failed > 0:
    sys.exit(1)
