import firebase_admin
from firebase_admin import credentials, firestore
from tqdm import tqdm

key_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\backups\assets\ue5-questions-prod-99289c4d03b3.json'
cred = credentials.Certificate(key_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

DUMMY_CREATOR_ID = "AF4rHG5PHzXCUBZMftJ1cySdz442"

def backfill_and_cleanup():
    print("Fetching all non-English questions...")
    docs = db.collection('questions').where('language', '!=', 'English').get()
    
    batch = db.batch()
    batch_count = 0
    total_fixed = 0
    total_deleted = 0
    
    print(f"Processing {len(docs)} documents...")
    
    for d in tqdm(docs):
        data = d.to_dict()
        
        # 1. Check for "Hollow" documents (missing question)
        is_hollow = not data.get('question') or not isinstance(data.get('question'), str) or len(data.get('question').strip()) == 0
        
        if is_hollow:
            # Delete hollow translation
            batch.delete(d.reference)
            total_deleted += 1
        else:
            # 2. Check for missing creatorId
            if not data.get('creatorId'):
                batch.update(d.reference, {'creatorId': DUMMY_CREATOR_ID})
                total_fixed += 1
        
        batch_count += 1
        
        # Firestore batch limit is 500
        if batch_count >= 400:
            batch.commit()
            batch = db.batch()
            batch_count = 0
            
    # Commit remaining
    if batch_count > 0:
        batch.commit()
        
    print(f"\nScan Complete:")
    print(f"  Fixed (Missing creatorId): {total_fixed}")
    print(f"  Deleted (Hollow/Empty):     {total_deleted}")
    print(f"  Total processed:           {len(docs)}")

if __name__ == "__main__":
    backfill_and_cleanup()
