import sqlite3

conn = sqlite3.connect('usman_data_analytics.db')
cur = conn.cursor()
for row in cur.execute("SELECT name, sql FROM sqlite_master WHERE name LIKE 'whatsapp%' OR name = 'consent_records' OR name = 'leads'"):
    print(f"--- {row[0]} ---")
    print(row[1])
    print()
