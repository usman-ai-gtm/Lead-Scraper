import sqlite3
import os

databases = ["usman_data_analytics.db", "usman_luxury_engine.db"]

for db in databases:
    if not os.path.exists(db):
        print(f"Skipping non-existent db: {db}")
        continue
    
    print(f"\n--- Checking & Updating Schema for: {db} ---")
    conn = sqlite3.connect(db)
    cur = conn.cursor()
    
    # Check users table columns
    cur.execute("PRAGMA table_info(users);")
    existing_cols = [row[1] for row in cur.fetchall()]
    print(f"Existing columns in users: {len(existing_cols)}")
    
    if "must_change_password" not in existing_cols:
        print("Adding column 'must_change_password' (INTEGER DEFAULT 0)...")
        cur.execute("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0;")
    else:
        print("Column 'must_change_password' already exists.")
        
    if "created_by" not in existing_cols:
        print("Adding column 'created_by' (INTEGER DEFAULT 1)...")
        cur.execute("ALTER TABLE users ADD COLUMN created_by INTEGER DEFAULT 1;")
    else:
        print("Column 'created_by' already exists.")
        
    if "client_notes" not in existing_cols:
        print("Adding column 'client_notes' (TEXT DEFAULT '')...")
        cur.execute("ALTER TABLE users ADD COLUMN client_notes TEXT DEFAULT '';")
    else:
        print("Column 'client_notes' already exists.")

    if "max_leads_quota" not in existing_cols:
        print("Adding column 'max_leads_quota' (INTEGER DEFAULT 5000)...")
        cur.execute("ALTER TABLE users ADD COLUMN max_leads_quota INTEGER DEFAULT 5000;")
    else:
        print("Column 'max_leads_quota' already exists.")
        
    # Create client_provisioning_log table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS client_provisioning_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            admin_id INTEGER,
            action TEXT,
            details TEXT,
            timestamp TEXT
        );
    ''')
    
    conn.commit()
    conn.close()
    print(f"Successfully verified & aligned schema for {db}")

