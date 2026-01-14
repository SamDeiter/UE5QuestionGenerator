import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

def find_question_by_partial_id(prefix):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    
    print(f"--- Searching for Question prefix: {prefix} ---")
    
    # search where uniqueId >= prefix and uniqueId < prefix + \uf8ff
    docs = db.collection("questions").where("uniqueId", ">=", prefix).where("uniqueId", "<=", prefix + "\uf8ff").stream()
    
    found = False
    for doc in docs:
        print(f"✅ Found! Doc ID: {doc.id}")
        data = doc.to_dict()
        data['_doc_id'] = doc.id
        print(json.dumps(data, indent=2, default=str))
        found = True

    if not found:
        print("❌ Question not found in 'questions' collection.")

if __name__ == "__main__":
    find_question_by_partial_id("76054948")
