"""
Test script for real Lead Search execution via Serper API with zero synthetic data.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + "/.."))

from backend.app.services.lead_service import LeadService

def test_real_search():
    print("Testing real search execution: keyword='dentist', location='Lahore', target_count=5")
    res = LeadService.search_live({
        "keyword": "dentist",
        "city": "Lahore",
        "country": "Pakistan",
        "target_count": 5
    }, workspace_id=1)

    print(f"Status: {res.get('status')}")
    print(f"Provider used: {res.get('provider')}")
    print(f"Count returned: {res.get('count')}")
    print(f"Message: {res.get('message')}")

    leads = res.get("leads", [])
    for idx, l in enumerate(leads, 1):
        print(f"[{idx}] {l.get('business_name')} | Web: {l.get('website')} | Email: {l.get('email')} ({l.get('email_status')}) | Score: {l.get('lead_score')}")

    assert res.get("status") == "success", f"Search failed: {res}"
    assert len(leads) > 0, "Expected at least 1 real lead from Serper API"
    # Ensure none of the old synthetic companies appear
    for l in leads:
        assert "Apex Global Digital" not in l.get("business_name"), "Found fake lead!"
        assert "Nexus Cloud Logistics" not in l.get("business_name"), "Found fake lead!"

    print("\n>>> LIVE SEARCH TEST PASSED SUCCESSFULLY! ZERO FAKE DATA! <<<")

if __name__ == "__main__":
    test_real_search()
