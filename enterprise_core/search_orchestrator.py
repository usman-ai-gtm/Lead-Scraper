"""
USMAN DATA ANALYTICS - ULTRA PRO MAX LEAD SEARCH ORCHESTRATION ENGINE
Multi-source discovery, 12 search modes, query expansion intelligence, parallel execution,
deep website intelligence extraction, composite deduplication, and evidence collection.
"""

import os
import re
import json
import time
import socket
import logging
import requests
import sqlite3
from typing import List, Dict, Any, Optional
from datetime import datetime
from urllib.parse import urlparse, urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed
from bs4 import BeautifulSoup

logger = logging.getLogger("USMAN_SEARCH_ORCHESTRATOR")

SEARCH_MODES = [
    "Standard Search",
    "Deep Search",
    "Ultra Search",
    "Enterprise Search",
    "Precision Search",
    "Discovery Search",
    "Competitor Search",
    "Buyer Intent Search",
    "Website Gap Search",
    "Contact Discovery Search",
    "Local Market Search",
    "Global Search"
]

PLATFORMS_MAP = {
    "All Platforms": ["Google", "LinkedIn", "Facebook", "Instagram", "Reddit", "Directories"],
    "Google / Web Search": ["Google"],
    "LinkedIn Company / B2B": ["LinkedIn"],
    "Facebook Business Pages": ["Facebook"],
    "Instagram Business Profiles": ["Instagram"],
    "Reddit B2B Discussions": ["Reddit"],
    "B2B Directories (Clutch/YellowPages/Yelp)": ["Directories"]
}

class QueryIntelligenceEngine:
    """
    Expands queries with synonyms, buyer intent, geo-modifiers, and pain-point signals.
    """
    SYNONYMS = {
        "agency": ["consultancy", "firm", "studio", "services", "partners"],
        "software": ["saas", "tech", "platform", "cloud", "solutions"],
        "marketing": ["digital marketing", "growth", "performance marketing", "advertising", "seo"],
        "real estate": ["realtors", "property management", "brokerage", "commercial real estate"],
        "logistics": ["freight", "supply chain", "warehousing", "shipping", "3pl"],
        "healthcare": ["clinic", "medical center", "health systems", "wellness", "practice"],
        "legal": ["law firm", "attorneys", "solicitors", "counsel", "legal services"],
        "finance": ["wealth management", "advisory", "accounting", "cpa", "fintech"]
    }

    INTENT_KEYWORDS = [
        "top", "best", "leading", "specialist", "enterprise", "pricing", 
        "hire", "book", "reviews", "solutions for", "services"
    ]

    PAIN_POINTS = [
        "automation", "cost reduction", "pipeline growth", "retention", 
        "security compliance", "cloud migration", "scaling"
    ]

    @classmethod
    def expand_query(cls, keyword: str, location: str, mode: str, platform: str = "All Platforms") -> List[Dict[str, str]]:
        queries = []
        clean_kw = keyword.strip()
        clean_loc = location.strip()

        # Base query
        base = f"{clean_kw} {clean_loc}".strip()
        queries.append({"query": base, "type": "Primary", "source": "Google"})

        # Mode-specific expansion
        if mode in ["Deep Search", "Ultra Search", "Enterprise Search", "Discovery Search"]:
            # Synonyms expansion
            for key, syns in cls.SYNONYMS.items():
                if key in clean_kw.lower():
                    for syn in syns[:2]:
                        expanded = f"{clean_kw.lower().replace(key, syn)} {clean_loc}".strip()
                        queries.append({"query": expanded, "type": "Synonym", "source": "Google"})

            # Intent expansion
            queries.append({"query": f"best {clean_kw} in {clean_loc}".strip(), "type": "Buyer Intent", "source": "Google"})
            queries.append({"query": f"{clean_kw} services companies {clean_loc}".strip(), "type": "Commercial Intent", "source": "Google"})

        if mode in ["Competitor Search", "Enterprise Search"]:
            queries.append({"query": f"competitors of {clean_kw} {clean_loc}".strip(), "type": "Competitor", "source": "Google"})
            queries.append({"query": f"alternatives to {clean_kw} {clean_loc}".strip(), "type": "Alternative", "source": "Google"})

        if mode in ["Contact Discovery Search", "Precision Search", "Ultra Search"]:
            queries.append({"query": f'site:linkedin.com/company "{clean_kw}" "{clean_loc}"'.strip(), "type": "LinkedIn Discovery", "source": "LinkedIn"})
            queries.append({"query": f'"{clean_kw}" "{clean_loc}" "contact us" OR "email" OR "phone"'.strip(), "type": "Contact Extraction", "source": "Google"})

        if mode in ["Website Gap Search"]:
            queries.append({"query": f'"{clean_kw}" "{clean_loc}" "careers" OR "pricing"'.strip(), "type": "Website Deep Scan", "source": "Google"})

        # Platform specific queries
        if platform == "LinkedIn Company / B2B" or platform == "All Platforms":
            queries.append({"query": f'site:linkedin.com/company "{clean_kw}" {clean_loc}'.strip(), "type": "LinkedIn", "source": "LinkedIn"})
        if platform == "Facebook Business Pages" or platform == "All Platforms":
            queries.append({"query": f'site:facebook.com "{clean_kw}" {clean_loc} "business"'.strip(), "type": "Facebook", "source": "Facebook"})
        if platform == "Instagram Business Profiles" or platform == "All Platforms":
            queries.append({"query": f'site:instagram.com "{clean_kw}" {clean_loc}'.strip(), "type": "Instagram", "source": "Instagram"})
        if platform == "Reddit B2B Discussions" or platform == "All Platforms":
            queries.append({"query": f'site:reddit.com "{clean_kw}" recommended OR review {clean_loc}'.strip(), "type": "Reddit", "source": "Reddit"})

        # Deduplicate queries by query string
        seen = set()
        deduped = []
        for q in queries:
            if q["query"].lower() not in seen and len(q["query"].strip()) > 2:
                seen.add(q["query"].lower())
                deduped.append(q)

        return deduped[:12] # Limit to max 12 intelligent queries per run

