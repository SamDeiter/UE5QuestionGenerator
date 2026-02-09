import os
import glob
from datetime import datetime

repo_root = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator"

def get_recent_files(root, count=20):
    all_files = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Skip node_modules and .git
        if 'node_modules' in dirnames:
            dirnames.remove('node_modules')
        if '.git' in dirnames:
            dirnames.remove('.git')
        
        for f in filenames:
            fullpath = os.path.join(dirpath, f)
            try:
                mtime = os.path.getmtime(fullpath)
                all_files.append((fullpath, mtime))
            except OSError:
                continue
    
    # Sort by mtime descending
    all_files.sort(key=lambda x: x[1], reverse=True)
    return all_files[:count]

print("--- 20 Most Recently Modified Files ---")
recent = get_recent_files(repo_root)
for path, mtime in recent:
    dt = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
    print(f"{dt} | {path}")

print("\n--- Searching for InviteSignUp.test.jsx ---")
for dirpath, dirnames, filenames in os.walk(repo_root):
    if 'InviteSignUp.test.jsx' in filenames:
        print(f"Found: {os.path.join(dirpath, 'InviteSignUp.test.jsx')}")

print("\n--- Searching for SCORM related tests ---")
for dirpath, dirnames, filenames in os.walk(repo_root):
    for f in filenames:
        if 'scorm' in f.lower() and 'test' in f.lower():
            print(f"Found: {os.path.join(dirpath, f)}")
