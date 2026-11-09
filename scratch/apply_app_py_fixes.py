"""
Surgical repair script for app.py
Applies FIX 1 through FIX 6 with strict verification.
"""
import os
import sys
import re

APP_PY = os.path.abspath("app.py")

with open(APP_PY, "r", encoding="utf-8") as f:
    code = f.read()

initial_len = len(code)
print(f"Read app.py: {initial_len} characters")

# ====================================================================
# FIX 1: ADD MISSING STANDARD LIBRARY IMPORTS IN app.py
# ====================================================================
fix1_target = "from datetime import datetime\nfrom bs4 import BeautifulSoup"
fix1_replacement = """import hashlib
import ipaddress
from datetime import datetime, timedelta, timezone
from bs4 import BeautifulSoup"""

assert code.count(fix1_target) == 1, f"FIX 1 target count: {code.count(fix1_target)}"
code = code.replace(fix1_target, fix1_replacement, 1)
print("FIX 1 applied successfully.")

# ====================================================================
# FIX 2: DEFINE MISSING GLOBAL HELPER FUNCTIONS & SSRF GUARD IN app.py
# ====================================================================
fix2_target = '''# -------------------------------------------------------------------------
# 1. DATABASE SETUP & CLEAN PROVIDER REGISTRY INITIALIZATION
# -------------------------------------------------------------------------
def get_db_connection():'''

fix2_replacement = '''# -------------------------------------------------------------------------
# 0. GLOBAL HELPER FUNCTIONS & SSRF GUARDS
# -------------------------------------------------------------------------
def now_iso() -> str:
    """Returns current UTC timestamp in ISO 8601 format."""
    return datetime.now(timezone.utc).isoformat()


def clean_text(val, max_len: int = 500) -> str:
    """Safely converts val to string, collapses whitespace, and truncates to max_len."""
    if val is None:
        return ""
    s = re.sub(r"\\s+", " ", str(val)).strip()
    return s[:max_len]


def safe_int(val, default: int = 0) -> int:
    """Safely converts val to int with fallback to default."""
    try:
        if val is None:
            return default
        return int(float(val))
    except (ValueError, TypeError):
        return default


def safe_float(val, default: float = 0.0) -> float:
    """Safely converts val to float with fallback to default."""
    try:
        if val is None:
            return default
        return float(val)
    except (ValueError, TypeError):
        return default


def is_safe_public_url(url: str) -> bool:
    """
    SSRF Guard (SEC-010): Validates URL scheme, port, hostname, and resolved IPs.
    Blocks loopback (127.0.0.0/8, ::1), private RFC1918, link-local (169.254.0.0/16),
    multicast, reserved addresses, and cloud metadata endpoints.
    """
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    try:
        parsed = urlparse(url)
    except Exception:
        return False

    if parsed.scheme.lower() not in ("http", "https"):
        return False

    hostname = parsed.hostname
    if not hostname:
        return False

    # Block credentials embedded in URL
    if parsed.username or parsed.password:
        return False

    # Block non-standard ports
    port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
    if port not in (80, 443, 8080, 8443):
        return False

    hostname_lower = hostname.lower()
    if hostname_lower in (
        "localhost", "127.0.0.1", "::1", "169.254.169.254",
        "metadata.google.internal", "100.100.100.200"
    ):
        return False

    try:
        # Check if hostname is an IP literal
        try:
            ip = ipaddress.ip_address(hostname)
            is_literal = True
        except ValueError:
            is_literal = False

        if is_literal:
            if (
                ip.is_loopback or ip.is_private or ip.is_link_local
                or ip.is_multicast or ip.is_reserved or ip.is_unspecified
                or str(ip) in ("169.254.169.254", "100.100.100.200")
            ):
                return False
        else:
            # Resolve DNS and check all resolved socket IPs
            addr_info = socket.getaddrinfo(hostname, port, proto=socket.IPPROTO_TCP)
            if not addr_info:
                return False
            for entry in addr_info:
                sockaddr = entry[4]
                resolved_ip = ipaddress.ip_address(sockaddr[0])
                if (
                    resolved_ip.is_loopback or resolved_ip.is_private
                    or resolved_ip.is_link_local or resolved_ip.is_multicast
                    or resolved_ip.is_reserved or resolved_ip.is_unspecified
                    or str(resolved_ip) in ("169.254.169.254", "100.100.100.200")
                ):
                    return False
    except Exception:
        return False

    return True


def norm_url(url: str) -> str:
    """Cleans URL string, prepends https:// if scheme missing, validates via is_safe_public_url."""
    url = (url or "").strip()
    if not url:
        return ""
    if not re.match(r"^https?://", url, re.I):
        url = "https://" + url
    if not is_safe_public_url(url):
        return ""
    return url


def normalize_email(email: str) -> str:
    """Strips and lowercases email, returning empty string if '@' is missing."""
    email = str(email or "").strip().lower()
    if "@" not in email:
        return ""
    return email


def normalize_phone(phone: str) -> str:
    """Removes all non-digit and non-plus characters from phone number."""
    return re.sub(r"[^0-9+]", "", str(phone or "").strip())


def stable_hash(*parts) -> str:
    """Computes deterministic SHA256 hex digest over parts."""
    joined = "|".join(str(p or "").strip().lower() for p in parts)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


# -------------------------------------------------------------------------
# 1. DATABASE SETUP & CLEAN PROVIDER REGISTRY INITIALIZATION
# -------------------------------------------------------------------------
def get_db_connection():'''

