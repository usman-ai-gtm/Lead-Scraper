import sqlite3

for db_path in ["usman_data_analytics.db", "usman_luxury_engine.db"]:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("PRAGMA table_info(leads)")
    cols = [r[1] for r in c.fetchall()]
    print(f"{db_path} leads cols ({len(cols)}):", cols)
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='buying_intent_analysis'")
    has_intent = c.fetchone()
    print(f"{db_path} has buying_intent_analysis:", bool(has_intent))
    conn.close()
