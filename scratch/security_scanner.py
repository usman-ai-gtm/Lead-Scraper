import os
import re

root = r"D:\DATA D\LUXURY DASHBOARD"

secret_patterns = [
    (r'(?:api_key|apikey|secret|token|password)\s*=\s*[\'"][a-zA-Z0-9_\-\.]{20,}[\'"]', 'Potential Hardcoded Secret Assignment'),
    (r'AIza[0-9A-Za-z-_]{35}', 'Google API Key'),
    (r'sk-[a-zA-Z0-9]{32,}', 'OpenAI Secret Key'),
    (r'ghp_[a-zA-Z0-9]{36}', 'GitHub Personal Access Token'),
    (r'sq0csp-[0-9A-Za-z-_]{43}', 'Square OAuth Secret'),
    (r'xox[baprs]-[0-9a-zA-Z]{10,48}', 'Slack Token')
]

raw_sql_patterns = [
    (r'execute\([\'"].*?%s.*?[\'"]\s*%', 'Raw String Formatting in SQL'),
    (r'execute\([fF][\'"].*?\{.*?\}', 'f-string Interpolation in SQL')
]

findings = []

for r, d, fs in os.walk(root):
    if any(ign in r for ign in ['node_modules', '.next', '__pycache__', '.git', 'backups', 'scratch']):
        continue
    for f in fs:
        if f.endswith(('.py', '.ts', '.tsx', '.js', '.mjs')) and not f.startswith('test_'):
            p = os.path.join(r, f)
            rel = os.path.relpath(p, root)
            with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                lines = fp.readlines()
            for idx, line in enumerate(lines):
                line_str = line.strip()
                for pat, desc in secret_patterns:
                    if re.search(pat, line_str, re.IGNORECASE) and not any(ok in line_str.lower() for ok in ['example', 'placeholder', 'dummy', 'your_', 'test', 'os.getenv', 'process.env']):
                        findings.append((rel, idx+1, 'SECRET', desc, line_str[:60]))
                for pat, desc in raw_sql_patterns:
                    if re.search(pat, line_str):
                        findings.append((rel, idx+1, 'SQL_INJECTION', desc, line_str[:60]))

print(f"Total Security Findings: {len(findings)}\n")
for f in findings:
    print(f"[{f[2]}] {f[0]}:{f[1]} -> {f[3]}")
    # Don't print the actual secret snippet if secret
    if f[2] != 'SECRET':
        print(f"    Code: {f[4]}")
