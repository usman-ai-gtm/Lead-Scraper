"""
Database alignment and verification script for both SQLite databases:
- usman_data_analytics.db
- usman_luxury_engine.db
"""
import os
import sys
import sqlite3

ROOT = os.path.abspath(".")
sys.path.insert(0, ROOT)

import app

dbs = ["usman_data_analytics.db", "usman_luxury_engine.db"]

for db_name in dbs:
    db_path = os.path.join(ROOT, db_name)
    print(f"\n========================================================")
    print(f"ALIGNING DATABASE: {db_name}")
    print(f"========================================================")
    if not os.path.exists(db_path):
        print(f"File {db_name} does not exist, creating...")
    
    # Temporarily set app.DB_PATH to target database
    app.DB_PATH = db_name

    # 1. Initialize base schema and workspaces tenant_id compatibility
    app.init_db()
    print("[PASS] init_db() executed.")

    # 2. Initialize premium schema (including evidence table)
    app.init_premium_schema()
    print("[PASS] init_premium_schema() executed.")

    # 3. Ensure engine databases (buying_intent, deduplication, social, decision maker, verification, cross platform)
    app.BuyingIntentEngine.ensure_database()
    print("[PASS] BuyingIntentEngine.ensure_database() executed.")

    app.LeadDeduplicationEngine.ensure_database()
    print("[PASS] LeadDeduplicationEngine.ensure_database() executed.")

    app.SocialMediaIntelligenceEngine.ensure_database()
    print("[PASS] SocialMediaIntelligenceEngine.ensure_database() executed.")

    app.DecisionMakerIntelligenceEngine.ensure_database()
    print("[PASS] DecisionMakerIntelligenceEngine.ensure_database() executed.")

    app.LeadDataVerificationEngine.ensure_database()
    print("[PASS] LeadDataVerificationEngine.ensure_database() executed.")

    app.CrossPlatformIdentityEngine.ensure_database()
    print("[PASS] CrossPlatformIdentityEngine.ensure_database() executed.")

    # 4. Verify evidence table
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='evidence'")
    has_evidence = cur.fetchone() is not None
    print(f"Evidence table present: {has_evidence}")

    # Verify buying_intent_analysis columns
    cur.execute("PRAGMA table_info(buying_intent_analysis)")
    intent_cols = [r[1] for r in cur.fetchall()]
    print(f"buying_intent_analysis column count: {len(intent_cols)}")
    assert "buying_intent_score" in intent_cols
    assert "potential_trigger" in intent_cols

    # Verify duplicate_clusters columns
    cur.execute("PRAGMA table_info(duplicate_clusters)")
    cluster_cols = [r[1] for r in cur.fetchall()]
    print(f"duplicate_clusters column count: {len(cluster_cols)}")
    assert "duplicate_lead_ids" in cluster_cols
    assert "similarity_score" in cluster_cols

    # Verify workspaces tenant_id
    cur.execute("PRAGMA table_info(workspaces)")
    ws_cols = [r[1] for r in cur.fetchall()]
    print(f"workspaces columns: {ws_cols}")
    assert "tenant_id" in ws_cols

    # Verify leads identity_key and check for empty keys
    cur.execute("PRAGMA table_info(leads)")
    lead_cols = [r[1] for r in cur.fetchall()]
    print(f"leads has identity_key: {'identity_key' in lead_cols}")
    assert "identity_key" in lead_cols

    cur.execute("SELECT COUNT(*) FROM leads WHERE identity_key IS NULL OR identity_key = ''")
    empty_keys = cur.fetchone()[0]
    print(f"leads with empty identity_key: {empty_keys}")
    assert empty_keys == 0, f"Found {empty_keys} empty identity keys!"

    conn.close()
    print(f"[SUCCESS] {db_name} schema fully aligned and verified.")

# Reset app.DB_PATH back to default
app.DB_PATH = "usman_data_analytics.db"
print("\nALL DATABASES ALIGNED SUCCESSFULLY.")

