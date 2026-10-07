import sqlite3

c = sqlite3.connect('usman_data_analytics.db')
tabs = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("Matching tables:", [t for t in tabs if 'camp' in t.lower() or 'deal' in t.lower() or 'lead' in t.lower()])
for t in ['crm_deals', 'campaigns', 'email_campaigns', 'leads']:
    if t in tabs:
        print(f"Table '{t}' exists. Rows: {c.execute(f'SELECT count(*) FROM {t}').fetchone()[0]}")
    else:
        print(f"Table '{t}' DOES NOT exist.")
c.close()
