"""
USMAN AI GTM - Cloud Database Migration & Verification Utility
Safe, non-destructive schema translation and migration from local SQLite to Cloud PostgreSQL.
Usage:
  python scripts/cloud_db_migration.py --status
  python scripts/cloud_db_migration.py --export-ddl postgres_schema.sql
  python scripts/cloud_db_migration.py --dry-run
  python scripts/cloud_db_migration.py --migrate
"""

import os
import sys
import argparse
import logging
from typing import Dict, Any, List

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.core.config import settings
from backend.app.core.cloud_db import (
    get_database_url,
    get_persistence_info,
    inspect_sqlite_tables,
    generate_postgres_ddl,
    mask_database_url,
    get_cloud_connection,
    test_cloud_connection
)
import sqlite3
import re


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CLOUD_MIGRATION")

CORE_TABLES = [
    "tenants", "workspaces", "users", "leads", "companies", 
    "contacts", "crm_deals", "email_campaigns", "email_accounts",
    "whatsapp_templates", "whatsapp_activities", "whatsapp_settings",
    "whatsapp_suppressions", "user_activity_logs", "account_audit_logs",
    "system_notifications", "search_records", "search_record_leads", "export_history"
]

def print_status():
    info = get_persistence_info()
    print("=" * 70)
    print("USMAN AI GTM - DATABASE PERSISTENCE STATUS")
    print("=" * 70)
    print(f"Current Persistence Mode: {info['mode']}")
    print(f"Active Driver:            {info['driver']}")
    print(f"Cloud URL Configured:     {'YES (Environment-detected)' if info['configured'] else 'NO (Local SQLite)'}")
    print(f"Status Message:           {info['message']}")
    print("-" * 70)
    
    if os.path.exists(settings.DATABASE_PATH):
        db_size_mb = os.path.getsize(settings.DATABASE_PATH) / 1024 / 1024
        print(f"Local SQLite Path:        {settings.DATABASE_PATH}")
        print(f"Local SQLite Size:        {db_size_mb:.2f} MB")
        
        tables = inspect_sqlite_tables(settings.DATABASE_PATH)
        print(f"Total Detected Tables:    {len(tables)}")
        
        print("\nCore Business Tables:")
        core_found = [t for t in tables if t["name"] in CORE_TABLES]
        for t in core_found:
            print(f"  - {t['name']:<25} : {t['rows']} records")
    else:
        print("Local SQLite database file not found at expected path.")
    print("=" * 70)

def export_ddl(output_file: str):
    print(f"Generating PostgreSQL DDL from {settings.DATABASE_PATH}...")
    ddl = generate_postgres_ddl(settings.DATABASE_PATH, target_tables=CORE_TABLES)
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(ddl)
    print(f"Successfully generated PostgreSQL DDL for {len(CORE_TABLES)} core tables.")
    print(f"Saved to: {os.path.abspath(output_file)}")

def test_connection():
    db_url = get_database_url()
    print("=" * 70)
    print("USMAN AI GTM - CLOUD DATABASE CONNECTION TEST")
    print("=" * 70)
    if not db_url:
        print("[ERROR] DATABASE_URL is not set in environment or .env.")
        print("Please configure DATABASE_URL before testing.")
        print("=" * 70)
        return False
    print(f"Target URL (Masked): {mask_database_url(db_url)}")
    success, msg, meta = test_cloud_connection(db_url)
    if success:
        print(f"[SUCCESS] {msg}")
        print(f"PostgreSQL Engine : {meta.get('version')}")
        print(f"Tables Found      : {meta.get('tables_found')}")
        if meta.get("tables"):
            print(f"Existing Tables   : {', '.join(meta.get('tables')[:10])}...")
    else:
        print(f"[FAILED] {msg}")
    print("=" * 70)
    return success

