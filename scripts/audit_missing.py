import firebase_admin
from firebase_admin import credentials, firestore

def audit_missing_metadata():
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': 'ue5-questions-prod',
        })
    
    db = firestore.client()
    questions_ref = db.collection("questions")
    
    # Check accepted questions
    docs = questions_ref.where("status", "==", "accepted").limit(50).stream()
    
    print("--- Audit of Accepted Questions (First 50) ---")
    for doc in docs:
        data = doc.to_dict()
        source = data.get("_source")
        tags = data.get("tags", [])
        
        if not source or not tags:
            print(f"ID: {doc.id}")
            print(f"  _source: {source}")
            print(f"  tags: {tags}")
            print(f"  reviewedBy: {data.get('reviewedBy')}")
            print(f"  acceptedBy: {data.get('acceptedBy')}")
            print(f"  discipline: {data.get('discipline')}")
            print("-" * 20)

if __name__ == "__main__":
    audit_missing_metadata()
