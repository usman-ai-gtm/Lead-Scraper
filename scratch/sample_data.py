import sqlite3

conn = sqlite3.connect('usman_data_analytics.db')
cur = conn.cursor()
for table in ['leads', 'whatsapp_templates', 'whatsapp_suppressions', 'whatsapp_contacts', 'whatsapp_messages', 'ideal_customer_profiles', 'consent_records']:
    cur.execute(f"SELECT COUNT(*) FROM {table}")
    count = cur.fetchone()[0]
    print(f"{table}: {count} rows")

cur.execute("SELECT id, business_name, phone, country, website FROM leads WHERE phone IS NOT NULL AND phone != '' LIMIT 5")
print("\nSample leads with phone:")
for row in cur.fetchall():
    print(row)
