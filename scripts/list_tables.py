import sqlite3

for db_name in ['usman_data_analytics.db', 'ultra_outreach_401_500.db', 'usman_luxury_engine.db']:
    try:
        conn = sqlite3.connect(db_name)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cur.fetchall()]
        print(f"\nTables in {db_name}:")
        for t in sorted(tables):
            cur.execute(f"PRAGMA table_info({t})")
            cols = [f"{c[1]} ({c[2]})" for c in cur.fetchall()]
            print(f"  - {t}: {', '.join(cols[:5])}...")
        conn.close()
    except Exception as e:
        print(f"Error {db_name}: {e}")
