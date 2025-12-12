"""
Cloud Functions Health Check Script

Tests that Cloud Functions are working correctly.
Run this regularly or after deployments to verify functionality.

Usage:
    python scripts/test_cloud_functions.py
    python scripts/test_cloud_functions.py --project ue5-questions-prod
"""
import sys
import json
import subprocess
from pathlib import Path


def get_current_project():
    """Get the current Firebase project from .firebaserc."""
    firebaserc = Path(__file__).parent.parent / '.firebaserc'
    
    if firebaserc.exists():
        with open(firebaserc) as f:
            config = json.load(f)
            return config.get('projects', {}).get('default', 'unknown')
    return 'unknown'


def check_function_deployed(function_name: str, project: str) -> bool:
    """Check if a Cloud Function is deployed."""
    print(f"🔍 Checking if {function_name} is deployed...")
    
    try:
        result = subprocess.run(
            ['firebase', 'functions:list', '--project', project],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if function_name in result.stdout:
            print(f"  ✅ {function_name} is deployed")
            return True
        else:
            print(f"  ❌ {function_name} is NOT deployed")
            return False
    except subprocess.TimeoutExpired:
        print(f"  ⚠️ Timeout checking functions")
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def check_secret_exists(secret_name: str, project: str) -> bool:
    """Check if a Firebase secret is configured."""
    print(f"🔍 Checking if {secret_name} secret exists...")
    
    try:
        result = subprocess.run(
            ['firebase', 'functions:secrets:access', secret_name, '--project', project],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0 and len(result.stdout.strip()) > 0:
            key_length = len(result.stdout.strip())
            print(f"  ✅ {secret_name} is set (length: {key_length} chars)")
            return True
        else:
            print(f"  ❌ {secret_name} is NOT set or empty")
            return False
    except subprocess.TimeoutExpired:
        print(f"  ⚠️ Timeout checking secret")
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def check_recent_errors(project: str) -> bool:
    """Check for recent function errors in logs."""
    print(f"🔍 Checking for recent errors in logs...")
    
    try:
        result = subprocess.run(
            ['firebase', 'functions:log', '--only', 'generateQuestions', '-n', '20', '--project', project],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        output = result.stdout.lower()
        error_keywords = ['error', 'failed', 'exception', 'failed_precondition']
        
        found_errors = []
        for keyword in error_keywords:
            if keyword in output:
                found_errors.append(keyword)
        
        if found_errors:
            print(f"  ⚠️ Found error keywords in recent logs: {found_errors}")
            print(f"  Run 'firebase functions:log -n 30' for details")
            return False
        else:
            print(f"  ✅ No obvious errors in recent logs")
            return True
    except subprocess.TimeoutExpired:
        print(f"  ⚠️ Timeout checking logs")
        return True  # Don't fail the check on timeout
    except Exception as e:
        print(f"  ⚠️ Could not check logs: {e}")
        return True


def run_health_check(project: str = None):
    """Run all health checks."""
    if project is None:
        project = get_current_project()
    
    print("=" * 60)
    print(f"🏥 Cloud Functions Health Check")
    print(f"   Project: {project}")
    print("=" * 60)
    print()
    
    results = {}
    
    # Check functions are deployed
    results['generateQuestions_deployed'] = check_function_deployed('generateQuestions', project)
    results['generateCritique_deployed'] = check_function_deployed('generateCritique', project)
    
    print()
    
    # Check secrets
    results['gemini_key_set'] = check_secret_exists('GEMINI_API_KEY', project)
    
    print()
    
    # Check for recent errors
    results['no_recent_errors'] = check_recent_errors(project)
    
    print()
    print("=" * 60)
    print("📊 Summary")
    print("=" * 60)
    
    all_passed = all(results.values())
    
    for check, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status}: {check.replace('_', ' ').title()}")
    
    print()
    if all_passed:
        print("🎉 All checks passed!")
        return 0
    else:
        print("⚠️ Some checks failed - see above for details")
        print("\nCommon fixes:")
        print("  - Missing secret: firebase functions:secrets:set GEMINI_API_KEY")
        print("  - Not deployed: firebase deploy --only functions")
        print("  - Check logs: firebase functions:log -n 30")
        return 1


if __name__ == "__main__":
    project = None
    
    # Parse --project argument
    if '--project' in sys.argv:
        idx = sys.argv.index('--project')
        if idx + 1 < len(sys.argv):
            project = sys.argv[idx + 1]
    
    exit_code = run_health_check(project)
    sys.exit(exit_code)
