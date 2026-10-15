"""
USMAN AI GTM - Cloud Database Adapter & Enterprise Migration Layer
Provides cloud persistence support (PostgreSQL / Supabase / Neon / Turso),
schema introspection, and dual-mode execution with local SQLite fallback.
"""

import os
import re
import sqlite3
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("USMAN_CLOUD_DB")

def get_database_url() -> Optional[str]:
    """Retrieve DATABASE_URL without logging or exposing credentials."""
    url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or os.getenv("SUPABASE_DB_URL")
    return url.strip() if url else None

def get_persistence_info() -> Dict[str, Any]:
    """
    Returns public metadata about current database persistence layer.
    Zero secrets or credentials are ever returned.
    """
    db_url = get_database_url()
    if db_url:
        is_pg = db_url.startswith("postgres://") or db_url.startswith("postgresql://")
        driver = "PostgreSQL (Cloud Hosted)" if is_pg else "External Cloud Database"
        return {
            "mode": "cloud_database",
            "driver": driver,
            "configured": True,
            "message": "Authoritative cloud database configured via DATABASE_URL."
        }
    else:
        return {
            "mode": "local_sqlite",
            "driver": "SQLite 3 (Local Embedded / Ephemeral in Serverless)",
            "configured": False,
            "message": "Running on local SQLite. In serverless deployments without DATABASE_URL, persistent multi-user data requires an external database connection."
        }

def inspect_sqlite_tables(sqlite_path: str) -> List[Dict[str, Any]]:
    """Inspects all tables and row counts in a SQLite database."""
    if not os.path.exists(sqlite_path):
        return []
    
    conn = sqlite3.connect(sqlite_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC")
    table_names = [r[0] for r in cur.fetchall()]
    
    tables_summary = []
    for name in table_names:
        try:
            # Safe parameterized identifier inspection
            if not re.match(r'^[a-zA-Z0-9_]+$', name):
                continue
            cur.execute(f'SELECT COUNT(*) FROM "{name}"')
            count = cur.fetchone()[0]
            tables_summary.append({"name": name, "rows": count})
        except Exception as e:
            tables_summary.append({"name": name, "rows": 0, "error": str(e)})
            
    conn.close()
    return tables_summary

def generate_postgres_ddl(sqlite_path: str, target_tables: Optional[List[str]] = None) -> str:
    """
    Generates PostgreSQL-compatible DDL schema statements from SQLite schema.
    Converts INTEGER PRIMARY KEY AUTOINCREMENT -> SERIAL PRIMARY KEY,
    DATETIME/TEXT date columns, etc.
    """
    if not os.path.exists(sqlite_path):
        return "-- SQLite database file not found"
        
    conn = sqlite3.connect(sqlite_path)
    cur = conn.cursor()
    cur.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    rows = cur.fetchall()
    conn.close()
    
    ddl_statements = [
        "-- ============================================================",
        "-- USMAN AI GTM - Cloud PostgreSQL Schema Export",
        "-- Auto-generated compatible schema for Supabase / Neon / RDS",
        "-- ============================================================",
        "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";",
        ""
    ]
    
    for tbl_name, create_sql in rows:
        if not create_sql:
            continue
        if target_tables and tbl_name not in target_tables:
            continue
            
        # Clean and adapt SQLite DDL to PostgreSQL
        pg_sql = create_sql
        # Handle AUTOINCREMENT
        pg_sql = re.sub(r'INTEGER PRIMARY KEY AUTOINCREMENT', 'SERIAL PRIMARY KEY', pg_sql, flags=re.IGNORECASE)
        # Handle AUTOINCREMENT without INTEGER PRIMARY KEY keyword variations
        pg_sql = re.sub(r'AUTOINCREMENT', '', pg_sql, flags=re.IGNORECASE)
        # Ensure IF NOT EXISTS is preserved
        if "IF NOT EXISTS" not in pg_sql.upper():
            pg_sql = re.sub(r'CREATE TABLE', 'CREATE TABLE IF NOT EXISTS', pg_sql, count=1, flags=re.IGNORECASE)
            
        ddl_statements.append(f"{pg_sql};\n")
        
    return "\n".join(ddl_statements)
