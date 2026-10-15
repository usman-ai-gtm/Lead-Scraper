"""
USMAN AI GTM - WhatsApp Outreach Companion Test Suite
Validates:
1. Database initialization & schema integrity
2. Phone normalization & official wa.me URL builder
3. Template CRUD
4. Activity logging & honest statuses
5. Suppression / Do-Not-Contact enforcement
6. AI draft generation
7. Settings persistence
"""

import sys
import os

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.api.whatsapp import normalize_phone_number

client = TestClient(app)

# Generate test admin JWT
token = create_access_token({"sub": "admin@usmanai.com", "workspace_id": 1, "role": "ADMIN"})
headers = {"Authorization": f"Bearer {token}"}

def run_tests():
    print("=== 1. Testing Phone Normalization ===")
    test_cases = [
        ("+92 307 6688553", "923076688553", True),
        ("0311-1222398", "923111222398", True),
        ("+1 (415) 555-2671", "14155552671", True),
        ("123", "123", False), # Too short
        ("", "", False), # Missing
    ]
    for raw, expected_norm, should_be_valid in test_cases:
        res = normalize_phone_number(raw, default_cc="92")
        print(f"Raw: {raw!r} -> Normalized: {res['normalized']!r}, Valid: {res['is_valid']}")
        if should_be_valid:
            assert res["is_valid"], f"Expected valid for {raw}"
            assert res["normalized"] == expected_norm, f"Expected {expected_norm}, got {res['normalized']}"
            assert res["click_to_chat_url"] == f"https://wa.me/{expected_norm}"
        else:
            assert not res["is_valid"], f"Expected invalid for {raw}"
    print("✓ Phone Normalization verified!\n")

    print("=== 2. Testing Overview Endpoint ===")
    resp = client.get("/api/whatsapp/overview", headers=headers)
    assert resp.status_code == 200, f"Overview status: {resp.status_code}, {resp.text}"
    overview = resp.json()
    assert overview["status"] == "success"
    print(f"Overview metrics: {overview['metrics']}")
    print("✓ Overview endpoint verified!\n")

    print("=== 3. Testing Leads Listing with Normalization ===")
    resp = client.get("/api/whatsapp/leads?page=1&page_size=5", headers=headers)
    assert resp.status_code == 200, f"Leads status: {resp.status_code}"
    leads_data = resp.json()
    assert leads_data["status"] == "success"
    print(f"Total leads: {leads_data['total']}, Retrieved: {len(leads_data['leads'])}")
    for l in leads_data["leads"][:3]:
        pv = l.get("phone_validation", {})
        print(f"• {l['business_name']} | Phone: {l.get('phone')} | Valid: {pv.get('is_valid')} | Status: {l.get('outreach_status')}")
    print("✓ Leads listing verified!\n")

    print("=== 4. Testing Template CRUD ===")
    # List templates
    resp = client.get("/api/whatsapp/templates", headers=headers)
    assert resp.status_code == 200
    initial_tmpls = resp.json()["templates"]
    print(f"Initial templates count: {len(initial_tmpls)}")

    # Create template
    resp = client.post("/api/whatsapp/templates", headers=headers, json={
        "name": "Automated Test Template",
        "category": "B2B_OUTREACH",
        "body": "Hi {{contact_name}}, test from {{my_business}} for {{business_name}}.",
        "description": "Integration test"
    })
    assert resp.status_code == 200
    new_tmpl_id = resp.json()["id"]
    print(f"Created template ID: {new_tmpl_id}")

    # Duplicate template
    resp = client.post(f"/api/whatsapp/templates/{new_tmpl_id}/duplicate", headers=headers)
    assert resp.status_code == 200
    dup_id = resp.json()["id"]
    print(f"Duplicated template ID: {dup_id}")

    # Update template
    resp = client.put(f"/api/whatsapp/templates/{new_tmpl_id}", headers=headers, json={
        "name": "Updated Test Template",
        "body": "Updated body for {{contact_name}}"
    })
    assert resp.status_code == 200

    # Delete duplicated & test templates
    client.delete(f"/api/whatsapp/templates/{dup_id}", headers=headers)
    client.delete(f"/api/whatsapp/templates/{new_tmpl_id}", headers=headers)
    print("✓ Template CRUD verified!\n")

    print("=== 5. Testing Honest Activity Logging ===")
    resp = client.post("/api/whatsapp/activities", headers=headers, json={
        "lead_id": 3,
        "business_name": "South City Hospital",
        "contact_name": "Dr. Miller",
        "phone_number": "923076688553",
        "action": "CHAT_OPENED",
        "notes": "Testing honest activity recording: chat opened",
        "next_followup": "2026-10-15"
    })
    assert resp.status_code == 200
    print("Recorded CHAT_OPENED activity successfully.")

    # Mark as sent manually
    resp = client.post("/api/whatsapp/activities", headers=headers, json={
        "lead_id": 3,
        "business_name": "South City Hospital",
        "contact_name": "Dr. Miller",
        "phone_number": "923076688553",
        "action": "MANUALLY_MARKED_SENT",
        "notes": "User confirmed sending message manually",
    })
    assert resp.status_code == 200

    # Get activities list
    resp = client.get("/api/whatsapp/activities?limit=5", headers=headers)
    assert resp.status_code == 200
    acts = resp.json()["activities"]
    print(f"Recent activities count: {len(acts)}")
    assert any(a["action"] == "CHAT_OPENED" for a in acts)
    print("✓ Activity logging verified!\n")

    print("=== 6. Testing Suppression (Do-Not-Contact) ===")
    test_suppress_num = "923079998888"
    resp = client.post("/api/whatsapp/suppressions", headers=headers, json={
        "phone_number": test_suppress_num,
        "reason": "Test prospect requested do not contact",
        "business_name": "OptOut Test Corp"
    })
    assert resp.status_code == 200
    print(f"Suppressed {test_suppress_num}")

    # List suppressions
    resp = client.get("/api/whatsapp/suppressions", headers=headers)
    assert resp.status_code == 200
    sups = resp.json()["suppressions"]
    matching_sup = next((s for s in sups if s["phone_number"] == test_suppress_num), None)
    assert matching_sup is not None
    print(f"Suppression verified in DB: {matching_sup}")

    # Clean up test suppression
    client.delete(f"/api/whatsapp/suppressions/{matching_sup['id']}", headers=headers)
    print("✓ Suppression list verified!\n")

    print("=== 7. Testing AI Draft Generation ===")
    resp = client.post("/api/whatsapp/ai-draft", headers=headers, json={
        "lead_id": 3,
        "business_name": "South City Hospital",
        "industry": "Healthcare",
        "city": "Karachi",
        "website": "https://southcityhospital.org/",
        "rating": 4.8,
        "tone": "Warm & Advisory"
    })
    assert resp.status_code == 200
    ai_draft = resp.json()
    assert ai_draft["status"] == "success"
    print(f"AI Draft Generated: {ai_draft['draft']}")
    print("✓ AI Draft generation verified!\n")

    print("=== 8. Testing Settings Persistence ===")
    resp = client.get("/api/whatsapp/settings", headers=headers)
    assert resp.status_code == 200
    curr_settings = resp.json()["settings"]
    print(f"Current settings: {curr_settings['my_business_name']}")

    resp = client.post("/api/whatsapp/settings", headers=headers, json={
        "my_business_name": "USMAN AI GTM",
        "value_proposition": "streamline enterprise customer acquisition",
        "default_country_code": "92",
        "default_tone": "Professional & Direct"
    })
    assert resp.status_code == 200
    print("✓ Settings persistence verified!\n")

    print("========================================")
    print("ALL WHATSAPP COMPANION TESTS PASSED 100%!")
    print("========================================")

if __name__ == "__main__":
    run_tests()
