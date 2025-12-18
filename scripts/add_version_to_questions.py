"""
Firestore Version Migration Script

This script adds a 'version' field to all existing questions in the Firestore database.

Purpose: Enable optimistic concurrency control for concurrent editing protection.

Usage:
    python scripts/add_version_to_questions.py [--dry-run] [--batch-size 500]

Options:
    --dry-run       Show what would be updated without making changes
    --batch-size    Number of documents to process per batch (default: 500)

Requirements:
    - Firebase Admin SDK credentials (serviceAccountKey.json)
    - Python 3.7+
    - firebase-admin package: pip install firebase-admin
"""

import argparse
import sys
from datetime import datetime

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("Error: firebase-admin package not installed.")
    print("Install it with: pip install firebase-admin")
    sys.exit(1)


def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Check if already initialized
        firebase_admin.get_app()
        print("Firebase already initialized")
    except ValueError:
        # Initialize with service account
        cred = credentials.Certificate('serviceAccountKey.json')
        firebase_admin.initialize_app(cred)
        print("Firebase initialized successfully")


def add_version_to_questions(dry_run=False, batch_size=500):
    """
    Add version field to all questions that don't have one
    
    Args:
        dry_run: If True, only show what would be updated
        batch_size: Number of documents to process per batch
    """
    db = firestore.client()
    questions_ref = db.collection('questions')
    
    # Get all questions
    print(f"Fetching all questions from Firestore...")
    questions = questions_ref.stream()
    
    total_count = 0
    updated_count = 0
    already_versioned_count = 0
    batch = db.batch()
    batch_count = 0
    
    for doc in questions:
        total_count += 1
        doc_data = doc.to_dict()
        
        # Check if version field already exists
        if 'version' in doc_data:
            already_versioned_count += 1
            print(f"  ✓ {doc.id}: Already has version {doc_data['version']}")
            continue
        
        # Add version field
        if dry_run:
            print(f"  [DRY RUN] Would add version: 1 to {doc.id}")
            updated_count += 1
        else:
            batch.update(doc.reference, {'version': 1})
            batch_count += 1
            updated_count += 1
            print(f"  + {doc.id}: Adding version: 1")
            
            # Commit batch when it reaches the limit
            if batch_count >= batch_size:
                print(f"\nCommitting batch of {batch_count} updates...")
                batch.commit()
                batch = db.batch()
                batch_count = 0
                print("Batch committed successfully\n")
    
    # Commit any remaining updates
    if batch_count > 0 and not dry_run:
        print(f"\nCommitting final batch of {batch_count} updates...")
        batch.commit()
        print("Final batch committed successfully\n")
    
    # Print summary
    print("\n" + "="*60)
    print("MIGRATION SUMMARY")
    print("="*60)
    print(f"Total questions found:          {total_count}")
    print(f"Already have version field:     {already_versioned_count}")
    print(f"{'Would be updated' if dry_run else 'Updated'}:                   {updated_count}")
    print("="*60)
    
    if dry_run:
        print("\n⚠️  DRY RUN MODE - No changes were made")
        print("Run without --dry-run to apply changes")
    else:
        print("\n✅ Migration completed successfully!")
        print(f"   {updated_count} questions now have version: 1")
    
    return {
        'total': total_count,
        'updated': updated_count,
        'already_versioned': already_versioned_count
    }


def verify_migration():
    """Verify that all questions now have a version field"""
    db = firestore.client()
    questions_ref = db.collection('questions')
    
    print("\n" + "="*60)
    print("VERIFICATION")
    print("="*60)
    
    # Query for questions without version field
    questions_without_version = questions_ref.where('version', '==', None).stream()
    missing_version = list(questions_without_version)
    
    if len(missing_version) > 0:
        print(f"⚠️  WARNING: {len(missing_version)} questions still missing version field:")
        for doc in missing_version[:10]:  # Show first 10
            print(f"  - {doc.id}")
        if len(missing_version) > 10:
            print(f"  ... and {len(missing_version) - 10} more")
        return False
    else:
        print("✅ All questions have a version field")
        
        # Show some examples
        print("\nSample questions:")
        sample_questions = questions_ref.limit(5).stream()
        for doc in sample_questions:
            data = doc.to_dict()
            print(f"  {doc.id}: version = {data.get('version', 'MISSING')}")
        
        return True


def main():
    parser = argparse.ArgumentParser(
        description='Add version field to all Firestore questions'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be updated without making changes'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=500,
        help='Number of documents to process per batch (default: 500)'
    )
    parser.add_argument(
        '--verify-only',
        action='store_true',
        help='Only verify migration status without making changes'
    )
    
    args = parser.parse_args()
    
    print("="*60)
    print("FIRESTORE VERSION MIGRATION SCRIPT")
    print("="*60)
    print(f"Mode: {'VERIFY ONLY' if args.verify_only else 'DRY RUN' if args.dry_run else 'LIVE UPDATE'}")
    print(f"Batch size: {args.batch_size}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60 + "\n")
    
    # Initialize Firebase
    initialize_firebase()
    
    if args.verify_only:
        # Only run verification
        verify_migration()
    else:
        # Run migration
        result = add_version_to_questions(
            dry_run=args.dry_run,
            batch_size=args.batch_size
        )
        
        # Run verification if not dry run
        if not args.dry_run:
            verify_migration()


if __name__ == '__main__':
    main()
