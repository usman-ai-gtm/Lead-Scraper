import requests
import json

base = "https://lead-scraper-mxs5.vercel.app"

for endpoint in ["/api/whatsapp/overview", "/api/crm/deals", "/api/admin/persistence"]:
    try:
        r = requests.get(f"{base}{endpoint}", timeout=15)
        print(f"[{r.status_code}] {endpoint} -> {r.text[:120]}")
    except Exception as e:
        print(f"[ERR] {endpoint} -> {e}")
