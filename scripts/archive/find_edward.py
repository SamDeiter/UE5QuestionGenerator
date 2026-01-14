import firebase_admin
from firebase_admin import credentials, firestore
import os

def find_user_activity(search_term):
    if not firebase_admin._apps:
        # Use the service account key file if available
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
    
    print(f"--- Searching for activity containing '{search_term}' ---")
    
    # Fields to check for reviewer activity
    fields_to_check = [
        "acceptedBy", 
        "reviewedBy", 
        "rejectedBy", 
        "reviewerName", 
        "creatorEmail", 
        "creatorName",
        "humanVerifiedBy"
    ]
    
    found_any = False
    
    # We can't do a partial match with '==' in Firestore, so we'll fetch a sample or use specific query if we have the full string
    # But since we don't know the full string, let's try some common variations or stream and filter locally for a more thorough check
    
    print("Streaming questions to check for partial matches (sampling 500)...")
    docs = questions_ref.limit(500).stream()
    
    matches = []
    for doc in docs:
        data = doc.to_dict()
        for field in fields_to_check:
            val = data.get(field)
            if val and isinstance(val, str) and search_term.lower() in val.lower():
                matches.append({
                    "id": doc.id,
                    "field": field,
                    "value": val,
                    "status": data.get("status")
                })
                break
    
    if matches:
        print(f"\n✅ Found {len(matches)} matches:")
        for m in matches:
            print(f"  ID: {m['id']}, Field: {m['field']}, Value: {m['value']}, Status: {m['status']}")
    else:
        print(f"❌ No matches found for '{search_term}' in the last 500 questions.")

if __name__ == "__main__":
    # Try searching for "Bennett" first as it's more specific than "Edward"
    find_user_activity("Bennett")
    print("\n" + "="*50 + "\n")
    find_user_activity("Edward")