assert code.count(fix2_target) == 1, f"FIX 2 target count: {code.count(fix2_target)}"
code = code.replace(fix2_target, fix2_replacement, 1)

# Also update premium_fetch_page to use is_safe_public_url
fix2_fetch_target = '''def premium_fetch_page(url, timeout=18):
    url = (url or "").strip()
    if not url: return {"success":False,"error":"No URL"}
    if not re.match(r"^https?://", url, re.I): url = "https://" + url
    try:'''

fix2_fetch_replacement = '''def premium_fetch_page(url, timeout=18):
    url = (url or "").strip()
    if not url: return {"success":False,"error":"No URL"}
    if not re.match(r"^https?://", url, re.I): url = "https://" + url
    if not is_safe_public_url(url):
        return {"success": False, "error": "Blocked by SSRF policy (is_safe_public_url)"}
    try:'''

assert code.count(fix2_fetch_target) == 1, f"FIX 2 fetch target count: {code.count(fix2_fetch_target)}"
code = code.replace(fix2_fetch_target, fix2_fetch_replacement, 1)
print("FIX 2 applied successfully.")

# ====================================================================
# FIX 3: RESTORE MISSING WebsiteIntelligence CLASS IN app.py
# ====================================================================
fix3_target = '''# -------------------------------------------------------------------------
# FEATURE #18: REAL AI-POWERED LEAD SCORING & QUALIFICATION ENGINE
# -------------------------------------------------------------------------
class LeadScoringEngine:'''

fix3_replacement = '''# -------------------------------------------------------------------------
# WEBSITE INTELLIGENCE & DEEP CRAWLER
# -------------------------------------------------------------------------
class WebsiteIntelligence:
    """
    Autonomous website crawler and contact extractor.
    Extracts verified emails (ignoring image/asset extensions), phone numbers,
    and text summaries with strict SSRF guard validation.
    """
    @staticmethod
    def crawl_and_extract(url: str):
        default_res = {
            "email": "",
            "phone": "",
            "email_status": "Unverified",
            "email_confidence": 0.0,
            "snippet": ""
        }
        url = (url or "").strip()
        if not url:
            return default_res
        if not re.match(r"^https?://", url, re.I):
            url = "https://" + url
        if not is_safe_public_url(url):
            logger.warning(f"WebsiteIntelligence: URL blocked by SSRF guard: {url}")
            return default_res

        try:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) UsmanResearchBot/2.0"}
            resp = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
            if resp.status_code != 200 or not resp.text:
                return default_res

            soup = BeautifulSoup(resp.text, "html.parser")
            for elem in soup(["script", "style", "noscript", "header", "footer", "nav"]):
                elem.decompose()

            text = soup.get_text(" ", strip=True)
            snippet = clean_text(text, 500)

            # Extract emails, excluding asset extensions
            raw_emails = re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}", resp.text)
            ignored_exts = ('.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js', '.ico')
            valid_emails = [
                e.strip().lower() for e in raw_emails
                if not any(e.lower().endswith(ext) for ext in ignored_exts)
                and len(e) < 80
            ]
            found_email = valid_emails[0] if valid_emails else ""

            # Extract phone numbers
            raw_phones = re.findall(r"(?:\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}", text)
            valid_phones = [normalize_phone(p) for p in raw_phones if len(re.sub(r'\\D', '', p)) >= 10]
            found_phone = valid_phones[0] if valid_phones else ""

            return {
                "email": found_email,
                "phone": found_phone,
                "email_status": "Verified" if found_email else "Unverified",
                "email_confidence": 0.85 if found_email else 0.0,
                "snippet": snippet
            }
        except Exception as e:
            logger.warning(f"WebsiteIntelligence crawl failed for {url}: {e}")
            return default_res

    @classmethod
    def deep_crawl_contact_info(cls, url: str):
        return cls.crawl_and_extract(url)


# -------------------------------------------------------------------------
# FEATURE #18: REAL AI-POWERED LEAD SCORING & QUALIFICATION ENGINE
# -------------------------------------------------------------------------
class LeadScoringEngine:'''