class DeepWebsiteIntelligence:
    """
    Scrapes authorized public pages to discover contact information,
    CMS, analytics stack, ecommerce platforms, and corporate signals.
    """
    TECH_SIGNATURES = {
        "Shopify": ["cdn.shopify.com", "myshopify.com"],
        "WordPress": ["wp-content", "wp-includes", "wordpress"],
        "Webflow": ["webflow.js", "assets.website-files.com"],
        "HubSpot": ["js.hs-scripts.com", "hubspot.com"],
        "Google Analytics": ["google-analytics.com", "gtag.js", "analytics.google.com"],
        "Meta Pixel": ["connect.facebook.net/en_US/fbevents.js", "fbevents.js"],
        "Stripe": ["js.stripe.com"],
        "Intercom": ["widget.intercom.io"],
        "Zendesk": ["static.zdassets.com"],
        "Drift": ["js.driftt.com"],
        "Calendly": ["calendly.com/assets"]
    }

    @classmethod
    def analyze_domain(cls, url: str, timeout: int = 10) -> Dict[str, Any]:
        if not url:
            return {}
        if not url.startswith("http"):
            url = f"https://{url}"

        result = {
            "url": url,
            "domain": urlparse(url).netloc,
            "status": "Unknown",
            "emails_found": [],
            "phones_found": [],
            "social_links": {},
            "tech_stack": [],
            "cms": "Custom/Unknown",
            "has_booking": False,
            "has_chat": False,
            "evidence_snippets": [],
            "page_title": ""
        }

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (UsmanB2BIntelligence)"
        }

        try:
            resp = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
            result["status"] = f"HTTP {resp.status_code}"
            if resp.status_code == 200:
                html = resp.text
                soup = BeautifulSoup(html, "html.parser")
                if soup.title:
                    result["page_title"] = soup.title.string.strip() if soup.title.string else ""

                # Extract valid corporate/business emails with proper alphabetic TLD
                email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,12}'
                raw_emails = set(re.findall(email_pattern, html))
                noise_substrings = [
                    '.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', 'wixpress', 'sentry', 'example',
                    'wght@', 'algolia', 'schema.org', 'wordpress', 'cdn', 'polyfill', 'license', 'github'
                ]
                clean_emails = [
                    e.strip().lower() for e in raw_emails 
                    if not any(x in e.lower() for x in noise_substrings) and '..' not in e and not e.split('@')[0].isdigit()
                ]
                result["emails_found"] = clean_emails[:5]

                # Extract phones
                phone_pattern = r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
                raw_phones = set(re.findall(phone_pattern, html))
                result["phones_found"] = list(raw_phones)[:4]

                # Social links
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    if 'linkedin.com' in href:
                        result["social_links"]["linkedin"] = href
                    elif 'twitter.com' in href or 'x.com' in href:
                        result["social_links"]["twitter"] = href
                    elif 'facebook.com' in href:
                        result["social_links"]["facebook"] = href
                    elif 'instagram.com' in href:
                        result["social_links"]["instagram"] = href
                    elif 'youtube.com' in href:
                        result["social_links"]["youtube"] = href

                # Detect Tech Stack
                lower_html = html.lower()
                detected_tech = []
                for tech, sigs in cls.TECH_SIGNATURES.items():
                    if any(sig in lower_html for sig in sigs):
                        detected_tech.append(tech)
                        if tech in ["Shopify", "WordPress", "Webflow"]:
                            result["cms"] = tech

                result["tech_stack"] = detected_tech
                result["has_booking"] = "Calendly" in detected_tech or "booking" in lower_html or "schedule" in lower_html
                result["has_chat"] = "Intercom" in detected_tech or "Drift" in detected_tech or "zendesk" in lower_html or "chat" in lower_html

                # Extract corporate description snippets
                meta_desc = soup.find('meta', attrs={'name': 'description'})
                if meta_desc and meta_desc.get('content'):
                    result["evidence_snippets"].append(meta_desc['content'].strip()[:200])

        except Exception as e:
            result["status"] = f"Error: {str(e)[:60]}"
            logger.warning(f"Domain analysis error on {url}: {e}")

        return result

