import firebase_admin
from firebase_admin import credentials, firestore
import os
import sys
import json

def find_question_by_id(qid):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    
    # Try searching by document ID (id) and by the 'id' or 'uniqueId' fields
    print(f"--- Searching for Question ID: {qid} ---")
    
    # 1. Direct document lookup
    doc = db.collection("questions").document(str(qid)).get()
    if doc.exists:
        print(f"✅ Found by document ID: {doc.id}")
        data = doc.to_dict()
        data['_doc_id'] = doc.id
        print(json.dumps(data, indent=2, default=str))
        return

    # 2. Search by 'id' field
    try:
        val = float(qid)
        docs = db.collection("questions").where("id", "==", val).stream()
        for doc in docs:
            print(f"✅ Found by 'id' (number) field: {doc.id}")
            data = doc.to_dict()
            data['_doc_id'] = doc.id
            print(json.dumps(data, indent=2, default=str))
            return
    except:
        pass
    
    # 3. Search strings
    docs = db.collection("questions").where("id", "==", str(qid)).stream()
    found = False
    for doc in docs:
        print(f"✅ Found by 'id' (string) field: {doc.id}")
        data = doc.to_dict()
        data['_doc_id'] = doc.id
        print(json.dumps(data, indent=2, default=str))
        found = True

    docs = db.collection("questions").where("uniqueId", "==", str(qid)).stream()
    for doc in docs:
        print(f"✅ Found by 'uniqueId' (string) field: {doc.id}")
        data = doc.to_dict()
        data['_doc_id'] = doc.id
        print(json.dumps(data, indent=2, default=str))
        found = True
            
    if not found:
        print("❌ Question not found in 'questions' collection.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        find_question_by_id(sys.argv[1])
    else:
        find_question_by_id("76054948")
