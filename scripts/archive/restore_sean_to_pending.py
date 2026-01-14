"""
Restore Sean's Questions to Pending

This script finds all questions that were rejected by the audit script
(rejection reason contains "review audit") and restores them to pending
status for proper re-review.

Usage:
  python scripts/restore_sean_to_pending.py --dry-run   # Preview only
  python scripts/restore_sean_to_pending.py --apply     # Actually restore
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

def find_sean_rejected_questions(db):
    """
    Find all questions that were rejected by the Sean audit.
    These have rejectionNotes containing "questions reviewed by Sean"
    """
    questions_ref = db.collection('questions')
    all_questions = questions_ref.stream()
    
    affected = []
    
    for doc in all_questions:
        q_id = doc.id
        data = doc.to_dict()
        
        # Find questions rejected by our audit script
        rejection_notes = data.get('rejectionNotes', '') or ''
        rejected_by = data.get('rejectedBy', '') or ''
        status = data.get('status', '')
        
        is_audit_rejection = (
            'system-audit' in rejected_by or
            'questions reviewed by Sean' in rejection_notes
        )
        
        if status == 'rejected' and is_audit_rejection:
            affected.append({
                'id': q_id,
                'question': data.get('question', '')[:60],
                'status': data.get('status'),
                'rejectionNotes': rejection_notes[:50] if rejection_notes else 'N/A',
                'discipline': data.get('discipline', 'Unknown')
            })
    
    return affected

def restore_to_pending(db, affected, apply=False):
    """Restore all audit-rejected questions to pending status"""
    fixed = 0
    errors = 0
    
    for q in affected:
        print(f"\n  [Restoring to Pending]")
        print(f"    ID: {q['id']}")
        print(f"    Question: {q['question']}...")
        print(f"    Discipline: {q['discipline']}")
        
        if apply:
            try:
                db.collection('questions').document(q['id']).update({
                    'status': 'pending',
                    # Clear rejection fields
                    'rejectionReason': None,
                    'rejectionCategory': None,
                    'rejectionNotes': None,
                    'rejectedAt': None,
                    'rejectedBy': None,
                    # Keep review fields cleared so they go through fresh review
                    'humanVerified': False,
                    'humanVerifiedBy': None,
                    'humanVerifiedAt': None,
                    'critiqueScore': None,
                    'critique': None,
                    'improvementsApplied': False,
                    # Clear reviewer attribution
                    'reviewerName': None,
                    # Track restoration
                    'restoredAt': datetime.now().isoformat(),
                    'restoredBy': 'system-restore',
                    'restoredReason': 'Restored from Sean audit rejection for proper re-review'
                })
                print(f"    ✅ RESTORED TO PENDING")
                fixed += 1
            except Exception as e:
                print(f"    ❌ ERROR: {e}")
                errors += 1
        else:
            print(f"    🔄 Would restore to pending")
            fixed += 1
    
    return fixed, errors

def main():
    parser = argparse.ArgumentParser(description='Restore Sean\'s rejected questions to pending')
    parser.add_argument('--apply', action='store_true', help='Actually apply changes')
    parser.add_argument('--dry-run', action='store_true', help='Preview only (default)')
    args = parser.parse_args()
    
    apply = args.apply
    
    print("=" * 60)
    print("RESTORE SEAN'S QUESTIONS TO PENDING")
    print(f"Mode: {'🔴 APPLY CHANGES' if apply else '🟢 DRY RUN (preview only)'}")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)
    
    db = init_firebase()
    if not db:
        return 1
    
    print("\n📊 Scanning for audit-rejected questions...")
    affected = find_sean_rejected_questions(db)
    
    print(f"\n📈 Found {len(affected)} questions to restore")
    
    # Group by discipline for summary
    by_discipline = {}
    for q in affected:
        disc = q['discipline']
        by_discipline[disc] = by_discipline.get(disc, 0) + 1
    
    print("\n📋 Breakdown by discipline:")
    for disc, count in sorted(by_discipline.items(), key=lambda x: -x[1]):
        print(f"   {disc}: {count}")
    
    if not affected:
        print("\n✓ No questions found to restore.")
        return 0
    
    fixed, errors = restore_to_pending(db, affected, apply)
    
    print("\n" + "=" * 60)
    print(f"SUMMARY: {fixed} questions {'restored' if apply else 'would be restored'}, {errors} errors")
    print("=" * 60)
    
    if not apply:
        print("\n💡 To apply changes, run with --apply flag")
    
    return 0

if __name__ == "__main__":
    exit(main())
