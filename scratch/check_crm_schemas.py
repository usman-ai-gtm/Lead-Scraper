import sqlite3

conn = sqlite3.connect('usman_data_analytics.db')
cur = conn.cursor()
for row in cur.execute("SELECT name, sql FROM sqlite_master WHERE name LIKE 'crm_%' OR name = 'ideal_customer_profiles'"):
    print(f"--- {row[0]} ---")
    print(row[1])
    print()
