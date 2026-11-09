import os
from collections import defaultdict

ext_map = {
    ".ts": "TypeScript", ".tsx": "TypeScript (React)",
    ".js": "JavaScript", ".jsx": "JavaScript (React)", ".mjs": "JavaScript",
    ".py": "Python", ".sql": "SQL", ".css": "CSS",
    ".html": "HTML", ".json": "JSON", ".md": "Markdown",
    ".bat": "Batch", ".ps1": "PowerShell", ".yaml": "YAML", ".yml": "YAML",
    ".java": "Java"
}

counts = defaultdict(lambda: {"files": 0, "lines": 0})
ignore_dirs = {"node_modules", ".next", ".git", ".system_generated", "venv", "env", "__pycache__"}

for root, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in ignore_dirs]
    for f in files:
        ext = os.path.splitext(f)[1].lower()
        lang = ext_map.get(ext)
        if lang:
            path = os.path.join(root, f)
            counts[lang]["files"] += 1
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as fp:
                    counts[lang]["lines"] += sum(1 for _ in fp)
            except Exception:
                pass

print(f"{'Language':<25} | {'Files':<8} | {'Lines of Code':<12}")
print("-" * 52)
total_files = sum(v['files'] for v in counts.values())
total_lines = sum(v['lines'] for v in counts.values())
for lang, data in sorted(counts.items(), key=lambda x: x[1]['lines'], reverse=True):
    print(f"{lang:<25} | {data['files']:<8} | {data['lines']:<12}")
print("-" * 52)
print(f"{'TOTAL':<25} | {total_files:<8} | {total_lines:<12}")

if "Java" not in counts:
    print("\n[VERIFIED] Java files found: 0 (Java is entirely absent from the codebase)")
