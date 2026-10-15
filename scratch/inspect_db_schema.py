import sqlite3
import os

db_path = r'D:\DATA D\LUXURY DASHBOARD\usman_data_analytics.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
tables = [r[0] for r in cur.fetchall()]
print(f"Total tables in usman_data_analytics.db: {len(tables)}\n")

for t in tables:
    cur.execute(f'PRAGMA table_info("{t}");')
    cols = cur.fetchall()
    try:
        cur.execute(f'SELECT COUNT(*) FROM "{t}";')
        cnt = cur.fetchone()[0]
    except Exception as e:
        cnt = f"ERR: {e}"
    col_summary = ', '.join([f'{c[1]} ({c[2]})' for c in cols[:4]])
    if len(cols) > 4:
        col_summary += f" ... +{len(cols)-4} more"
    print(f"{t:<35} | {str(cnt):<6} rows | {col_summary}")

conn.close()
