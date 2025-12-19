import os
import shutil

# Paths
BASE_DIR = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator"
SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")
ARCHIVE_DIR = os.path.join(SCRIPTS_DIR, "archive")

# Ensure archive directory exists
if not os.path.exists(ARCHIVE_DIR):
    os.makedirs(ARCHIVE_DIR)

# Operational scripts to KEEP in scripts/
KEEP_SCRIPTS = {
    "switch_env.py",
    "test_cloud_functions.py",
    "setup_cloud_functions.py",
    "AgentServer.py",
    "add_version_to_questions.py",
    "cleanup_unused.py",
    "diagnose_firebase.py",
    "check_firebase_config.py",
    "check_vite_env.py",
    "README.md",
    "INVITE_LINKS.txt"
}

def organize_scripts():
    print(f"--- Organizing scripts in {SCRIPTS_DIR} ---")
    
    # 1. Archive scripts from scripts/
    for item in os.listdir(SCRIPTS_DIR):
        item_path = os.path.join(SCRIPTS_DIR, item)
        
        # Skip directories like archive, backups, etc.
        if os.path.isdir(item_path):
            continue
            
        if item in KEEP_SCRIPTS:
            print(f"[KEEP] {item}")
            continue
            
        # Archive everything else (JS, CJS, PY, etc.) that isn't a core operational script
        print(f"[ARCHIVE] {item}")
        shutil.move(item_path, os.path.join(ARCHIVE_DIR, item))

    # 2. Archive .py files from root
    print(f"\n--- Cleaning up root .py files ---")
    for item in os.listdir(BASE_DIR):
        if item.endswith(".py"):
            item_path = os.path.join(BASE_DIR, item)
            print(f"[ARCHIVE ROOT] {item}")
            shutil.move(item_path, os.path.join(ARCHIVE_DIR, item))

if __name__ == "__main__":
    organize_scripts()
