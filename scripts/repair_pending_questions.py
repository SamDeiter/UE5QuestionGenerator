"""
repair_pending_questions.py - Reset questions incorrectly advanced past critique step

This script identifies questions that were corrupted by today's bug where:
- Questions got critiqueScore set incorrectly during generation
- Questions were auto-advanced to verified/accepted without proper critique

It resets affected questions back to proper pending state.

Usage:
    python scripts/repair_pending_questions.py --dry-run  # Preview changes
    python scripts/repair_pending_questions.py --apply    # Apply fixes
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone
import argparse

# Initialize Firebase
def init_firebase():
    """Initialize Firebase Admin SDK using Application Default Credentials."""
    try:
        firebase_admin.get_app()
    except ValueError:
        # Use Application Default Credentials (from gcloud auth or GOOGLE_APPLICATION_CREDENTIALS)
        # This works if you've run: gcloud auth application-default login
        # Or if running in a GCP environment
        try:
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, {
                'projectId': 'ue5-questions-prod'
            })
        except Exception as e:
            print(f"❌ Could not initialize Firebase: {e}")
            print("   Please run: gcloud auth application-default login")
            print("   Or set GOOGLE_APPLICATION_CREDENTIALS to your service account key path")
            raise
    return firestore.client()


def get_affected_questions(db):
    """
    Find questions that were incorrectly advanced past critique.
    
    Criteria for affected questions:
    1. status is 'pending' but has critiqueScore set (shouldn't have been critiqued yet)
    2. humanVerified is true but no legitimate critique was run
    3. Questions modified today that have suspicious state
    """
    questions_ref = db.collection("questions")
    
    # Get all questions modified today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Query for questions with critiqueScore that might be incorrectly set
    all_docs = questions_ref.stream()
    
    affected = []
    clean = []
    
    for doc in all_docs:
        data = doc.to_dict()
        q_id = doc.id
        
        # Check for corruption indicators
        has_critique_score = data.get("critiqueScore") is not None
        has_critique_text = data.get("critique") is not None and len(str(data.get("critique", ""))) > 20
        is_human_verified = data.get("humanVerified") == True
        is_pending = data.get("status") == "pending"
        improvements_applied = data.get("improvementsApplied") == True
        
        # A question should ONLY have critiqueScore if:
        # 1. It has substantial critique text (from manual critique)
        # 2. OR improvementsApplied is True (from applying AI fix)
        
        legitimate_critique = has_critique_text or improvements_applied
        
        # CORRUPTION: Has critiqueScore but no legitimate critique
        if has_critique_score and not legitimate_critique:
            affected.append({
                "id": q_id,
                "question": data.get("question", "")[:80],
                "status": data.get("status"),
                "critiqueScore": data.get("critiqueScore"),
                "humanVerified": is_human_verified,
                "hasCritiqueText": has_critique_text,
                "issue": "critiqueScore without legitimate critique"
            })
        # CORRUPTION: humanVerified without proper critique
        elif is_human_verified and not has_critique_score and is_pending:
            affected.append({
                "id": q_id,
                "question": data.get("question", "")[:80],
                "status": data.get("status"),
                "critiqueScore": data.get("critiqueScore"),
                "humanVerified": is_human_verified,
                "hasCritiqueText": has_critique_text,
                "issue": "humanVerified without critique"
            })
        else:
            clean.append(q_id)
    
    return affected, clean


def repair_questions(db, affected, dry_run=True):
    """Reset affected questions to proper pending state."""
    
    if dry_run:
        print("\n🔍 DRY RUN - No changes will be made\n")
    else:
        print("\n⚠️  APPLYING FIXES - Changes will be made to Firestore\n")
    
    fixed = 0
    errors = 0
    
    for q in affected:
        print(f"  [{q['issue']}]")
        print(f"    ID: {q['id']}")
        print(f"    Question: {q['question']}...")
        print(f"    Current state: critiqueScore={q['critiqueScore']}, humanVerified={q['humanVerified']}")
        
        if not dry_run:
            try:
                db.collection("questions").document(q["id"]).update({
                    "critiqueScore": None,
                    "critique": None,
                    "humanVerified": False,
                    "humanVerifiedBy": None,
                    "humanVerifiedAt": None,
                    "improvementsApplied": False,
                    "suggestedRewrite": None,
                    "rewriteChanges": None,
                    "previousCritiqueScore": None,
                    # Keep status as-is since we want them to remain pending
                })
                print(f"    ✅ FIXED")
                fixed += 1
            except Exception as e:
                print(f"    ❌ ERROR: {e}")
                errors += 1
        else:
            print(f"    🔄 Would reset to clean pending state")
            fixed += 1
        
        print()
    
    return fixed, errors


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Repair corrupted question states")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without applying")
    parser.add_argument("--apply", action="store_true", help="Apply the fixes")
    args = parser.parse_args()
    
    if not args.dry_run and not args.apply:
        print("Please specify --dry-run or --apply")
        return
    
    print("=" * 60)
    print("QUESTION STATE REPAIR SCRIPT")
    print("=" * 60)
    print(f"Run time: {datetime.now().isoformat()}")
    
    db = init_firebase()
    
    print("\n📊 Scanning Firestore for affected questions...")
    affected, clean = get_affected_questions(db)
    
    print(f"\n📈 RESULTS:")
    print(f"   Clean questions: {len(clean)}")
    print(f"   Affected questions: {len(affected)}")
    
    if not affected:
        print("\n✅ No corrupted questions found!")
        return
    
    print(f"\n{'='*60}")
    print("AFFECTED QUESTIONS:")
    print("=" * 60)
    
    fixed, errors = repair_questions(db, affected, dry_run=not args.apply)
    
    print("=" * 60)
    print(f"SUMMARY: {fixed} questions {'would be ' if not args.apply else ''}fixed, {errors} errors")
    print("=" * 60)
    
    if not args.apply:
        print("\n💡 To apply fixes, run with --apply flag")


if __name__ == "__main__":
    main()
