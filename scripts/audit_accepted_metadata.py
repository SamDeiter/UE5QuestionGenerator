import firebase_admin
from firebase_admin import credentials, firestore
import json

def inspect_accepted_metadata(reviewer_email):
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': 'ue5-questions-prod',
        })
    
    db = firestore.client()
    questions_ref = db.collection("questions")
    
    print(f"--- Metadata Audit for Questions Accepted by {reviewer_email} ---")
    
    # Query for all status="accepted" questions by this reviewer
    docs = questions_ref.where("status", "==", "accepted").where("acceptedBy", "==", reviewer_email).limit(20).stream()
    
    found_any = False
    for doc in docs:
        found_any = True
        data = doc.to_dict()
        unique_id = data.get("uniqueId") or doc.id
        tags = data.get("tags", [])
        source = data.get("_source") or data.get("source")
        discipline = data.get("discipline")
        
        print(f"\nID: {doc.id} (UniqueId: {unique_id})")
        print(f"  Discipline: {discipline}")
        print(f"  Tags: {tags}")
        print(f"  Source: {source}")
        
        if not tags or not source:
            print("  ⚠️ MISSING METADATA")
            # Let's see all fields to see what IS there
            # print(f"  All Fields: {list(data.keys())}")

    if not found_any:
        print("No accepted questions found for this user.")

if __name__ == "__main__":
    inspect_accepted_metadata("sean.spitzer@epicgames.com")