assert code.count(fix3_target) == 1, f"FIX 3 target count: {code.count(fix3_target)}"
code = code.replace(fix3_target, fix3_replacement, 1)
print("FIX 3 applied successfully.")

# ====================================================================
# FIX 4: ALIGN SearchEngineManager.multi_platform_search PLATFORM KEYS
# ====================================================================
fix4_target = '''        platform_queries = {
            "Google / Business Directory": f"{keyword} {location}",
            "Instagram": f"site:instagram.com {keyword} {location}",
            "YouTube": f"site:youtube.com {keyword} {location}",
            "LinkedIn": f"site:linkedin.com/company {keyword} {location}",
            "Reddit": f"site:reddit.com {keyword} {location}",
            "Facebook": f"site:facebook.com {keyword} {location}",
            "Telegram": f"site:t.me {keyword} {location}"
        }

        platforms_to_search = list(platform_queries.keys()) if selected_platform == "All Platforms" else [selected_platform]'''

fix4_replacement = '''        platform_queries = {
            "Google / Business Directory": f"{keyword} {location}",
            "Google/Maps": f"{keyword} {location} maps",
            "Instagram": f"site:instagram.com {keyword} {location}",
            "Facebook": f"site:facebook.com {keyword} {location}",
            "LinkedIn": f"site:linkedin.com/company {keyword} {location}",
            "YouTube": f"site:youtube.com {keyword} {location}",
            "X": f"site:x.com {keyword} {location}",
            "Reddit": f"site:reddit.com {keyword} {location}",
            "Telegram": f"site:t.me {keyword} {location}",
            "Business Directories": f"{keyword} {location} directory OR yellowpages",
            "Websites and all other supported sources": f"{keyword} {location} official website"
        }

        core_platforms = [
            "Google / Business Directory",
            "Google/Maps",
            "LinkedIn",
            "Instagram",
            "Facebook",
            "YouTube",
            "X",
            "Reddit",
            "Telegram",
            "Business Directories",
            "Websites and all other supported sources"
        ]
        platforms_to_search = core_platforms if selected_platform == "All Platforms" else [selected_platform]'''

assert code.count(fix4_target) == 1, f"FIX 4 target count: {code.count(fix4_target)}"
code = code.replace(fix4_target, fix4_replacement, 1)
print("FIX 4 applied successfully.")

# ====================================================================
# FIX 5: FIX SQL BINDING COUNT ERRORS IN FEATURES #21, #22, #23, #25
# ====================================================================
# 1. Feature #21 (SocialMediaIntelligenceEngine)
fix5_1_target = '""", values[1:] + (int(lead_id),))'
assert code.count(fix5_1_target) == 1, f"FIX 5.1 target count: {code.count(fix5_1_target)}"
code = code.replace(fix5_1_target, '""", values[1:-1] + (int(lead_id),))', 1)
print("FIX 5.1 (Feature #21) applied successfully.")

# 2. Feature #22 (DecisionMakerIntelligenceEngine)
fix5_2_target = (
    "                    ai_consensus = ?,\n"
    "                    master_judge = ?,\n"
    "                    warnings = ?,\n"
    "                    updated_at = ?\n"
    "                WHERE lead_id = ?\n"
    '                """,\n'
    "                values[1:] + (\n"
    "                    int(lead_id),\n"
    "                )\n"
    "            )"
)
fix5_2_replacement = (
    "                    ai_consensus = ?,\n"
    "                    master_judge = ?,\n"
    "                    warnings = ?,\n"
    "                    updated_at = ?\n"
    "                WHERE lead_id = ?\n"
    '                """,\n'
    "                values[1:-1] + (\n"
    "                    int(lead_id),\n"
    "                )\n"
    "            )"
)
assert code.count(fix5_2_target) == 1, f"FIX 5.2 target count: {code.count(fix5_2_target)}"
code = code.replace(fix5_2_target, fix5_2_replacement, 1)
print("FIX 5.2 (Feature #22) applied successfully.")

