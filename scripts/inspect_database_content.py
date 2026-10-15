import sqlite3

db_path = "d:/DATA D/LUXURY DASHBOARD/usman_data_analytics.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

print(f"=== INSPECTING DATABASE: {db_path} ===")
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
print(f"Total tables: {len(tables)}")

for t in tables:
    t_name = t["name"]
    if t_name == "sqlite_sequence":
        continue
    try:
        count = conn.execute(f"SELECT COUNT(*) as c FROM \"{t_name}\"").fetchone()["c"]
        print(f"  - {t_name}: {count} records")
    except Exception as e:
        print(f"  - {t_name}: error reading ({e})")

print("\nSample 3 leads from 'leads' table:")
try:
    leads = conn.execute("SELECT id, business_name, email, phone, website, city, country, lead_score, crm_stage FROM leads LIMIT 3").fetchall()
    for l in leads:
        print("   ", dict(l))
except Exception as e:
    print("   Error reading leads:", e)

conn.close()
