import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from backend.app.services.lead_service import LeadService, LeadScoringEngine, BuyingIntentEngine
from backend.app.services.universal_features_service import UniversalFeatureExecutor

def test_step1():
    print("=== TEST 1: LeadScoringEngine multi-score calculation ===")
    sample_lead = {
        "business_name": "Apex Luxury Real Estate",
        "website": "https://apexluxury.ae",
        "email": "info@apexluxury.ae",
        "phone": "+97141234567",
        "industry": "Real Estate",
        "city": "Dubai",
        "country": "United Arab Emirates",
        "ai_summary": "Premier luxury property agency offering high-end residential sales, penthouses, and portfolio management in Dubai Downtown.",
        "source": "Google/Maps"
    }
    score_res = LeadScoringEngine.calculate_lead_score(sample_lead)
    print("ICP Fit:", score_res["icp_fit_score"])
    print("Data Conf:", score_res["data_confidence_score"])
    print("Opportunity:", score_res["business_opportunity_score"])
    print("Buying Potential:", score_res["buying_potential_score"])
    print("Final Score:", score_res["final_lead_score"])
    print("Qualification:", score_res["qualification_level"])
    print("Priority:", score_res["priority"])
    print("Positive Signals:", score_res["positive_signals"])
    assert score_res["final_lead_score"] > 60
    assert "Verified active website" in score_res["positive_signals"]

    print("\n=== TEST 2: LeadService.calculate_score on existing lead ===")
    lead_score_res = LeadService.calculate_score(1)
    print("Lead #1 scored:", lead_score_res)
    assert "final_lead_score" in lead_score_res
    assert "qualification_level" in lead_score_res

    print("\n=== TEST 3: BuyingIntentEngine & LeadService.analyze_buying_intent ===")
    intent_res = LeadService.analyze_buying_intent(1, target_service="Marketing / Lead Generation")
    print("Intent result success:", intent_res.get("success"))
    print("Intent Score:", intent_res.get("synthesis", {}).get("buying_intent_score"))
    print("Intent Level:", intent_res.get("synthesis", {}).get("buying_intent_level"))
    print("Categories:", intent_res.get("synthesis", {}).get("intent_categories"))
    assert intent_res.get("success") is True
    assert intent_res.get("synthesis", {}).get("buying_intent_score") > 0

    print("\n=== TEST 4: LeadService.generate_ai_strategy ===")
    strat = LeadService.generate_ai_strategy("Find high-end real estate agencies in Dubai who need digital marketing and CRM automation")
    print("Strategy Country:", strat.get("country"))
    print("Strategy City:", strat.get("city"))
    print("Strategy Platforms:", strat.get("recommended_platforms"))
    print("Strategy Services:", strat.get("target_services"))
    print("Strategy Query:", strat.get("suggested_keyword"))
    assert strat.get("country") == "United Arab Emirates"
    assert strat.get("city") == "Dubai"
    assert "Marketing / Lead Generation" in strat.get("target_services")

    print("\n=== TEST 5: UniversalFeatureExecutor on Features 18-25 ===")
    for fid in range(18, 26):
        res = UniversalFeatureExecutor.execute(fid, lead_id=1)
        print(f"Feature #{fid} status: {res.get('status')} - summary: {res.get('summary')}")
        assert res.get("status") == "ready"

    print("\n>>> ALL STEP 1 BACKEND INTELLIGENCE TESTS PASSED! <<<")

if __name__ == "__main__":
    test_step1()
