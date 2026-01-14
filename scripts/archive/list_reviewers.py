import firebase_admin
from firebase_admin import credentials, firestore
import os

def list_all_reviewers():
    if not firebase_admin._apps:
        cred_path = os.path.join(os.path.dirname(__file__), '..', 'serviceAccountKey.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {
                'projectId': 'ue5-questions-prod'
            })
        else:
            firebase_admin.initialize_app(options={
                'projectId': 'ue5-questions-prod'
            })
    
    db = firestore.client()
    questions_ref = db.collection("questions")
    
    print("--- Listing all unique reviewers from questions collection ---")
    
    fields_to_check = [
        "acceptedBy", 
        "reviewedBy", 
        "rejectedBy", 
        "reviewerName", 
        "creatorEmail", 
        "creatorName",
        "humanVerifiedBy"
    ]
    
    reviewers = {field: set() for field in fields_to_check}
    
    # Stream all questions (this might be slow if there are thousands, but let's try)
    docs = questions_ref.stream()
    
    count = 0
    for doc in docs:
        data = doc.to_dict()
        for field in fields_to_check:
            val = data.get(field)
            if val:
                reviewers[field].add(val)
        count += 1
        if count % 100 == 0:
            print(f"Processed {count} questions...")
    
    print(f"\nTotal questions scanned: {count}")
    
    for field, vals in reviewers.items():
        if vals:
            print(f"\n{field}:")
            for v in sorted(list(vals)):
                print(f"  - {v}")
        else:
            print(f"\n{field}: None found")

if __name__ == "__main__":
    list_all_reviewers()