# 3. Feature #23 (LeadDataVerificationEngine)
fix5_3_update_target = (
    "                    master_judge = ?,\n"
    "                    recommended_action = ?,\n"
    "                    warnings = ?,\n\n"
    "                    updated_at = ?\n\n"
    "                WHERE lead_id = ?\n"
    '                """,\n'
    "                values[1:] + (\n"
    "                    int(lead_id),\n"
    "                )\n"
    "            )"
)
fix5_3_update_replacement = (
    "                    master_judge = ?,\n"
    "                    recommended_action = ?,\n"
    "                    warnings = ?,\n\n"
    "                    updated_at = ?\n\n"
    "                WHERE lead_id = ?\n"
    '                """,\n'
    "                values[1:-1] + (\n"
    "                    int(lead_id),\n"
    "                )\n"
    "            )"
)
assert code.count(fix5_3_update_target) == 1, f"FIX 5.3 UPDATE target count: {code.count(fix5_3_update_target)}"
code = code.replace(fix5_3_update_target, fix5_3_update_replacement, 1)

fix5_3_insert_target = (
    "                )\n"
    '                """,\n'
    "                values + (now,)\n"
    "            )"
)
fix5_3_insert_replacement = (
    "                )\n"
    '                """,\n'
    "                values\n"
    "            )"
)
assert code.count(fix5_3_insert_target) == 1, f"FIX 5.3 INSERT target count: {code.count(fix5_3_insert_target)}"
code = code.replace(fix5_3_insert_target, fix5_3_insert_replacement, 1)
print("FIX 5.3 (Feature #23) applied successfully.")

# 4. Feature #25 (CrossPlatformIdentityEngine)
fix5_4_update_target = (
    "                    ai_consensus = ?,\n"
    "                    ai_confidence = ?,\n"
    "                    master_judge = ?,\n"
    "                    updated_at = ?\n"
    "                WHERE lead_id = ?\n"
    '                """,\n'
    "                values[1:] + (\n"
    "                    int(lead_id),\n"
    "                )\n"
    "            )"
)
fix5_4_update_replacement = (
    "                    ai_consensus = ?,\n"
    "                    ai_confidence = ?,\n"
    "                    master_judge = ?,\n"
    "                    updated_at = ?\n"
    "                WHERE lead_id = ?\n"
    '                """,\n'
    "                values[1:-1] + (\n"
    "                    int(lead_id),\n"
    "                )\n"
    "            )"
)
assert code.count(fix5_4_update_target) == 1, f"FIX 5.4 UPDATE target count: {code.count(fix5_4_update_target)}"
code = code.replace(fix5_4_update_target, fix5_4_update_replacement, 1)

fix5_4_insert_target = (
    "                VALUES (\n"
    "                    ?, ?, ?, ?, ?, ?, ?,\n"
    "                    ?, ?, ?, ?, ?, ?, ?,\n"
    "                    ?, ?, ?, ?, ?, ?, ?,\n"
    "                    ?, ?, ?, ?, ?, ?\n"
    "                )"
)
fix5_4_insert_replacement = (
    "                VALUES (\n"
    "                    ?, ?, ?, ?, ?, ?, ?,\n"
    "                    ?, ?, ?, ?, ?, ?, ?,\n"
    "                    ?, ?, ?, ?, ?, ?, ?,\n"
    "                    ?, ?, ?, ?, ?\n"
    "                )"
)
assert code.count(fix5_4_insert_target) == 1, f"FIX 5.4 INSERT target count: {code.count(fix5_4_insert_target)}"
code = code.replace(fix5_4_insert_target, fix5_4_insert_replacement, 1)
print("FIX 5.4 (Feature #25) applied successfully.")

