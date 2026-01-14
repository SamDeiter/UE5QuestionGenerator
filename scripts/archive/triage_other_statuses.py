#!/usr/bin/env python3
"""
Triage Questions with Non-Standard Statuses

This script identifies all questions with statuses other than:
- pending
- accepted  
- rejected
- (empty/null)

And provides options to view, fix, or delete them.

Usage:
    python triage_other_statuses.py                 # Analyze all "other" statuses
    python triage_other_statuses.py --fix-deleted   # Change "deleted" to actual deletion
    python triage_other_statuses.py --discipline "Look Dev"  # Filter by discipline
"""

import firebase_admin
from firebase_admin import credentials, firestore
import sys
from collections import defaultdict

STANDARD_STATUSES = {'pending', 'accepted', 'rejected', None, ''}

def init_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        firebase_admin.get_app()
        print("✅ Firebase already initialized")
    except ValueError:
        cred = credentials.Certificate('serviceAccountKey.json')
        firebase_admin.initialize_app(cred)
        print("✅ Firebase initialized")
    
    return firestore.client()

def analyze_statuses(db, discipline=None):
    """
    Analyze all question statuses in the database
    
    Args:
        db: Firestore client
        discipline: Optional discipline filter
    """
    print("\n📊 ANALYZING QUESTION STATUSES")
    print("="*60)
    
    # Query all questions
    query = db.collection('questions')
    if discipline:
        query = query.where('discipline', '==', discipline)
        print(f"📍 Filtering by discipline: {discipline}")
    
    docs = list(query.stream())
    print(f"📈 Total questions found: {len(docs)}")
    
    # Categorize by status
    status_counts = defaultdict(int)
    other_questions = []
    
    for doc in docs:
        data = doc.to_dict()
        status = data.get('status', '')
        
        # Normalize empty/null to "pending"
        if not status:
            status = '(empty/pending)'
        
        status_counts[status] += 1
        
        # Track non-standard statuses
        if status not in STANDARD_STATUSES and status != '(empty/pending)':
            other_questions.append({
                'id': doc.id,
                'status': status,
                'discipline': data.get('discipline', 'N/A'),
                'question': (data.get('question') or 'N/A')[:60],
                'uniqueId': data.get('uniqueId', 'N/A')
            })
    
    # Print summary
    print("\n📋 STATUS BREAKDOWN:")
    print("-"*40)
    for status, count in sorted(status_counts.items(), key=lambda x: -x[1]):
        marker = "  " if status in ['(empty/pending)', 'pending', 'accepted', 'rejected'] else "⚠️"
        print(f"{marker} {status}: {count}")
    
    # Print "other" details
    if other_questions:
        print(f"\n⚠️  FOUND {len(other_questions)} QUESTIONS WITH NON-STANDARD STATUSES")
        print("-"*60)
        
        # Group by status
        by_status = defaultdict(list)
        for q in other_questions:
            by_status[q['status']].append(q)
        
        for status, questions in sorted(by_status.items()):
            print(f"\n📌 Status: '{status}' ({len(questions)} questions)")
            for q in questions[:5]:  # Show first 5
                print(f"   • [{q['discipline']}] {q['question']}...")
            if len(questions) > 5:
                print(f"   ... and {len(questions) - 5} more")
    else:
        print("\n✅ All questions have standard statuses!")
    
    return other_questions

def fix_deleted_status(db, dry_run=True):
    """
    Convert questions with status='deleted' to actual Firestore deletions
    """
    print("\n🗑️  FIX DELETED STATUS")
    print(f"Mode: {'DRY RUN' if dry_run else '⚠️ LIVE DELETE'}")
    
    # Query for "deleted" status
    docs = list(db.collection('questions').where('status', '==', 'deleted').stream())
    
    if not docs:
        print("✅ No questions with status='deleted' found")
        return 0
    
    print(f"📊 Found {len(docs)} questions with status='deleted'")
    
    if dry_run:
        print("\n⚠️ DRY RUN - No changes made")
        print("Run with --fix-deleted --no-dry-run to actually delete")
        return len(docs)
    
    # Confirm
    response = input(f"\nType 'DELETE' to permanently remove {len(docs)} questions: ")
    if response != 'DELETE':
        print("❌ Cancelled")
        return 0
    
    # Delete in batches
    batch_size = 500
    deleted = 0
    for i in range(0, len(docs), batch_size):
        batch = db.batch()
        for doc in docs[i:i+batch_size]:
            batch.delete(doc.reference)
        batch.commit()
        deleted += len(docs[i:i+batch_size])
        print(f"  Deleted {deleted}/{len(docs)}...")
    
    print(f"\n✅ Deleted {deleted} questions")
    return deleted

def fix_to_pending(db, status_to_fix, dry_run=True):
    """
    Change a specific non-standard status to 'pending'
    """
    print(f"\n🔧 FIX STATUS: '{status_to_fix}' → 'pending'")
    print(f"Mode: {'DRY RUN' if dry_run else '⚠️ LIVE UPDATE'}")
    
    docs = list(db.collection('questions').where('status', '==', status_to_fix).stream())
    
    if not docs:
        print(f"✅ No questions with status='{status_to_fix}' found")
        return 0
    
    print(f"📊 Found {len(docs)} questions to update")
    
    if dry_run:
        print("\n⚠️ DRY RUN - No changes made")
        return len(docs)
    
    # Confirm
    response = input(f"\nType 'FIX' to update {len(docs)} questions to 'pending': ")
    if response != 'FIX':
        print("❌ Cancelled")
        return 0
    
    # Update in batches
    batch_size = 500
    updated = 0
    for i in range(0, len(docs), batch_size):
        batch = db.batch()
        for doc in docs[i:i+batch_size]:
            batch.update(doc.reference, {'status': 'pending'})
        batch.commit()
        updated += len(docs[i:i+batch_size])
        print(f"  Updated {updated}/{len(docs)}...")
    
    print(f"\n✅ Updated {updated} questions to 'pending'")
    return updated

def main():
    """Main entry point"""
    args = sys.argv[1:]
    
    discipline = None
    if '--discipline' in args:
        idx = args.index('--discipline')
        if idx + 1 < len(args):
            discipline = args[idx + 1]
    
    db = init_firebase()
    
    if '--fix-deleted' in args:
        dry_run = '--no-dry-run' not in args
        fix_deleted_status(db, dry_run=dry_run)
    elif '--fix-status' in args:
        idx = args.index('--fix-status')
        if idx + 1 < len(args):
            status_to_fix = args[idx + 1]
            dry_run = '--no-dry-run' not in args
            fix_to_pending(db, status_to_fix, dry_run=dry_run)
    else:
        # Default: analyze
        analyze_statuses(db, discipline=discipline)
    
    print("\n" + "="*60)
    print("💡 Options:")
    print("   --fix-deleted          Delete questions with status='deleted'")
    print("   --fix-status <status>  Change <status> to 'pending'")
    print("   --discipline <name>    Filter by discipline")
    print("   --no-dry-run           Actually make changes (default: dry run)")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