class LeadDeduplicationOrchestrator:
    """
    Composite deduplication using normalized domain, email, phone, and business name.
    """
    @staticmethod
    def normalize_domain(url: Optional[str]) -> str:
        if not url:
            return ""
        clean = url.lower().strip()
        clean = re.sub(r'^https?://', '', clean)
        clean = re.sub(r'^www\.', '', clean)
        clean = clean.split('/')[0].split('?')[0]
        return clean

    @staticmethod
    def normalize_phone(phone: Optional[str]) -> str:
        if not phone:
            return ""
        return re.sub(r'\D', '', phone)

    @classmethod
    def is_duplicate(cls, lead: Dict[str, Any], existing_leads: List[Dict[str, Any]]) -> bool:
        domain = cls.normalize_domain(lead.get("website"))
        email = (lead.get("email") or "").lower().strip()
        phone = cls.normalize_phone(lead.get("phone"))
        name = (lead.get("business_name") or "").lower().strip()

        for ex in existing_leads:
            ex_domain = cls.normalize_domain(ex.get("website"))
            ex_email = (ex.get("email") or "").lower().strip()
            ex_phone = cls.normalize_phone(ex.get("phone"))
            ex_name = (ex.get("business_name") or "").lower().strip()

            if domain and ex_domain and domain == ex_domain:
                return True
            if email and ex_email and email == ex_email:
                return True
            if phone and len(phone) >= 9 and ex_phone and phone == ex_phone:
                return True
            if name and ex_name and len(name) > 4 and name == ex_name:
                return True
        return False