# ====================================================================
# FIX 6: SAFE NON-DESTRUCTIVE SQLITE SCHEMA MIGRATIONS
# ====================================================================
# 1. evidence table creation in init_premium_schema()
fix6_1_target = '            """CREATE TABLE IF NOT EXISTS premium_feature_runs ('
fix6_1_replacement = (
    '            """CREATE TABLE IF NOT EXISTS evidence (\n'
    '                id INTEGER PRIMARY KEY AUTOINCREMENT,\n'
    '                lead_id INTEGER NOT NULL,\n'
    '                source_type TEXT,\n'
    '                source_url TEXT,\n'
    '                title TEXT,\n'
    '                snippet TEXT,\n'
    '                claim TEXT,\n'
    "                claim_type TEXT DEFAULT 'OBSERVED',\n"
    '                confidence REAL DEFAULT 0,\n'
    '                content_hash TEXT,\n'
    '                created_at TEXT NOT NULL\n'
    '            )""",\n'
    '            """CREATE TABLE IF NOT EXISTS premium_feature_runs ('
)
assert code.count(fix6_1_target) == 1, f"FIX 6.1 target count: {code.count(fix6_1_target)}"
code = code.replace(fix6_1_target, fix6_1_replacement, 1)
print("FIX 6.1 (evidence table) applied successfully.")

# 2. buying_intent_analysis column migration in BuyingIntentEngine.ensure_database()
fix6_2_target = '''        cursor.execute("""
            CREATE TABLE IF NOT EXISTS buying_intent_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id INTEGER UNIQUE,
                buying_intent_score INTEGER DEFAULT 0,
                buying_intent_level TEXT DEFAULT '🔴 VERY LOW INTENT',
                intent_categories TEXT DEFAULT '[]',
                positive_signals TEXT DEFAULT '[]',
                negative_signals TEXT DEFAULT '[]',
                potential_trigger TEXT DEFAULT '',
                potential_need TEXT DEFAULT '',
                observed_signals TEXT DEFAULT '[]',
                inferred_signals TEXT DEFAULT '[]',
                unknown_signals TEXT DEFAULT '[]',
                supporting_evidence TEXT DEFAULT '[]',
                missing_evidence TEXT DEFAULT '[]',
                recommended_action TEXT DEFAULT '',
                intent_confidence REAL DEFAULT 0.0,
                ai_consensus REAL DEFAULT 0.0,
                supporting_providers TEXT DEFAULT '[]',
                conflicting_providers TEXT DEFAULT '[]',
                master_judge TEXT DEFAULT '',
                analysis_mode TEXT DEFAULT 'BALANCED MODE',
                source_fingerprint TEXT DEFAULT '',
                analyzed_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE CASCADE
            )
        """)

        conn.commit()'''

fix6_2_replacement = '''        cursor.execute("""
            CREATE TABLE IF NOT EXISTS buying_intent_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id INTEGER UNIQUE,
                buying_intent_score INTEGER DEFAULT 0,
                buying_intent_level TEXT DEFAULT '🔴 VERY LOW INTENT',
                intent_categories TEXT DEFAULT '[]',
                positive_signals TEXT DEFAULT '[]',
                negative_signals TEXT DEFAULT '[]',
                potential_trigger TEXT DEFAULT '',
                potential_need TEXT DEFAULT '',
                observed_signals TEXT DEFAULT '[]',
                inferred_signals TEXT DEFAULT '[]',
                unknown_signals TEXT DEFAULT '[]',
                supporting_evidence TEXT DEFAULT '[]',
                missing_evidence TEXT DEFAULT '[]',
                recommended_action TEXT DEFAULT '',
                intent_confidence REAL DEFAULT 0.0,
                ai_consensus REAL DEFAULT 0.0,
                supporting_providers TEXT DEFAULT '[]',
                conflicting_providers TEXT DEFAULT '[]',
                master_judge TEXT DEFAULT '',
                analysis_mode TEXT DEFAULT 'BALANCED MODE',
                source_fingerprint TEXT DEFAULT '',
                analyzed_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE CASCADE
            )
        """)

        # Non-destructive migration for existing tables missing new columns
        cursor.execute("PRAGMA table_info(buying_intent_analysis)")
        existing_cols = {row[1] for row in cursor.fetchall()}
        intent_col_defs = [
            ("buying_intent_score", "INTEGER DEFAULT 0"),
            ("buying_intent_level", "TEXT DEFAULT '🔴 VERY LOW INTENT'"),
            ("intent_categories", "TEXT DEFAULT '[]'"),
            ("positive_signals", "TEXT DEFAULT '[]'"),
            ("negative_signals", "TEXT DEFAULT '[]'"),
            ("potential_trigger", "TEXT DEFAULT ''"),
            ("potential_need", "TEXT DEFAULT ''"),
            ("observed_signals", "TEXT DEFAULT '[]'"),
            ("inferred_signals", "TEXT DEFAULT '[]'"),
            ("unknown_signals", "TEXT DEFAULT '[]'"),
            ("supporting_evidence", "TEXT DEFAULT '[]'"),
            ("missing_evidence", "TEXT DEFAULT '[]'"),
            ("recommended_action", "TEXT DEFAULT ''"),
            ("intent_confidence", "REAL DEFAULT 0.0"),
            ("ai_consensus", "REAL DEFAULT 0.0"),
            ("supporting_providers", "TEXT DEFAULT '[]'"),
            ("conflicting_providers", "TEXT DEFAULT '[]'"),
            ("master_judge", "TEXT DEFAULT ''"),
            ("analysis_mode", "TEXT DEFAULT 'BALANCED MODE'"),
            ("source_fingerprint", "TEXT DEFAULT ''"),
            ("analyzed_at", "TEXT DEFAULT ''"),
            ("updated_at", "TEXT DEFAULT ''")
        ]
        for col_name, col_type in intent_col_defs:
            if col_name not in existing_cols:
                try:
                    cursor.execute(f"ALTER TABLE buying_intent_analysis ADD COLUMN {col_name} {col_type}")
                except Exception as e:
                    logger.warning(f"Could not add column {col_name} to buying_intent_analysis: {e}")

        conn.commit()'''

