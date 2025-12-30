#!/usr/bin/env python3
"""
Bulk Delete Soft-Deleted Questions from Firestore

This script permanently removes all questions with status: "deleted"
from the production Firestore database.

Usage:
    python delete_soft_deleted.py --dry-run        # Preview what will be deleted
    python delete_soft_deleted.py                  # Actually delete them
"""

import firebase_admin
from firebase_admin import credentials, firestore
import sys
import time

def init_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Check if already initialized
        firebase_admin.get_app()
        print("✅ Firebase already initialized")
    except ValueError:
        # Initialize with default credentials
        cred = credentials.Certificate('serviceAccountKey.json')
        firebase_admin.initialize_app(cred)
        print("✅ Firebase initialized")
    
    return firestore.client()

def delete_soft_deleted_questions(db, dry_run=True, discipline=None):
    """
    Delete all questions with status: "deleted"
    
    Args:
        db: Firestore client
        dry_run: If True, only preview without deleting
        discipline: Optional discipline filter (e.g., "VFX", "Look Dev")
    """
    print("\n🗑️  BULK DELETE: Soft-Deleted Questions")
    print(f"Mode: {'DRY RUN' if dry_run else '⚠️  LIVE DELETE'}")
    
    # Query for deleted questions
    query = db.collection('questions').where('status', '==', 'deleted')
    
    if discipline:
        query = query.where('discipline', '==', discipline)
        print(f"📍 Filtering by discipline: {discipline}")
    
    # Fetch all matching documents
    docs = list(query.stream())
    
    if not docs:
        print("✅ No deleted questions found. Database is clean!")
        return 0
    
    print(f"\n📊 Found {len(docs)} questions with status 'deleted'\n")
    
    # Show preview
    print("📋 Preview (first 10):")
    for i, doc in enumerate(docs[:10]):
        data = doc.to_dict()
        question_text = data.get('question', 'N/A')[:60]
        discipline_val = data.get('discipline', 'N/A')
        print(f"  {i+1}. {doc.id[:8]}... | {discipline_val} | {question_text}...")
    
    if len(docs) > 10:
        print(f"  ... and {len(docs) - 10} more")
    
    if dry_run:
        print("\n⚠️  DRY RUN - No questions were deleted")
        print("To actually delete, run: python delete_soft_deleted.py")
        return 0
    
    # Confirm deletion
    print("\n⚠️  LIVE DELETE MODE")
    print(f"About to permanently delete {len(docs)} questions from Firestore")
    print("This action CANNOT be undone!")
    
    response = input("\nType 'DELETE' to confirm: ")
    if response != 'DELETE':
        print("❌ Deletion cancelled")
        return 0
    
    # Delete in batches
    print("\n🔄 Deleting questions...")
    batch_size = 500
    deleted_count = 0
    
    for i in range(0, len(docs), batch_size):
        batch = db.batch()
        batch_docs = docs[i:i + batch_size]
        
        for doc in batch_docs:
            batch.delete(doc.reference)
        
        batch.commit()
        deleted_count += len(batch_docs)
        print(f"  Deleted {deleted_count}/{len(docs)} questions...")
        time.sleep(0.5)  # Rate limiting
    
    print(f"\n✅ Successfully deleted {deleted_count} questions from Firestore")
    print("💡 Refresh your app to see the updated counts")
    
    return deleted_count

def main():
    """Main entry point"""
    dry_run = '--dry-run' in sys.argv or '-d' in sys.argv
    
    # Initialize Firebase
    db = init_firebase()
    
    # Delete soft-deleted questions
    deleted = delete_soft_deleted_questions(db, dry_run=dry_run)
    
    print("\n" + "="*50)
    if dry_run:
        print(f"DRY RUN COMPLETE: Would delete {deleted} questions")
        print("Run without --dry-run to actually delete")
    else:
        print(f"DELETION COMPLETE: {deleted} questions removed")
    print("="*50 + "\n")

if __name__ == '__main__':
    main()