class EnterpriseSearchOrchestrator:
    """
    Unified Master Search Orchestration Engine.
    Executes multi-source queries concurrently, performs deep website intelligence,
    deduplicates leads, and persists results with confidence scores.
    """
    @classmethod
    def _execute_serper_query(cls, query: str, api_key: str, num: int = 10) -> List[Dict[str, Any]]:
        results = []
        if not api_key or api_key.startswith("your_"):
            return results

        url = "https://google.serper.dev/search"
        headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}
        payload = {"q": query, "num": num}
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=14)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("organic", []):
                    title = item.get("title", "")
                    link = item.get("link", "")
                    snippet = item.get("snippet", "")
                    results.append({
                        "business_name": title,
                        "website": link,
                        "snippet": snippet,
                        "source": "Serper / Google",
                        "confidence": 0.88
                    })
        except Exception as e:
            logger.error(f"Serper search error: {e}")
        return results

    @classmethod
    def _execute_serpapi_query(cls, query: str, api_key: str, num: int = 10) -> List[Dict[str, Any]]:
        results = []
        if not api_key or api_key.startswith("your_"):
            return results

        url = "https://serpapi.com/search.json"
        params = {"q": query, "api_key": api_key, "num": num, "engine": "google"}
        try:
            resp = requests.get(url, params=params, timeout=14)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("organic_results", []):
                    results.append({
                        "business_name": item.get("title", ""),
                        "website": item.get("link", ""),
                        "snippet": item.get("snippet", ""),
                        "source": "SerpApi / Google",
                        "confidence": 0.88
                    })
        except Exception as e:
            logger.error(f"SerpApi search error: {e}")
        return results

    @classmethod
    def run_orchestrated_search(
        cls,
        workspace_id: int,
        keyword: str,
        location: str,
        mode: str = "Standard Search",
        platform: str = "All Platforms",
        target_count: int = 25,
        enrich_deep: bool = True
    ) -> Dict[str, Any]:
        start_time = time.time()
        conn = sqlite3.connect(os.getenv("USMAN_DB_PATH", "usman_data_analytics.db"), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # Retrieve API keys from existing provider_config table
        serper_key = ""
        serpapi_key = ""
        try:
            p_rows = cur.execute("SELECT provider_name, api_key FROM provider_config WHERE enabled = 1").fetchall()
            for row in p_rows:
                if "serper" in row["provider_name"].lower():
                    serper_key = row["api_key"]
                elif "serpapi" in row["provider_name"].lower():
                    serpapi_key = row["api_key"]
        except Exception as e:
            logger.warning(f"Provider config check warning: {e}")

        # Fetch existing workspace leads for deduplication
        existing_leads = []
        try:
            rows = cur.execute("SELECT business_name, website, email, phone FROM leads WHERE workspace_id = ?", (workspace_id,)).fetchall()
            existing_leads = [dict(r) for r in rows]
        except Exception as e:
            logger.warning(f"Error fetching existing leads: {e}")

        # 1. Expand Queries with Intelligence Engine
        expanded_queries = QueryIntelligenceEngine.expand_query(keyword, location, mode, platform)

        raw_results = []
        source_stats = {}

        # 2. Parallel Search Execution
        def worker(q_item):
            q_text = q_item["query"]
            items = []
            if serper_key and not serper_key.startswith("your_"):
                items = cls._execute_serper_query(q_text, serper_key, num=10)
            elif serpapi_key and not serpapi_key.startswith("your_"):
                items = cls._execute_serpapi_query(q_text, serpapi_key, num=10)
            return q_item, items

        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_query = {executor.submit(worker, q): q for q in expanded_queries}
            for future in as_completed(future_to_query):
                try:
                    q_item, res = future.result()
                    src = q_item["source"]
                    source_stats[src] = source_stats.get(src, 0) + len(res)
                    for r in res:
                        r["query_type"] = q_item["type"]
                        raw_results.append(r)
                except Exception as e:
                    logger.error(f"Search future execution error: {e}")

        # 3. Deduplication & Normalization
        seen_domains = set()
        deduped_leads = []
        duplicates_removed = 0

        for r in raw_results:
            domain = LeadDeduplicationOrchestrator.normalize_domain(r.get("website"))
            if domain and domain in seen_domains:
                duplicates_removed += 1
                continue
            if domain:
                seen_domains.add(domain)

            # Check against workspace DB existing leads
            if LeadDeduplicationOrchestrator.is_duplicate(r, existing_leads):
                duplicates_removed += 1
                continue

            deduped_leads.append(r)
            if len(deduped_leads) >= target_count:
                break

        # 4. Deep Website Intelligence (Tech stack, contact details, CMS)
        enriched_leads = []
        emails_found_count = 0
        phones_found_count = 0

        if enrich_deep and deduped_leads:
            def enrich_worker(lead):
                web = lead.get("website")
                if web and ("http" in web or "." in web):
                    intel = DeepWebsiteIntelligence.analyze_domain(web, timeout=8)
                    lead["emails"] = intel.get("emails_found", [])
                    lead["phones"] = intel.get("phones_found", [])
                    lead["tech_stack"] = intel.get("tech_stack", [])
                    lead["cms"] = intel.get("cms", "Unknown")
                    lead["has_booking"] = intel.get("has_booking", False)
                    lead["has_chat"] = intel.get("has_chat", False)
                    lead["social_links"] = intel.get("social_links", {})
                    if intel.get("emails_found"):
                        lead["email"] = intel["emails_found"][0]
                    if intel.get("phones_found"):
                        lead["phone"] = intel["phones_found"][0]
                return lead

            with ThreadPoolExecutor(max_workers=6) as enrich_executor:
                enriched_leads = list(enrich_executor.map(enrich_worker, deduped_leads))
        else:
            enriched_leads = deduped_leads

        # Calculate counts
        for lead in enriched_leads:
            if lead.get("email"):
                emails_found_count += 1
            if lead.get("phone"):
                phones_found_count += 1

        # 5. Persist to Database (Additive & Backward-Compatible)
        total_found = len(raw_results)
        valid_count = len(enriched_leads)
        duration = round(time.time() - start_time, 2)
        now_iso = datetime.now().isoformat()

        try:
            # Record in search_runs
            cur.execute('''
                INSERT INTO search_runs (
                    workspace_id, keyword, mode, location, country, industry,
                    total_found, duplicates_removed, valid_leads, enriched_count,
                    status, duration_seconds, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                workspace_id, keyword, mode, location, "Global", "B2B",
                total_found, duplicates_removed, valid_count, valid_count if enrich_deep else 0,
                "Completed", duration, now_iso
            ))
            search_run_id = cur.lastrowid

            # Record search queries & sources
            for q in expanded_queries:
                cur.execute('''
                    INSERT INTO search_queries (search_run_id, query_text, query_type, provider, results_count, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (search_run_id, q["query"], q["type"], q["source"], 0, now_iso))

            for src, count in source_stats.items():
                cur.execute('''
                    INSERT INTO search_sources (search_run_id, source_name, item_count, latency_ms, confidence, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (search_run_id, src, count, duration * 100, 0.95, now_iso))

            # Add discovered leads into the existing `leads` table safely
            for l in enriched_leads:
                name = l.get("business_name") or "Discovered Company"
                website = l.get("website") or ""
                email = l.get("email") or ""
                phone = l.get("phone") or ""
                snippet = l.get("snippet") or ""
                tech = json.dumps(l.get("tech_stack", []))
                cms = l.get("cms", "Unknown")

                cur.execute('''
                    INSERT INTO leads (
                        workspace_id, business_name, website, email, phone, 
                        source, source_url, search_keyword, search_location,
                        date_discovered, ai_summary, lead_score, fit_score,
                        opportunity_score, priority, lead_temperature
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    workspace_id, name, website, email, phone,
                    l.get("source", "Ultra Search"), website, keyword, location,
                    now_iso, f"CMS: {cms} | Tech: {tech} | Snippet: {snippet[:150]}",
                    75 if email else 50, 80 if website else 40,
                    85 if l.get("has_booking") else 50,
                    "HIGH" if email and website else "NORMAL",
                    "WARM" if email else "COLD"
                ))
            conn.commit()
        except Exception as e:
            logger.error(f"Error persisting search run to DB: {e}")
        finally:
            conn.close()

        return {
            "keyword": keyword,
            "location": location,
            "mode": mode,
            "query_count": len(expanded_queries),
            "sources": source_stats,
            "total_found": total_found,
            "duplicates_removed": duplicates_removed,
            "valid_leads": valid_count,
            "emails_found": emails_found_count,
            "phones_found": phones_found_count,
            "duration_seconds": duration,
            "leads": enriched_leads
        }
