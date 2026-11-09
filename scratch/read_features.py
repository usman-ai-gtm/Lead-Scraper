import json

with open("lib/feature-registry-25.json", "r", encoding="utf-8") as f:
    d = json.load(f)

for i in range(18, 26):
    feat = d.get(str(i), {})
    print(f"Feature #{i}: {feat.get('name')} | Module: {feat.get('module')} | Endpoint: {feat.get('endpoint')} | UI Route: {feat.get('ui_route')}")
