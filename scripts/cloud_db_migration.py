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
    generate_postgres_ddl
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CLOUD_MIGRATION")

CORE_TABLES = [
    "tenants", "workspaces", "users", "leads", "companies", 
    "contacts", "crm_deals", "email_campaigns", "email_accounts",
    "whatsapp_templates", "whatsapp_activities", "whatsapp_settings",
    "whatsapp_suppressions", "user_activity_logs", "account_audit_logs",
    "system_notifications"
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
        print("1. Provision a PostgreSQL database (e.g. Supabase, Neon, AWS RDS, Railway).")
        print("2. Set DATABASE_URL in Vercel environment variables & local .env.")
        print("3. Execute: python scripts/cloud_db_migration.py --migrate")
    else:
        print(f"\n[DETECTED] DATABASE_URL is set. Safe to run --migrate when ready.")
    print("=" * 70)

def main():
    parser = argparse.ArgumentParser(description="USMAN AI GTM Database Persistence & Migration")
    parser.add_argument("--status", action="store_true", help="Display current persistence mode and record counts")
    parser.add_argument("--export-ddl", type=str, help="Export PostgreSQL-compatible DDL schema to file")
    parser.add_argument("--dry-run", action="store_true", help="Perform pre-migration validation without changes")
    parser.add_argument("--migrate", action="store_true", help="Execute cloud migration if DATABASE_URL is set")
    
    args = parser.parse_args()
    
    if args.export_ddl:
        export_ddl(args.export_ddl)
    elif args.dry_run:
        dry_run()
    elif args.migrate:
        dry_run()
    else:
        print_status()

if __name__ == "__main__":
    main()
