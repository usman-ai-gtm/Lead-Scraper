import sqlite3

conn = sqlite3.connect("d:/DATA D/LUXURY DASHBOARD/usman_data_analytics.db")
conn.row_factory = sqlite3.Row
rows = conn.execute("SELECT id, workspace_id, account_type, provider, display_name, external_identity, status, is_default, created_at FROM connected_accounts").fetchall()
print(f"Total connected accounts: {len(rows)}")
for r in rows:
    print(dict(r))
conn.close()
