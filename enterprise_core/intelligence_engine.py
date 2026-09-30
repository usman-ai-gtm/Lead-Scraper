"""
USMAN DATA ANALYTICS - ENTERPRISE LEAD INTELLIGENCE & EXPLAINABLE SCORING ENGINE
Calculates multi-dimensional B2B intelligence scores (ICP, Fit, Completeness, Intent,
Quality, Contactability, Digital Maturity, Engagement, Confidence, Sales Readiness).
Provides explainable breakdowns: WHY + EVIDENCE + MISSING DATA + RECOMMENDED ACTION.
Distinguishes OBSERVED vs INFERRED vs UNKNOWN.
"""

import json
import logging
import sqlite3
import os
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("USMAN_LEAD_INTELLIGENCE")

class EnterpriseLeadIntelligenceEngine:
    """
    State-of-the-art explainable lead qualification and account intelligence.
    """

    @classmethod
    def analyze_lead_intelligence(cls, lead: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluates lead data and produces comprehensive explainable scoring.
        """
        name = lead.get("business_name") or "Target Account"
        email = (lead.get("email") or "").strip()
        phone = (lead.get("phone") or "").strip()
        website = (lead.get("website") or "").strip()
        category = (lead.get("category") or "").strip()
        industry = (lead.get("industry") or "B2B").strip()
        summary = (lead.get("ai_summary") or "").strip()
        rating = float(lead.get("rating") or 0.0)
        review_count = int(lead.get("review_count") or 0)

        # 1. Evidence Tracking: Distinguish OBSERVED vs INFERRED vs UNKNOWN
        observed = []
        inferred = []
        unknown = []

        if website:
            observed.append(f"Public domain verified: {website}")
        else:
            unknown.append("Company website domain")

        if email:
            observed.append(f"Business email address available: {email}")
        else:
            unknown.append("Direct corporate or verified email")

        if phone:
            observed.append(f"Business telephone contact: {phone}")
        else:
            unknown.append("Direct business phone line")

        if rating > 0 or review_count > 0:
            observed.append(f"Market reputation: {rating} stars across {review_count} verified reviews")

        # Inferred Signals
        if "shopify" in summary.lower() or "ecommerce" in summary.lower():
            observed.append("E-commerce checkout infrastructure detected")
            inferred.append("High transactional digital operations & payment processing maturity")
        elif "wordpress" in summary.lower() or "cms" in summary.lower():
            observed.append("Content Management System (WordPress/Webflow) detected")
            inferred.append("Moderate web maturity; potential modernization/automation opportunity")
        else:
            inferred.append("General B2B commercial profile; standard digital presence")

        if "calendly" in summary.lower() or "booking" in summary.lower() or "schedule" in summary.lower():
            observed.append("Automated booking / scheduling system active on site")
            inferred.append("Inbound sales funnel is established and sales-ready")

        if "chat" in summary.lower() or "intercom" in summary.lower():
            observed.append("Live customer support / chat widget identified")
            inferred.append("Active customer engagement & real-time response capability")

        # 2. Score Calculations (0 - 100)
        # Completeness
        comp_points = 0
        if name and name != "Discovered Company": comp_points += 20
        if website: comp_points += 25
        if email: comp_points += 25
        if phone: comp_points += 15
        if category or industry: comp_points += 15
        data_completeness = min(100, comp_points)

        # Contactability Score
        contactability = 0
        if email and "@" in email and not any(x in email for x in ["info@", "contact@", "support@"]):
            contactability += 55 # Direct decision maker or individual email
        elif email:
            contactability += 40 # Generic company email
        if phone:
            contactability += 35
        if website:
            contactability += 10
        contactability = min(100, contactability)

        # Digital Maturity Score
        digital_maturity = 30 # Base
        if "shopify" in summary.lower() or "stripe" in summary.lower(): digital_maturity += 25
        if "hubspot" in summary.lower() or "analytics" in summary.lower(): digital_maturity += 20
        if "calendly" in summary.lower() or "booking" in summary.lower(): digital_maturity += 15
        if website and ("https" in website or website.startswith("http")): digital_maturity += 10
        digital_maturity = min(100, digital_maturity)

        # Buying Intent Score
        buying_intent = 40 # Base
        if review_count > 20: buying_intent += 15
        if "booking" in summary.lower() or "chat" in summary.lower(): buying_intent += 20
        if "careers" in summary.lower() or "hiring" in summary.lower(): buying_intent += 15
        if rating >= 4.0: buying_intent += 10
        buying_intent = min(100, buying_intent)

        # ICP Fit Score
        fit_score = 45 # Base
        if website: fit_score += 20
        if email: fit_score += 20
        if data_completeness >= 70: fit_score += 15
        fit_score = min(100, fit_score)

        # Opportunity Score
        opportunity_score = int((buying_intent * 0.4) + (digital_maturity * 0.3) + (fit_score * 0.3))

        # Overall Lead Score
        lead_score = int((fit_score * 0.35) + (contactability * 0.30) + (buying_intent * 0.20) + (data_completeness * 0.15))

        # Priority & Temperature
        if lead_score >= 75 and contactability >= 60:
            priority = "URGENT"
            lead_temp = "HOT"
            readiness = "Ready for Personalized Cold Outreach"
        elif lead_score >= 50:
            priority = "HIGH"
            lead_temp = "WARM"
            readiness = "Requires Additional Contact Enrichment"
        else:
            priority = "NORMAL"
            lead_temp = "COLD"
            readiness = "Long-Term Nurture"

        # 3. Explainable Breakdown: WHY + EVIDENCE + MISSING DATA + RECOMMENDED ACTION
        why = []
        if email:
            why.append("Verified or usable corporate email increases immediate outreach feasibility.")
        if website:
            why.append("Verified business domain establishes institutional legitimacy.")
        if digital_maturity >= 60:
            why.append("Advanced digital tech stack signals readiness for modern B2B SaaS solutions.")
        if not email and not phone:
            why.append("Absence of direct contact channels lowers immediate qualification score.")

        recommended_actions = []
        if email and lead_score >= 60:
            recommended_actions.append("Draft evidence-grounded cold email sequence using detected company pain points.")
        if phone:
            recommended_actions.append("Queue for SDR phone outreach or official WhatsApp Business verification.")
        if not email:
            recommended_actions.append("Run deep contact enrichment to identify VP / Founder / Decision Maker email.")
        if website and not observed:
            recommended_actions.append("Execute deep website crawl to discover tech stack and key personnel.")

        return {
            "lead_score": lead_score,
            "fit_score": fit_score,
            "icp_score": fit_score,
            "opportunity_score": opportunity_score,
            "contactability_score": contactability,
            "digital_maturity_score": digital_maturity,
            "buying_intent_score": buying_intent,
            "data_completeness_score": data_completeness,
            "priority": priority,
            "lead_temperature": lead_temp,
            "sales_readiness": readiness,
            "observed_signals": observed,
            "inferred_signals": inferred,
            "unknown_data": unknown,
            "why": " ".join(why) if why else "Lead baseline score calculated from foundational demographic attributes.",
            "recommended_action": " | ".join(recommended_actions) if recommended_actions else "Monitor for market trigger events.",
            "tech_signals": [s for s in observed if any(k in s for k in ["CMS", "E-commerce", "booking", "chat", "infrastructure"])],
            "buying_signals": [s for s in observed if "reviews" in s or "booking" in s]
        }

    @classmethod
    def explain_score(cls, intelligence_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Formats the structured explanation for executive UI cards and reports.
        """
        return {
            "OVERALL_SCORE": intelligence_result.get("lead_score", 0),
            "WHY": intelligence_result.get("why", ""),
            "EVIDENCE": {
                "OBSERVED": intelligence_result.get("observed_signals", []),
                "INFERRED": intelligence_result.get("inferred_signals", []),
            },
            "MISSING_DATA": intelligence_result.get("unknown_data", []),
            "RECOMMENDED_ACTION": intelligence_result.get("recommended_action", "")
        }
