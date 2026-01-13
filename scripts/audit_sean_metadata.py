import firebase_admin
from firebase_admin import credentials, firestore

def audit_sean_metadata():
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': 'ue5-questions-prod',
        })
    
    db = firestore.client()
    questions_ref = db.collection("questions")
    
    reviewer_email = "sean.spitzer@epicgames.com"
    
    print(f"--- Metadata Audit for Sean Spitzer ({reviewer_email}) ---")
    
    # Query for all questions reviewed by Sean
    docs = questions_ref.where("reviewedBy", "==", reviewer_email).stream()
    
    total_sean = 0
    missing_tags = 0
    missing_source = 0
    missing_both = 0
    
    for doc in docs:
        total_sean += 1
        data = doc.to_dict()
        tags = data.get("tags", [])
        source_url = data.get("sourceUrl") or data.get("source")
        source_excerpt = data.get("sourceExcerpt")
        status = data.get("status")
        
        has_tags = tags and len(tags) > 0
        has_source = source_url or source_excerpt
        
        if not has_tags:
            missing_tags += 1
        if not has_source:
            missing_source += 1
        if not has_tags and not has_source:
            missing_both += 1
            
        if not has_tags or not has_source:
            print(f"ID: {doc.id} | Status: {status}")
            print(f"  Question: {data.get('question', '')[:50]}...")
            print(f"  Tags: {tags}")
            print(f"  Source: {source_url or source_excerpt or 'MISSING'}")
            print("-" * 20)

    print(f"\nTotal questions reviewed by Sean: {total_sean}")
    print(f"Missing Tags: {missing_tags}")
    print(f"Missing Source: {missing_source}")
    print(f"Missing Both: {missing_both}")

if __name__ == "__main__":
    audit_sean_metadata()
