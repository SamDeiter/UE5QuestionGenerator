import firebase_admin
from firebase_admin import credentials, firestore
import os
import sys
import json

def read_doc(doc_id, collection="audit-log"):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    doc = db.collection(collection).document(doc_id).get()
    if doc.exists:
        print(json.dumps(doc.to_dict(), indent=2, default=str))
    else:
        print(f"Doc {doc_id} not found in {collection}")

if __name__ == "__main__":
    if len(sys.argv) > 2:
        read_doc(sys.argv[1], sys.argv[2])
    elif len(sys.argv) > 1:
        read_doc(sys.argv[1])
    else:
        read_doc("0TBt0uQ2UcDa7EjPnsSI")
