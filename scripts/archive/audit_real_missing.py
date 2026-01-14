import firebase_admin
from firebase_admin import credentials, firestore

def audit_real_missing_metadata():
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': 'ue5-questions-prod',
        })
    
    db = firestore.client()
    questions_ref = db.collection("questions")
    
    # Check accepted questions
    docs = questions_ref.where("status", "==", "accepted").limit(100).stream()
    
    print("--- Detailed Audit of Accepted Questions (First 100) ---")
    missing_count = 0
    sean_missing_count = 0
    
    threshold_tags = 1 # Flag if fewer than this
    
    for doc in docs:
        data = doc.to_dict()
        tags = data.get("tags", [])
        source_url = data.get("sourceUrl") or data.get("source")
        source_excerpt = data.get("sourceExcerpt")
        reviewed_by = data.get("reviewedBy")
        
        is_missing = False
        if not tags or len(tags) < 1:
            is_missing = True
        if not source_url and not source_excerpt:
            is_missing = True
            
        if is_missing:
            missing_count += 1
            if reviewed_by == "sean.spitzer@epicgames.com":
                sean_missing_count += 1
            
            print(f"ID: {doc.id}")
            print(f"  Discipline: {data.get('discipline')}")
            print(f"  Tags: {tags}")
            print(f"  Source URL: {source_url}")
            print(f"  Reviewed By: {reviewed_by}")
            print("-" * 20)

    print(f"\nTotal missing/insufficient metadata docs: {missing_count}/100")
    print(f"Sean specific missing docs: {sean_missing_count}")

if __name__ == "__main__":
    audit_real_missing_metadata()
