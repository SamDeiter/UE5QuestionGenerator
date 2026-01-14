import firebase_admin
from firebase_admin import credentials, firestore

def find_sean_activity(reviewer_email):
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': 'ue5-questions-prod',
        })
    
    db = firestore.client()
    questions_ref = db.collection("questions")
    
    print(f"--- Searching for any activity by {reviewer_email} ---")
    
    # Try different fields
    fields_to_check = ["acceptedBy", "reviewedBy", "rejectedBy", "reviewerName"]
    
    for field in fields_to_check:
        docs = questions_ref.where(field, "==", reviewer_email).limit(5).stream()
        count = 0
        for doc in docs:
            if count == 0:
                print(f"\nFound matches for field: {field}")
            data = doc.to_dict()
            print(f"  ID: {doc.id}, Status: {data.get('status')}, Tags: {data.get('tags')}, Source: {data.get('_source')}")
            count += 1
        if count == 0:
            print(f"No matches for field: {field}")

if __name__ == "__main__":
    find_sean_activity("sean.spitzer@epicgames.com")
