import sqlite3
import os
import re

db_path = "LUXURY DASHBOARD/usman_data_analytics.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("Applying additive migrations to:", db_path)

# 1. Search Records table
cur.execute('''
    CREATE TABLE IF NOT EXISTS search_records (
        id TEXT PRIMARY KEY,
        workspace_id INTEGER NOT NULL DEFAULT 1,
        user_id INTEGER NOT NULL DEFAULT 1,
        keyword TEXT NOT NULL,
        country TEXT NOT NULL,
        city TEXT DEFAULT '',
        sources TEXT NOT NULL,
        requested_quantity INTEGER NOT NULL,
        qualified_quantity INTEGER NOT NULL,
        leads_with_phone INTEGER NOT NULL DEFAULT 0,
        search_status TEXT NOT NULL DEFAULT 'COMPLETED',
        search_date TEXT NOT NULL,
        search_time TEXT NOT NULL,
        completion_time TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
''')
cur.execute("CREATE INDEX IF NOT EXISTS idx_search_records_ws ON search_records(workspace_id)")
cur.execute("CREATE INDEX IF NOT EXISTS idx_search_records_date ON search_records(search_date)")

# 2. Search Record Leads link table
cur.execute('''
    CREATE TABLE IF NOT EXISTS search_record_leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        search_record_id TEXT NOT NULL,
        lead_id INTEGER NOT NULL,
        workspace_id INTEGER NOT NULL DEFAULT 1,
        lead_snapshot TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(search_record_id) REFERENCES search_records(id),
        FOREIGN KEY(lead_id) REFERENCES leads(id)
    )
''')
cur.execute("CREATE INDEX IF NOT EXISTS idx_srl_search_id ON search_record_leads(search_record_id)")
cur.execute("CREATE INDEX IF NOT EXISTS idx_srl_lead_id ON search_record_leads(lead_id)")
cur.execute("CREATE INDEX IF NOT EXISTS idx_srl_ws ON search_record_leads(workspace_id)")

# 3. Export History table
cur.execute('''
    CREATE TABLE IF NOT EXISTS export_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id INTEGER NOT NULL DEFAULT 1,
        user_id INTEGER NOT NULL DEFAULT 1,
        export_target TEXT NOT NULL,
        search_record_id TEXT,
        export_date_filter TEXT,
        format TEXT NOT NULL,
        record_count INTEGER NOT NULL,
        export_date TEXT NOT NULL,
        export_time TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
''')
cur.execute("CREATE INDEX IF NOT EXISTS idx_export_history_ws ON export_history(workspace_id)")

# 4. Additive columns to leads table
cur.execute("PRAGMA table_info(leads)")
existing_cols = {r[1] for r in cur.fetchall()}
additional_cols = [
    ("domain", "TEXT"),
    ("original_source_url", "TEXT"),
    ("email_source_url", "TEXT"),
    ("phone_source_url", "TEXT"),
    ("source_platform", "TEXT"),
    ("saved_date", "TEXT"),
    ("saved_time", "TEXT"),
    ("extraction_date", "TEXT"),
    ("extraction_time", "TEXT"),
]

for col, ctype in additional_cols:
    if col not in existing_cols:
        try:
            cur.execute(f'ALTER TABLE leads ADD COLUMN "{col}" {ctype}')
            print(f"Added column {col} to leads table.")
        except Exception as e:
            print(f"Column {col} add notice: {e}")

conn.commit()
conn.close()
print("Migration completed successfully.")
