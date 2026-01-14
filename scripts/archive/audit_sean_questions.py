"""
Sean Account Audit Script

This script identifies all questions that were reviewed, accepted, or modified
by Sean Spitzer and rejects them so they can be properly re-reviewed.

Usage:
  python scripts/audit_sean_questions.py --dry-run   # Preview only
  python scripts/audit_sean_questions.py --apply     # Actually reject
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import argparse

def init_firebase():
    """Initialize Firebase with default credentials"""
    if not firebase_admin._apps:
        try:
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, {
                'projectId': 'ue5-questions-prod'
            })
        except Exception as e:
            print(f"❌ Could not initialize Firebase: {e}")
            return None
    return firestore.client()

def find_sean_questions(db):
    """
    Find all questions modified by Sean.
    Looking for:
    - reviewerName containing "Sean" or "Spitzer"
    - acceptedBy containing "Sean" or "Spitzer"
    - humanVerifiedBy containing "Sean" or "Spitzer"
    """
    questions_ref = db.collection('questions')
    all_questions = questions_ref.stream()
    
    affected = []
    clean = []
    
    sean_identifiers = ['sean', 'spitzer', 'sean.spitzer', 'seanspitzer']
    
    for doc in all_questions:
        q_id = doc.id
        data = doc.to_dict()
        
        # Check various fields for Sean's involvement
        reviewer_name = (data.get('reviewerName') or '').lower()
        accepted_by = (data.get('acceptedBy') or '').lower()
        verified_by = (data.get('humanVerifiedBy') or '').lower()
        rejected_by = (data.get('rejectedBy') or '').lower()
        
        is_sean_involved = any(
            identifier in field 
            for identifier in sean_identifiers 
            for field in [reviewer_name, accepted_by, verified_by, rejected_by]
        )
        
        if is_sean_involved:
            affected.append({
                'id': q_id,
                'question': data.get('question', '')[:60],
                'status': data.get('status'),
                'reviewerName': data.get('reviewerName'),
                'acceptedBy': data.get('acceptedBy'),
                'humanVerifiedBy': data.get('humanVerifiedBy'),
                'rejectedBy': data.get('rejectedBy')
            })
        else:
            clean.append(q_id)
    
    return affected, clean

def reject_questions(db, affected, apply=False):
    """Reject all questions identified as Sean's work"""
    fixed = 0
    errors = 0
    
    for q in affected:
        print(f"\n  [Sean's Review]")
        print(f"    ID: {q['id']}")
        print(f"    Question: {q['question']}...")
        print(f"    Current status: {q['status']}")
        print(f"    Reviewer: {q.get('reviewerName', 'N/A')}")
        print(f"    AcceptedBy: {q.get('acceptedBy', 'N/A')}")
        print(f"    VerifiedBy: {q.get('humanVerifiedBy', 'N/A')}")
        
        if apply:
            try:
                db.collection('questions').document(q['id']).update({
                    'status': 'rejected',
                    'rejectionReason': 'Automated rejection - review audit',
                    'rejectionCategory': 'Quality: Review process not followed',
                    'rejectionNotes': f"Rejected by system audit - questions reviewed by Sean require re-review. Original status: {q['status']}",
                    'rejectedAt': datetime.now().isoformat(),
                    'rejectedBy': 'system-audit',
                    # Reset review fields
                    'humanVerified': False,
                    'humanVerifiedBy': None,
                    'humanVerifiedAt': None,
                    'critiqueScore': None,
                    'critique': None,
                    'improvementsApplied': False,
                })
                print(f"    ✅ REJECTED")
                fixed += 1
            except Exception as e:
                print(f"    ❌ ERROR: {e}")
                errors += 1
        else:
            print(f"    🔄 Would reject and reset for re-review")
            fixed += 1
    
    return fixed, errors

def main():
    parser = argparse.ArgumentParser(description='Audit and reject Sean\'s reviewed questions')
    parser.add_argument('--apply', action='store_true', help='Actually apply changes')
    parser.add_argument('--dry-run', action='store_true', help='Preview only (default)')
    args = parser.parse_args()
    
    apply = args.apply
    
    print("=" * 60)
    print("SEAN ACCOUNT AUDIT SCRIPT")
    print(f"Mode: {'🔴 APPLY CHANGES' if apply else '🟢 DRY RUN (preview only)'}")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)
    
    db = init_firebase()
    if not db:
        return 1
    
    print("\n📊 Scanning Firestore for questions reviewed by Sean...")
    affected, clean = find_sean_questions(db)
    
    print(f"\n📈 Found {len(affected)} questions with Sean's involvement")
    print(f"   Clean questions: {len(clean)}")
    
    if not affected:
        print("\n✓ No questions found with Sean's involvement.")
        return 0
    
    fixed, errors = reject_questions(db, affected, apply)
    
    print("\n" + "=" * 60)
    print(f"SUMMARY: {fixed} questions {'rejected' if apply else 'would be rejected'}, {errors} errors")
    print("=" * 60)
    
    if not apply:
        print("\n💡 To apply changes, run with --apply flag")
    
    return 0

if __name__ == "__main__":
    exit(main())
