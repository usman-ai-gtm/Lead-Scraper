import os
import sys
import requests
import zipfile
import shutil

NODE_URL = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip"
TARGET_DIR = os.path.join(os.environ.get("LOCALAPPDATA", "C:\\"), "Programs")
os.makedirs(TARGET_DIR, exist_ok=True)
ZIP_PATH = os.path.join(TARGET_DIR, "node.zip")
NODEJS_DIR = os.path.join(TARGET_DIR, "nodejs")

print(f"Downloading Node.js (28MB) from {NODE_URL}...")
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
r = requests.get(NODE_URL, headers=headers, stream=True, timeout=60)
total_size = int(r.headers.get('content-length', 0))
downloaded = 0

with open(ZIP_PATH, 'wb') as f:
    for chunk in r.iter_content(chunk_size=1024*1024):
        if chunk:
            f.write(chunk)
            downloaded += len(chunk)
            sys.stdout.write(f"\rProgress: {downloaded // 1024 // 1024}MB / {total_size // 1024 // 1024}MB ({(downloaded/total_size)*100:.1f}%)")
            sys.stdout.flush()

print("\nExtracting...")
with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
    zip_ref.extractall(TARGET_DIR)

extracted_folder = os.path.join(TARGET_DIR, "node-v20.18.0-win-x64")
if os.path.exists(NODEJS_DIR):
    shutil.rmtree(NODEJS_DIR, ignore_errors=True)
os.rename(extracted_folder, NODEJS_DIR)
if os.path.exists(ZIP_PATH):
    os.remove(ZIP_PATH)

print(f"Node.js successfully installed at: {NODEJS_DIR}")
node_exe = os.path.join(NODEJS_DIR, "node.exe")
npm_cmd = os.path.join(NODEJS_DIR, "npm.cmd")
print("Node version:", os.popen(f'"{node_exe}" -v').read().strip())
print("Npm version:", os.popen(f'"{npm_cmd}" -v').read().strip())