assert code.count(fix6_2_target) == 1, f"FIX 6.2 target count: {code.count(fix6_2_target)}"
code = code.replace(fix6_2_target, fix6_2_replacement, 1)
print("FIX 6.2 (buying_intent_analysis migration) applied successfully.")

# 3. duplicate_clusters column migration in LeadDeduplicationEngine.ensure_database()
fix6_3_target = '''        conn.execute("""
            CREATE TABLE IF NOT EXISTS duplicate_clusters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                canonical_lead_id INTEGER,
                duplicate_lead_ids TEXT DEFAULT '[]',
                similarity_score REAL DEFAULT 0.0,
                match_reasons TEXT DEFAULT '[]',
                conflicting_fields TEXT DEFAULT '[]',
                merged INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
            )
        """)'''

fix6_3_replacement = '''        conn.execute("""
            CREATE TABLE IF NOT EXISTS duplicate_clusters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                canonical_lead_id INTEGER,
                duplicate_lead_ids TEXT DEFAULT '[]',
                similarity_score REAL DEFAULT 0.0,
                match_reasons TEXT DEFAULT '[]',
                conflicting_fields TEXT DEFAULT '[]',
                merged INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
            )
        """)

        # Non-destructive migration for existing duplicate_clusters missing columns
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(duplicate_clusters)")
        existing_cluster_cols = {row[1] for row in cursor.fetchall()}
        cluster_col_defs = [
            ("duplicate_lead_ids", "TEXT DEFAULT '[]'"),
            ("similarity_score", "REAL DEFAULT 0.0"),
            ("match_reasons", "TEXT DEFAULT '[]'"),
            ("conflicting_fields", "TEXT DEFAULT '[]'"),
            ("merged", "INTEGER DEFAULT 0"),
            ("updated_at", "TEXT DEFAULT ''")
        ]
        for col_name, col_type in cluster_col_defs:
            if col_name not in existing_cluster_cols:
                try:
                    cursor.execute(f"ALTER TABLE duplicate_clusters ADD COLUMN {col_name} {col_type}")
                except Exception as e:
                    logger.warning(f"Could not add column {col_name} to duplicate_clusters: {e}")'''

assert code.count(fix6_3_target) == 1, f"FIX 6.3 target count: {code.count(fix6_3_target)}"
code = code.replace(fix6_3_target, fix6_3_replacement, 1)
print("FIX 6.3 (duplicate_clusters migration) applied successfully.")

# 4. workspaces tenant_id compatibility in init_db() and render_settings_page()
fix6_4_schema_target = """    cursor.execute('''
        CREATE TABLE IF NOT EXISTS workspaces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')"""

fix6_4_schema_replacement = """    cursor.execute('''
        CREATE TABLE IF NOT EXISTS workspaces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL,
            tenant_id INTEGER DEFAULT 1
        )
    ''')
    cursor.execute("PRAGMA table_info(workspaces)")
    ws_existing_cols = {r[1] for r in cursor.fetchall()}
    if "tenant_id" not in ws_existing_cols:
        try:
            cursor.execute("ALTER TABLE workspaces ADD COLUMN tenant_id INTEGER DEFAULT 1")
        except Exception:
            pass"""

