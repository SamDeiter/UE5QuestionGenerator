"""
Switch between development and production Firebase configs.
Usage: python scripts/switch_firebase_env.py [dev|prod]
"""
import sys
from pathlib import Path
import shutil


def switch_env(target: str) -> None:
    """Switch Firebase environment."""
    project_root = Path(__file__).parent.parent
    
    if target == "dev":
        # Copy .env.local (dev) to .env.active
        source = project_root / ".env.local"
        dest = project_root / ".env.active"
        print("🔄 Switching to DEVELOPMENT environment...")
        print("   Database: UE5QuestionsSoure")
    elif target == "prod":
        # Copy .env.production to .env.active
        source = project_root / ".env.production"
        dest = project_root / ".env.active"
        print("🔄 Switching to PRODUCTION environment...")
        print("   Database: ue5-questions-prod")
    else:
        print("❌ Invalid target. Use 'dev' or 'prod'")
        sys.exit(1)
    
    if not source.exists():
        print(f"❌ Source file not found: {source}")
        sys.exit(1)
    
    # Copy the file
    shutil.copy2(source, dest)
    print(f"✅ Copied {source.name} → {dest.name}")
    print("\n⚠️  IMPORTANT: Restart your dev server for changes to take effect!")
    print("   Run: npm run dev")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/switch_firebase_env.py [dev|prod]")
        sys.exit(1)
    
    switch_env(sys.argv[1])
