"""
Verification test suite for app.py surgical repairs.
Tests all 7 fixes against usman_data_analytics.db.
"""
import os
import sys
import sqlite3

ROOT = os.path.abspath(".")
sys.path.insert(0, ROOT)

import app

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
print("TESTING APP.PY SURGICAL REPAIRS & SCHEMA ALIGNMENT")
print("=" * 70)

# ----------------------------------------------------------------------
# TEST 1: Imports and Global Helper Functions (FIX 1 & FIX 2)
# ----------------------------------------------------------------------
print("\n--- TEST 1: Global Helper Functions & SSRF Guards ---")
assert_test("now_iso returns valid ISO string", "T" in app.now_iso())
assert_test("clean_text handles None", app.clean_text(None) == "")
assert_test("clean_text collapses whitespace", app.clean_text("  hello   world  ") == "hello world")
assert_test("safe_int converts valid int", app.safe_int("42") == 42)
assert_test("safe_int handles None and default", app.safe_int(None, default=7) == 7)
assert_test("safe_float converts float", app.safe_float("3.14") == 3.14)
assert_test("safe_float handles invalid", app.safe_float("bad", default=1.5) == 1.5)

# SSRF Guard tests
assert_test("SSRF blocks localhost", app.is_safe_public_url("http://localhost:8000/api") is False)
assert_test("SSRF blocks 127.0.0.1", app.is_safe_public_url("http://127.0.0.1:8000/test") is False)
assert_test("SSRF blocks cloud metadata", app.is_safe_public_url("http://169.254.169.254/latest/meta-data") is False)
assert_test("SSRF blocks private 192.168.1.1", app.is_safe_public_url("http://192.168.1.1/") is False)
assert_test("SSRF blocks non-http scheme", app.is_safe_public_url("file:///etc/passwd") is False)
assert_test("SSRF permits safe public URL", app.is_safe_public_url("https://example.com") is True)

assert_test("norm_url prepends https", app.norm_url("example.com") == "https://example.com")
assert_test("norm_url returns empty for unsafe", app.norm_url("http://127.0.0.1:8000") == "")
assert_test("normalize_email valid", app.normalize_email(" Test@Example.com ") == "test@example.com")
assert_test("normalize_email invalid", app.normalize_email("no_at_sign") == "")
assert_test("normalize_phone removes symbols", app.normalize_phone("+1 (555) 123-4567") == "+15551234567")
assert_test("stable_hash deterministic", app.stable_hash("a", "b") == app.stable_hash("A ", " B"))

# ----------------------------------------------------------------------
# TEST 2: WebsiteIntelligence Class (FIX 3)
# ----------------------------------------------------------------------
print("\n--- TEST 2: WebsiteIntelligence Class ---")
assert_test("WebsiteIntelligence class exists", hasattr(app, "WebsiteIntelligence"))
crawl_res = app.WebsiteIntelligence.crawl_and_extract("http://127.0.0.1:8000")
assert_test("WebsiteIntelligence blocks SSRF to 127.0.0.1", crawl_res["email"] == "" and crawl_res["phone"] == "")
assert_test("WebsiteIntelligence has required keys", all(k in crawl_res for k in ["email", "phone", "email_status", "email_confidence", "snippet"]))
deep_res = app.WebsiteIntelligence.deep_crawl_contact_info("http://localhost")
assert_test("deep_crawl_contact_info works", all(k in deep_res for k in ["email", "phone", "email_status", "email_confidence", "snippet"]))

# ----------------------------------------------------------------------
# TEST 3: SearchEngineManager Platform Queries (FIX 4)
# ----------------------------------------------------------------------
print("\n--- TEST 3: SearchEngineManager Platform Queries ---")
all_platforms = [
    "Google / Business Directory", "Google/Maps", "Instagram", "Facebook",
    "LinkedIn", "YouTube", "X", "Reddit", "Telegram", "Business Directories",
    "Websites and all other supported sources"
]
res_platforms = app.SearchEngineManager.multi_platform_search("Dentist", "Lahore", "All Platforms")
# If no Serper API key is set in test environment, it safely returns {}
assert_test("multi_platform_search handles All Platforms without crashing", isinstance(res_platforms, dict))

# ----------------------------------------------------------------------
# TEST 4: Engine Execution & SQL Binding Count (FIX 5)
# Tests both INSERT and UPDATE paths on Features #21, #22, #23, #25
# ----------------------------------------------------------------------
print("\n--- TEST 4: Feature Engines & SQL Binding Verification ---")
test_lead_id = 1

# Feature #19: BuyingIntentEngine
intent_res = app.BuyingIntentEngine.analyze_lead(test_lead_id, target_service="Hospitality Software")
assert_test("BuyingIntentEngine.analyze_lead returns valid result", intent_res is not None and "intent_score" in intent_res)

# Feature #20: PersonalizedColdEmailEngine
email_res = app.PersonalizedColdEmailEngine.generate(test_lead_id, target_service="Hospitality Software")
assert_test("PersonalizedColdEmailEngine.generate returns valid result", email_res is not None and "email_subject" in email_res)

# Feature #21: SocialMediaIntelligenceEngine (Test Run 1: INSERT or UPDATE)
social_res_1 = app.SocialMediaIntelligenceEngine.analyze(test_lead_id, target_service="Hospitality Software")
assert_test("Feature #21 SocialMediaIntelligenceEngine run 1 (0 bindings error)", social_res_1 is not None and "social_presence_score" in social_res_1)
# Feature #21: SocialMediaIntelligenceEngine (Test Run 2: Guaranteed UPDATE path)
social_res_2 = app.SocialMediaIntelligenceEngine.analyze(test_lead_id, target_service="Hospitality Software")
assert_test("Feature #21 SocialMediaIntelligenceEngine run 2 UPDATE path (0 bindings error)", social_res_2 is not None and "social_presence_score" in social_res_2)

