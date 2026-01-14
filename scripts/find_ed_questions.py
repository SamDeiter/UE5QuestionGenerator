import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

def find_question_by_id(qid):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    
    print(f"--- Searching for Question ID: {qid} ---")
    
    # Try searching by document ID (id) and by the 'id' or 'uniqueId' fields
    doc = db.collection("questions").document(qid).get()
    if doc.exists:
        print(f"✅ Found by document ID: {doc.id}")
        data = doc.to_dict()
        data['_doc_id'] = doc.id
        print(json.dumps(data, indent=2, default=str))
        return

if __name__ == "__main__":
    find_question_by_id("1767142306489.6343")
    find_question_by_id("76054948") # Search again just in case
