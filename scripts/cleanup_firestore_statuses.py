import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

def cleanup_statuses(service_account_path=None):
    """
    Audit and cleanup non-standard statuses in Firestore.
    """
    # 1. Initialize Firebase
    if service_account_path and os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
    else:
        # Fallback to default credentials (e.g. if running in a GCP environment or local CLI authorized)
        firebase_admin.initialize_app()
    
    db = firestore.client()
    questions_ref = db.collection('questions')
    
    # Standard statuses
    STANDARD_STATUSES = ['pending', 'accepted', 'rejected', 'deleted']
    
    # 2. Audit
    print("🔍 Auditing questions for non-standard statuses...")
    docs = questions_ref.stream()
    
    counts = {}
    to_update = []
    
    for doc in docs:
        data = doc.to_dict()
        status = data.get('status')
        
        # Track counts
        counts[status] = counts.get(status, 0) + 1
        
        # Identify non-standard or misspelled
        if not status:
            to_update.append((doc.id, 'pending', 'Missing status -> pending'))
        else:
            s_lower = status.lower().strip()
            if s_lower == 'approved' or s_lower == 'success':
                to_update.append((doc.id, 'accepted', f"'{status}' -> 'accepted'"))
            elif s_lower == 'error' or s_lower == 'failed':
                to_update.append((doc.id, 'rejected', f"'{status}' -> 'rejected'"))
            elif s_lower not in STANDARD_STATUSES:
                to_update.append((doc.id, 'pending', f"Unknown '{status}' -> 'pending'"))
    
    print("\n📊 Current Status Breakdown:")
    for status, count in counts.items():
        print(f"  - {status}: {count}")
    
    if not to_update:
        print("\n✅ No non-standard statuses found. Database is clean!")
        return

    print(f"\n🛠️ Found {len(to_update)} questions to fix.")
    
    # 3. Dry Run Check
    dry_run = input("\nPerform actual update? (y/N): ").lower() != 'y'
    
    if dry_run:
        print("🚦 DRY RUN: No changes made.")
        for id, new_status, reason in to_update[:10]:
            print(f"  [DRY] {id}: {reason}")
        if len(to_update) > 10:
            print(f"  ... and {len(to_update) - 10} more.")
    else:
        print("🚀 Executing batch updates...")
        batch = db.batch()
        batch_count = 0
        total_fixed = 0
        
        for id, new_status, reason in to_update:
            doc_ref = questions_ref.document(id)
            batch.update(doc_ref, {'status': new_status})
            batch_count += 1
            total_fixed += 1
            
            if batch_count >= 400: # Firestore batch limit is 500
                batch.commit()
                batch = db.batch()
                batch_count = 0
                print(f"  Committed {total_fixed} updates...")
        
        if batch_count > 0:
            batch.commit()
        
        print(f"\n✅ Successfully cleaned up {total_fixed} question statuses.")

if __name__ == "__main__":
    # You can point to your service account JSON here
    key_path = "config/firebase/service-account.json"
    cleanup_statuses(key_path)