def execute_migration():
    print("=" * 70)
    print("USMAN AI GTM - PRODUCTION CLOUD DATABASE MIGRATION")
    print("=" * 70)
    db_url = get_database_url()
    if not db_url:
        print("[ERROR] DATABASE_URL is not set. Migration cannot proceed.")
        print("=" * 70)
        return False

    print(f"Target Database (Masked): {mask_database_url(db_url)}")
    print("1. Verifying cloud database connectivity...")
    success, msg, meta = test_cloud_connection(db_url)
    if not success:
        print(f"[ABORT] Cannot connect to cloud database: {msg}")
        return False
    print(f"   Connected to PostgreSQL ({meta.get('version')}).")

    print("\n2. Applying PostgreSQL DDL Schema from docs/cloud_postgres_schema.sql...")
    schema_path = os.path.join(os.path.dirname(__file__), "..", "docs", "cloud_postgres_schema.sql")
    if not os.path.exists(schema_path):
        print(f"[ABORT] Schema file not found at {schema_path}")
        return False

    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    pg_conn = get_cloud_connection(db_url)
    pg_cur = pg_conn.cursor()
    try:
        pg_cur.execute(schema_sql)
        pg_conn.commit()
        print("   PostgreSQL DDL schema applied successfully.")
    except Exception as e:
        pg_conn.rollback()
        print(f"[ABORT] Failed to apply schema DDL: {e}")
        pg_conn.close()
        return False

    print("\n3. Migrating table data from local SQLite to PostgreSQL...")
    sqlite_conn = sqlite3.connect(settings.DATABASE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    migration_report = []

    for tbl in CORE_TABLES:
        # Check if table exists in SQLite
        sqlite_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (tbl,))
        if not sqlite_cur.fetchone():
            continue

        sqlite_cur.execute(f'SELECT * FROM "{tbl}"')
        rows = sqlite_cur.fetchall()
        sqlite_count = len(rows)

        if sqlite_count == 0:
            migration_report.append((tbl, sqlite_count, 0, "EMPTY"))
            continue

        # Get column names from SQLite row
        col_names = [d[0] for d in sqlite_cur.description]

        # Get column names from PostgreSQL table
        pg_cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = %s
        """, (tbl,))
        pg_cols = {r[0].lower() for r in pg_cur.fetchall()}

        # Filter cols to those that exist in Postgres
        valid_cols = [c for c in col_names if c.lower() in pg_cols]
        if not valid_cols:
            migration_report.append((tbl, sqlite_count, 0, "NO MATCHING COLS"))
            continue

        cols_str = ", ".join(f'"{c}"' for c in valid_cols)
        placeholders = ", ".join(["%s"] * len(valid_cols))

        conflict_clause = "ON CONFLICT DO NOTHING"
        insert_sql = f'INSERT INTO "{tbl}" ({cols_str}) VALUES ({placeholders}) {conflict_clause}'

        # Prepare batch data
        batch_data = []
        for r in rows:
            batch_data.append(tuple(r[c] for c in valid_cols))

        try:
            from psycopg2.extras import execute_batch
            execute_batch(pg_cur, insert_sql, batch_data, page_size=500)
            pg_conn.commit()

            # Sync sequence if table has id serial
            try:
                pg_cur.execute("SELECT pg_get_serial_sequence(%s, 'id')", (tbl,))
                seq_row = pg_cur.fetchone()
                if seq_row and seq_row[0]:
                    pg_cur.execute(f'SELECT setval(%s, COALESCE((SELECT MAX(id) FROM "{tbl}"), 1), true)', (seq_row[0],))
                    pg_conn.commit()
            except Exception:
                pg_conn.rollback()

            # Verify postgres count
            pg_cur.execute(f'SELECT COUNT(*) FROM "{tbl}"')
            pg_count = pg_cur.fetchone()[0]
            status_str = "MATCHED" if pg_count >= sqlite_count else "PARTIAL"
            migration_report.append((tbl, sqlite_count, pg_count, status_str))
            print(f"   [SYNCED] {tbl:<25}: {sqlite_count} local -> {pg_count} cloud ({status_str})")
        except Exception as e:
            pg_conn.rollback()
            print(f"   [ERROR]  {tbl:<25}: {e}")
            migration_report.append((tbl, sqlite_count, 0, f"ERR: {str(e)[:30]}"))

    sqlite_conn.close()
    pg_conn.close()

    print("\n" + "=" * 70)
    print("MIGRATION VERIFICATION AUDIT")
    print("=" * 70)
    print(f"{'Table Name':<25} | {'SQLite Rows':<12} | {'Postgres Rows':<14} | {'Status'}")
    print("-" * 70)
    for tbl, s_cnt, p_cnt, st in migration_report:
        print(f"{tbl:<25} | {s_cnt:<12} | {p_cnt:<14} | {st}")
    print("=" * 70)
    print("Cloud migration completed.")
    return True

def dry_run():
    print("=" * 70)
    print("USMAN AI GTM - CLOUD MIGRATION DRY-RUN AUDIT")
    print("=" * 70)
    tables = inspect_sqlite_tables(settings.DATABASE_PATH)
    core_found = [t for t in tables if t["name"] in CORE_TABLES]
    total_rows = sum(t["rows"] for t in core_found)
    print(f"Identified {len(core_found)} core business tables with {total_rows} total records ready for cloud synchronization.")
    for t in core_found:
        print(f"  [READY] {t['name']:<25} -> {t['rows']} rows")
    
    db_url = get_database_url()
    if not db_url:
        print("\n[NOTE] No DATABASE_URL is configured in local or production environment.")
        print("To complete cloud migration:")
        print("1. Provision a PostgreSQL database (e.g. Neon, Supabase, AWS RDS).")
        print("2. Set DATABASE_URL in Vercel environment variables & local .env.")
        print("3. Execute: python scripts/cloud_db_migration.py --migrate")
    else:
        print(f"\n[DETECTED] DATABASE_URL is set: {mask_database_url(db_url)}. Safe to run --migrate when ready.")
    print("=" * 70)

def main():
    parser = argparse.ArgumentParser(description="USMAN AI GTM Database Persistence & Migration")
    parser.add_argument("--status", action="store_true", help="Display current persistence mode and record counts")
    parser.add_argument("--export-ddl", type=str, help="Export PostgreSQL-compatible DDL schema to file")
    parser.add_argument("--dry-run", action="store_true", help="Perform pre-migration validation without changes")
    parser.add_argument("--test-connection", action="store_true", help="Test cloud PostgreSQL connection")
    parser.add_argument("--migrate", action="store_true", help="Execute cloud migration if DATABASE_URL is set")
    
    args = parser.parse_args()
    
    if args.export_ddl:
        export_ddl(args.export_ddl)
    elif args.dry_run:
        dry_run()
    elif args.test_connection:
        test_connection()
    elif args.migrate:
        execute_migration()
    else:
        print_status()

if __name__ == "__main__":
    main()
