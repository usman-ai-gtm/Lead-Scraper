import requests

PROD_URL = "https://lead-scraper-mxs5.vercel.app"

routes = [
    "/",
    "/login",
    "/signup",
    "/features",
    "/pricing",
    "/app",
    "/app/leads",
    "/app/research",
    "/app/crm",
    "/app/whatsapp",
    "/app/settings",
    "/app/accounts",
    "/api/health",
    "/api/auth/login",
    "/api/leads/search",
    "/api/whatsapp/overview",
    "/api/whatsapp/settings",
    "/api/whatsapp/leads"
]

print("=" * 60)
print(f"PROBING PRODUCTION DEPLOYMENT: {PROD_URL}")
print("=" * 60)

for route in routes:
    url = f"{PROD_URL}{route}"
    try:
        res = requests.get(url, timeout=10, allow_redirects=False)
        location = f" -> {res.headers.get('Location')}" if res.status_code in [301, 302, 307, 308] else ""
        print(f"[{res.status_code}] {route}{location}")
    except Exception as e:
        print(f"[ERR] {route} -> {e}")