assert code.count(fix6_4_schema_target) == 1, f"FIX 6.4 schema target count: {code.count(fix6_4_schema_target)}"
code = code.replace(fix6_4_schema_target, fix6_4_schema_replacement, 1)

# Default workspace insertion in init_db()
fix6_4_insert_target = """    cursor.execute("SELECT COUNT(*) FROM workspaces")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO workspaces (name, created_at) VALUES (?, ?)", 
                       ("Default Workspace", datetime.now().isoformat()))
        conn.commit()"""

fix6_4_insert_replacement = """    cursor.execute("SELECT COUNT(*) FROM workspaces")
    if cursor.fetchone()[0] == 0:
        cursor.execute("PRAGMA table_info(workspaces)")
        ws_col_set = {r[1] for r in cursor.fetchall()}
        if "tenant_id" in ws_col_set:
            cursor.execute("INSERT INTO workspaces (name, tenant_id, created_at) VALUES (?, ?, ?)", 
                           ("Default Workspace", 1, datetime.now().isoformat()))
        else:
            cursor.execute("INSERT INTO workspaces (name, created_at) VALUES (?, ?)", 
                           ("Default Workspace", datetime.now().isoformat()))
        conn.commit()"""

assert code.count(fix6_4_insert_target) == 1, f"FIX 6.4 insert target count: {code.count(fix6_4_insert_target)}"
code = code.replace(fix6_4_insert_target, fix6_4_insert_replacement, 1)

# Workspace creation UI in render_settings_page()
fix6_4_ui_target = """            conn = get_db_connection()
            try:
                conn.execute("INSERT INTO workspaces (name, created_at) VALUES (?, ?)", (new_ws, datetime.now().isoformat()))
                conn.commit()
                st.success(f"Workspace '{new_ws}' created successfully!")
                st.rerun()
            except sqlite3.IntegrityError:
                st.error("Workspace already exists.")
            conn.close()"""

fix6_4_ui_replacement = """            conn = get_db_connection()
            try:
                ws_cols = {r[1] for r in conn.execute("PRAGMA table_info(workspaces)").fetchall()}
                if "tenant_id" in ws_cols:
                    conn.execute("INSERT INTO workspaces (name, tenant_id, created_at) VALUES (?, ?, ?)", (new_ws, 1, datetime.now().isoformat()))
                else:
                    conn.execute("INSERT INTO workspaces (name, created_at) VALUES (?, ?)", (new_ws, datetime.now().isoformat()))
                conn.commit()
                st.success(f"Workspace '{new_ws}' created successfully!")
                st.rerun()
            except sqlite3.IntegrityError:
                st.error("Workspace already exists.")
            conn.close()"""

assert code.count(fix6_4_ui_target) == 1, f"FIX 6.4 UI target count: {code.count(fix6_4_ui_target)}"
code = code.replace(fix6_4_ui_target, fix6_4_ui_replacement, 1)
print("FIX 6.4 (workspaces tenant_id compatibility) applied successfully.")

# 5. leads identity_key compatibility & backfill in init_db() and INSERT INTO leads
fix6_5_initdb_target = """            latency REAL,
            success INTEGER,
            error_message TEXT,
            timestamp TEXT
        )
    ''')
    conn.commit()"""

fix6_5_initdb_replacement = """            latency REAL,
            success INTEGER,
            error_message TEXT,
            timestamp TEXT
        )
    ''')

    # Ensure leads has identity_key column
    cursor.execute("PRAGMA table_info(leads)")
    lead_existing_cols = {r[1] for r in cursor.fetchall()}
    if "identity_key" not in lead_existing_cols:
        try:
            cursor.execute("ALTER TABLE leads ADD COLUMN identity_key TEXT DEFAULT ''")
        except Exception:
            pass

    # Backfill missing identity_key on leads to satisfy UNIQUE(workspace_id, identity_key)
    cursor.execute("PRAGMA table_info(leads)")
    lead_existing_cols = {r[1] for r in cursor.fetchall()}
    if "identity_key" in lead_existing_cols:
        rows_to_backfill = cursor.execute(
            "SELECT id, business_name, website, email, phone FROM leads WHERE identity_key IS NULL OR identity_key = ''"
        ).fetchall()
        for r in rows_to_backfill:
            lid = r[0]
            bname = r[1] or ""
            web = r[2] or ""
            em = r[3] or ""
            ph = r[4] or ""
            new_key = stable_hash(str(lid), bname, web, em, ph)
            cursor.execute("UPDATE leads SET identity_key = ? WHERE id = ?", (new_key, lid))
        if rows_to_backfill:
            conn.commit()

    conn.commit()"""