# Feature #22: DecisionMakerIntelligenceEngine (Test Run 1: INSERT or UPDATE)
decision_res_1 = app.DecisionMakerIntelligenceEngine.analyze(test_lead_id, target_service="Hospitality Software")
assert_test("Feature #22 DecisionMakerIntelligenceEngine run 1 (0 bindings error)", decision_res_1 is not None and "decision_maker_found" in decision_res_1)
# Feature #22: DecisionMakerIntelligenceEngine (Test Run 2: Guaranteed UPDATE path)
decision_res_2 = app.DecisionMakerIntelligenceEngine.analyze(test_lead_id, target_service="Hospitality Software")
assert_test("Feature #22 DecisionMakerIntelligenceEngine run 2 UPDATE path (0 bindings error)", decision_res_2 is not None and "decision_maker_found" in decision_res_2)

# Feature #23: LeadDataVerificationEngine (Test Run 1: INSERT or UPDATE)
verif_res_1 = app.LeadDataVerificationEngine.analyze(test_lead_id)
assert_test("Feature #23 LeadDataVerificationEngine run 1 (0 bindings error)", verif_res_1 is not None and "verification_score" in verif_res_1)
# Feature #23: LeadDataVerificationEngine (Test Run 2: Guaranteed UPDATE path)
verif_res_2 = app.LeadDataVerificationEngine.analyze(test_lead_id)
assert_test("Feature #23 LeadDataVerificationEngine run 2 UPDATE path (0 bindings error)", verif_res_2 is not None and "verification_score" in verif_res_2)

# Feature #24: LeadDeduplicationEngine
dup_res = app.LeadDeduplicationEngine.find_duplicate_clusters(workspace_id=1, minimum_score=0.68)
assert_test("Feature #24 LeadDeduplicationEngine.find_duplicate_clusters works", isinstance(dup_res, dict))

# Feature #25: CrossPlatformIdentityEngine (Test Run 1: INSERT or UPDATE)
cross_res_1 = app.CrossPlatformIdentityEngine.analyze(test_lead_id)
assert_test("Feature #25 CrossPlatformIdentityEngine run 1 (0 bindings error)", cross_res_1 is not None and "identity_score" in cross_res_1.get("analysis", {}))
# Feature #25: CrossPlatformIdentityEngine (Test Run 2: Guaranteed UPDATE path)
cross_res_2 = app.CrossPlatformIdentityEngine.analyze(test_lead_id)
assert_test("Feature #25 CrossPlatformIdentityEngine run 2 UPDATE path (0 bindings error)", cross_res_2 is not None and "identity_score" in cross_res_2.get("analysis", {}))

# Additional 1-100 features engine: premium_run_additional_feature
conn = app.get_db_connection()
lead_row = dict(conn.execute("SELECT * FROM leads WHERE id = ?", (test_lead_id,)).fetchone())
conn.close()

add_res = app.premium_run_additional_feature(1, lead=lead_row, workspace_id=1)
assert_test("premium_run_additional_feature(1) executes without error", add_res is not None and add_res.get("success") is True)

add_res_10 = app.premium_run_additional_feature(10, lead=lead_row, workspace_id=1)
assert_test("premium_run_additional_feature(10) executes without error", add_res_10 is not None and add_res_10.get("success") is True)

# ----------------------------------------------------------------------
# TEST 5: Schema Alignments & Migrations (FIX 6)
# ----------------------------------------------------------------------
print("\n--- TEST 5: SQLite Schema Alignments ---")
conn = sqlite3.connect("usman_data_analytics.db")
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='evidence'")
assert_test("evidence table exists in usman_data_analytics.db", cur.fetchone() is not None)

cur.execute("PRAGMA table_info(buying_intent_analysis)")
intent_cols = {r[1] for r in cur.fetchall()}
assert_test("buying_intent_score in buying_intent_analysis", "buying_intent_score" in intent_cols)
assert_test("potential_trigger in buying_intent_analysis", "potential_trigger" in intent_cols)

cur.execute("PRAGMA table_info(duplicate_clusters)")
cluster_cols = {r[1] for r in cur.fetchall()}
assert_test("duplicate_lead_ids in duplicate_clusters", "duplicate_lead_ids" in cluster_cols)
assert_test("similarity_score in duplicate_clusters", "similarity_score" in cluster_cols)

cur.execute("PRAGMA table_info(workspaces)")
ws_cols = {r[1] for r in cur.fetchall()}
assert_test("tenant_id in workspaces", "tenant_id" in ws_cols)

cur.execute("PRAGMA table_info(leads)")
lead_cols = {r[1] for r in cur.fetchall()}
assert_test("identity_key in leads", "identity_key" in lead_cols)

cur.execute("SELECT COUNT(*) FROM leads WHERE identity_key IS NULL OR identity_key = ''")
empty_count = cur.fetchone()[0]
assert_test("0 empty identity_key rows in leads", empty_count == 0, f"Found {empty_count}")
conn.close()

print("\n" + "=" * 70)
print(f"SURGICAL REPAIR TEST RESULTS: {passed} PASSED, {failed} FAILED")
print("=" * 70)

if failed > 0:
    sys.exit(1)

