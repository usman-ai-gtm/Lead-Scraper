import sqlite3

for db_name in ["usman_data_analytics.db", "usman_luxury_engine.db"]:
    conn = sqlite3.connect(db_name)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(leads)")
    cols = {r[1] for r in cur.fetchall()}
    if "priority" not in cols:
        print(f"Adding priority to {db_name}")
        cur.execute("ALTER TABLE leads ADD COLUMN priority TEXT DEFAULT 'NORMAL'")
        conn.commit()
    conn.close()
print("Done checking priority column.")

