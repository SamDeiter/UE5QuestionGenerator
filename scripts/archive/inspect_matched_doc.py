import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

def inspect_doc(coll, doc_id):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    doc = db.collection(coll).document(doc_id).get()
    if doc.exists:
        data = doc.to_dict()
        data['_doc_id'] = doc.id
        print(json.dumps(data, indent=2, default=str))

if __name__ == "__main__":
    inspect_doc("questions", "7a83d73b-e19c-4861-ad8d-b088e5b4ee34")
