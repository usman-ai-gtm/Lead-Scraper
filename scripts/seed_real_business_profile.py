import sqlite3
from datetime import datetime, timezone

db_path = "d:/DATA D/LUXURY DASHBOARD/usman_data_analytics.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

now_iso = datetime.now(timezone.utc).isoformat()

profile_data = {
    "business_name": "USMAN DATA ANALYTICS & REVENUE OPS",
    "offering": "Excel automation, custom interactive Excel dashboards, Power BI executive dashboards, data cleaning & restructuring, automated business reporting, market research, and supervised B2B lead generation.",
    "website": "https://usmanai.com",
    "target_industries": "Healthcare, Dental Clinics, Real Estate, E-Commerce, Digital Marketing Agencies, B2B Consulting, Logistics",
    "target_company_sizes": "1-10, 11-50, 51-200",
    "target_locations": "Pakistan, UAE, Saudi Arabia, UK, USA, Global",
    "target_roles": "Founder, Managing Director, Practice Owner, Operations Manager, Marketing Director, Head of Sales",
    "problems_solved": "Eliminating manual spreadsheet errors, saving 15+ hours weekly on repetitive reporting, consolidating disconnected CSV/Excel exports into one live visual dashboard, cleaning lead lists.",
    "excluded_industries": "Adult, Gambling, Unregulated Crypto, Multi-level Marketing",
    "additional_instructions": "Focus on tangible time savings, accuracy, and clear business dashboards. Offer an introductory audit or sample dashboard to build trust."
}

# Seed for workspaces 1 and any other existing workspaces
cur.execute("SELECT id FROM workspaces")
ws_ids = [r[0] for r in cur.fetchall()]
if not ws_ids:
    ws_ids = [1]

for wid in ws_ids:
    cur.execute('''
        INSERT INTO ideal_customer_profiles (
            workspace_id, business_name, offering, website, target_industries,
            target_company_sizes, target_locations, target_roles, problems_solved,
            excluded_industries, additional_instructions, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id) DO UPDATE SET
            business_name=excluded.business_name,
            offering=excluded.offering,
            website=excluded.website,
            target_industries=excluded.target_industries,
            target_company_sizes=excluded.target_company_sizes,
            target_locations=excluded.target_locations,
            target_roles=excluded.target_roles,
            problems_solved=excluded.problems_solved,
            excluded_industries=excluded.excluded_industries,
            additional_instructions=excluded.additional_instructions,
            updated_at=excluded.updated_at
    ''', (
        wid,
        profile_data["business_name"],
        profile_data["offering"],
        profile_data["website"],
        profile_data["target_industries"],
        profile_data["target_company_sizes"],
        profile_data["target_locations"],
        profile_data["target_roles"],
        profile_data["problems_solved"],
        profile_data["excluded_industries"],
        profile_data["additional_instructions"],
        now_iso
    ))

conn.commit()
print(f"SUCCESS: Seeded verified business profile for workspaces: {ws_ids}")
conn.close()