assert code.count(fix6_5_initdb_target) == 1, f"FIX 6.5 initdb target count: {code.count(fix6_5_initdb_target)}"
code = code.replace(fix6_5_initdb_target, fix6_5_initdb_replacement, 1)

# Advanced Search insert in app.py (around line 15730)
fix6_5_insert_target = """                            cursor.execute('''
                                INSERT INTO leads (
                                    workspace_id, business_name, website, source, source_url, 
                                    search_keyword, search_location, date_discovered, industry,
                                    email, email_status, email_confidence, phone, ai_summary, crm_stage, lead_score, created_at, updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Not Contacted', ?, ?, ?)
                            ''', (
                                active_ws_id, r.get("business_name"), website_url, plat_name, r.get("snippet", ""),
                                keyword, current_city, now, industry, crawl_data["email"], crawl_data["email_status"],
                                crawl_data["email_confidence"], crawl_data["phone"], f"Intent: {ai_intent_service} | " + crawl_data["snippet"], dummy_score, now, now
                            ))"""

fix6_5_insert_replacement = """                            ident_key = stable_hash(
                                str(active_ws_id),
                                r.get("business_name", ""),
                                website_url,
                                crawl_data.get("email", ""),
                                crawl_data.get("phone", "")
                            )
                            cursor.execute("PRAGMA table_info(leads)")
                            l_cols = {c[1] for c in cursor.fetchall()}
                            if "identity_key" in l_cols:
                                existing_lead = cursor.execute(
                                    "SELECT id FROM leads WHERE workspace_id = ? AND identity_key = ? LIMIT 1",
                                    (active_ws_id, ident_key)
                                ).fetchone()
                                if existing_lead:
                                    cursor.execute('''
                                        UPDATE leads SET 
                                            updated_at = ?,
                                            email = COALESCE(NULLIF(email, ''), ?),
                                            email_status = COALESCE(NULLIF(email_status, ''), ?),
                                            email_confidence = CASE WHEN email IS NULL OR email = '' THEN ? ELSE email_confidence END,
                                            phone = COALESCE(NULLIF(phone, ''), ?)
                                        WHERE id = ?
                                    ''', (now, crawl_data["email"], crawl_data["email_status"], crawl_data["email_confidence"], crawl_data["phone"], existing_lead[0]))
                                    conn.commit()
                                    continue

                                cursor.execute('''
                                    INSERT INTO leads (
                                        workspace_id, business_name, website, source, source_url, 
                                        search_keyword, search_location, date_discovered, industry,
                                        email, email_status, email_confidence, phone, ai_summary, crm_stage, lead_score, identity_key, created_at, updated_at
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Not Contacted', ?, ?, ?, ?)
                                ''', (
                                    active_ws_id, r.get("business_name"), website_url, plat_name, r.get("snippet", ""),
                                    keyword, current_city, now, industry, crawl_data["email"], crawl_data["email_status"],
                                    crawl_data["email_confidence"], crawl_data["phone"], f"Intent: {ai_intent_service} | " + crawl_data["snippet"], dummy_score, ident_key, now, now
                                ))
                            else:
                                cursor.execute('''
                                    INSERT INTO leads (
                                        workspace_id, business_name, website, source, source_url, 
                                        search_keyword, search_location, date_discovered, industry,
                                        email, email_status, email_confidence, phone, ai_summary, crm_stage, lead_score, created_at, updated_at
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Not Contacted', ?, ?, ?)
                                ''', (
                                    active_ws_id, r.get("business_name"), website_url, plat_name, r.get("snippet", ""),
                                    keyword, current_city, now, industry, crawl_data["email"], crawl_data["email_status"],
                                    crawl_data["email_confidence"], crawl_data["phone"], f"Intent: {ai_intent_service} | " + crawl_data["snippet"], dummy_score, now, now
                                ))"""

assert code.count(fix6_5_insert_target) == 1, f"FIX 6.5 insert target count: {code.count(fix6_5_insert_target)}"
code = code.replace(fix6_5_insert_target, fix6_5_insert_replacement, 1)
print("FIX 6.5 (leads identity_key compatibility & backfill) applied successfully.")

with open(APP_PY, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(code)

print(f"app.py written cleanly: {len(code)} characters.")
