import os
import sys

def scan_project(root_dir="."):
    tree = {}
    ignored_dirs = {'.git', 'node_modules', '.next', '__pycache__', '.venv', 'venv'}
    
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in ignored_dirs]
        for f in files:
            ext = os.path.splitext(f)[1]
            p = os.path.relpath(os.path.join(root, f), root_dir).replace("\\", "/")
            tree.setdefault(ext, []).append(p)
            
    print("=== FILE COUNT BY EXTENSION ===")
    for ext, filelist in sorted(tree.items()):
        print(f"  {ext if ext else '(no ext)'}: {len(filelist)}")
        
    print("\n=== PYTHON MODULES & SCRIPTS ===")
    py_files = sorted(tree.get('.py', []))
    for p in py_files:
        print(f"  {p}")
        
    print("\n=== NEXT.JS APP ROUTES & PAGES ===")
    app_routes = [p for p in tree.get('.tsx', []) + tree.get('.ts', []) if p.startswith('app/') or p.startswith('frontend/app/')]
    pages = [p for p in app_routes if p.endswith('page.tsx') or p.endswith('route.ts')]
    for p in sorted(pages):
        print(f"  {p}")

    print("\n=== DATABASE FILES & SCHEMAS ===")
    db_files = [p for p in tree.get('.db', []) + tree.get('.sqlite', []) + tree.get('.sql', []) + tree.get('.prisma', [])]
    for p in sorted(db_files):
        print(f"  {p}")

if __name__ == "__main__":
    scan_project(".")
