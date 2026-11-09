import requests

res = requests.post("http://127.0.0.1:8000/api/auth/forgot-password", json={"email": "admin@usmanai.com"})
print("Status:", res.status_code)
print("Body:", res.json())
