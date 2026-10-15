import sys
import os

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

print(f"Testing backend import from ROOT: {ROOT_DIR}")

try:
    from backend.app.main import app
    print("SUCCESS: FastAPI app imported successfully!")
    print(f"App title: {app.title}, version: {app.version}")
except Exception as e:
    import traceback
    print("ERROR importing backend app:")
    traceback.print_exc()
    sys.exit(1)
