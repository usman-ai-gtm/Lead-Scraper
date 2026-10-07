import os
import re
import json

def audit_secrets_and_syntax(root_dir="."):
    print("=== STARTING ULTRA-DEEP STATIC AUDIT ===")
    
    # 1. Regex patterns for sensitive keys
    secret_patterns = {
        "OpenAI Key": re.compile(r"sk-[A-Za-z0-9-_]{20,}", re.IGNORECASE),
        "Google API Key": re.compile(r"AIza[0-9A-Za-z-_]{35}", re.IGNORECASE),
        "Generic Secret": re.compile(r"(client_secret|clientSecret|secret_key)\s*[:=]\s*[\"']([a-zA-Z0-9_\-]{16,})[\"']", re.IGNORECASE),
        "Private Key": re.compile(r"-----BEGIN PRIVATE KEY-----", re.IGNORECASE)
    }
    
    # 2. Track fetch calls in frontend
    fetch_pattern = re.compile(r"fetch\(\s*[\"'](/api/[^\"']+)[\"']")
    
    # Exclude dirs
    exclude_dirs = {'.git', 'node_modules', '.next', '__pycache__', '.venv', 'venv'}
    
    findings = []
    frontend_api_calls = set()
    all_routes = set()
    
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in files:
            file_path = os.path.join(root, f).replace("\\", "/")
            ext = os.path.splitext(f)[1]
            
            # Record api routes
            if f == "route.ts" or f == "route.js":
                rel = os.path.relpath(file_path, root_dir).replace("\\", "/")
                # Extract the api route path
                if "app/api/" in rel:
                    sub = rel.split("app/api/")[1].rsplit("/route.", 1)[0]
                    all_routes.add(f"/api/{sub}")
            
            # Scan text files
            if ext in {'.ts', '.tsx', '.js', '.jsx', '.py', '.json', '.env', '.example', '.md'}:
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as fp:
                        content = fp.read()
                        
                    # Check for secrets
                    for sec_name, pat in secret_patterns.items():
                        matches = pat.findall(content)
                        if matches:
                            for m in matches:
                                val = m if isinstance(m, str) else m[1] if isinstance(m, tuple) else str(m)
                                # Exclude placeholders or examples
                                if not any(x in val.lower() for x in ['example', 'your-', 'placeholder', 'dummy', 'xxxx', 'test', 'demo', 'sample']):
                                    findings.append({
                                        "type": "POTENTIAL_SECRET",
                                        "severity": "HIGH",
                                        "file": file_path,
                                        "detail": f"{sec_name} detected (masked: {val[:4]}...{val[-4:] if len(val)>8 else ''})"
                                    })
                                    
                    # If frontend file, find fetch calls
                    if ext in {'.ts', '.tsx', '.js', '.jsx'} and ('app/' in file_path or 'components/' in file_path or 'frontend/' in file_path):
                        for m in fetch_pattern.finditer(content):
                            url = m.group(1).split("?")[0]
                            frontend_api_calls.add((url, file_path))
                            
                except Exception as e:
                    findings.append({
                        "type": "FILE_READ_ERROR",
                        "severity": "LOW",
                        "file": file_path,
                        "detail": str(e)
                    })

    print(f"\n1. Discovered Next.js API Routes ({len(all_routes)}):")
    for r in sorted(all_routes):
        print(f"   {r}")
        
    print(f"\n2. Discovered Frontend fetch() endpoints called ({len(frontend_api_calls)} unique call sites):")
    unique_endpoints = sorted(list({url for url, _ in frontend_api_calls}))
    for ep in unique_endpoints:
        callers = [f for u, f in frontend_api_calls if u == ep]
        print(f"   {ep} (called by {len(callers)} files)")

    print(f"\n3. Security Findings ({len(findings)}):")
    for fin in findings:
        print(f"   [{fin['severity']}] {fin['type']} in {fin['file']}: {fin['detail']}")
        
    return findings, all_routes, frontend_api_calls

if __name__ == "__main__":
    audit_secrets_and_syntax(".")
