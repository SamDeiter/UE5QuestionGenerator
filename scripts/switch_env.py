"""
Firebase Environment Switcher

Easily switch between development and production Firebase configurations.
Supports separate API keys for dev and prod environments.

Usage:
    python scripts/switch_env.py dev   # Switch to development
    python scripts/switch_env.py prod  # Switch to production
"""
import sys
import shutil
from pathlib import Path


def switch_environment(env: str) -> None:
    """Switch between dev and prod Firebase environments."""
    project_root = Path(__file__).parent.parent
    
    if env not in ['dev', 'prod']:
        print("❌ Error: Environment must be 'dev' or 'prod'")
        sys.exit(1)
    
    # Define source files
    env_files = {
        'dev': project_root / '.env.development.base',  # Base dev config
        'prod': project_root / '.env.production'
    }
    
    # Check if base dev file exists, if not use .env.development
    if env == 'dev' and not env_files['dev'].exists():
        env_files['dev'] = project_root / '.env.development'
    
    source_file = env_files[env]
    
    # IMPORTANT: Vite loads .env.development in dev mode with high priority
    # We must update .env.development for changes to take effect
    target_files = [
        project_root / '.env.local',
        project_root / '.env.development',  # Vite uses this in dev mode!
    ]
    
    if not source_file.exists():
        print(f"❌ Error: {source_file} does not exist")
        print(f"\nCreate it with your {env} Firebase configuration:")
        print(f"  VITE_FIREBASE_API_KEY=your-{env}-api-key")
        print(f"  VITE_FIREBASE_AUTH_DOMAIN=your-{env}-project.firebaseapp.com")
        print(f"  VITE_FIREBASE_PROJECT_ID=your-{env}-project-id")
        print(f"  ... (other Firebase config values)")
        sys.exit(1)
    
    # Copy environment file to all target files
    for target_file in target_files:
        # Backup current file if it exists
        if target_file.exists():
            backup_file = project_root / f'{target_file.name}.backup.{env}'
            shutil.copy2(target_file, backup_file)
        shutil.copy2(source_file, target_file)
    
    print("=" * 60)
    print(f"✅ Switched to {env.upper()} environment")
    print("=" * 60)
    print(f"\nConfiguration loaded from: {source_file.name}")
    print(f"Updated files: .env.local, .env.development")
    print("\n📋 Next steps:")
    print("1. Restart your dev server: npm run dev")
    print("2. Hard refresh your browser (Ctrl+Shift+R)")
    print("\n" + "=" * 60)


def show_current_env() -> None:
    """Show which environment is currently active."""
    project_root = Path(__file__).parent.parent
    env_local = project_root / '.env.local'
    
    if not env_local.exists():
        print("❌ No active environment (.env.local not found)")
        return
    
    # Read project ID to determine environment
    with open(env_local, 'r') as f:
        content = f.read()
        if 'ue5questionssoure' in content:
            print("📍 Current environment: DEVELOPMENT (ue5questionssoure)")
        elif 'ue5-questions-prod' in content:
            print("📍 Current environment: PRODUCTION (ue5-questions-prod)")
        else:
            print("📍 Current environment: UNKNOWN")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Firebase Environment Switcher")
        print("=" * 60)
        show_current_env()
        print("\nUsage:")
        print("  python scripts/switch_env.py dev   # Switch to development")
        print("  python scripts/switch_env.py prod  # Switch to production")
        print("\n" + "=" * 60)
        sys.exit(0)
    
    env = sys.argv[1].lower()
    switch_environment(env)
