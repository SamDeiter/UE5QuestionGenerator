import firebase_admin
from firebase_admin import credentials, firestore
import json

def deep_inspect(doc_id):
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': 'ue5-questions-prod',
        })
    
    db = firestore.client()
    doc = db.collection("questions").document(doc_id).get()
    
    if doc.exists:
        data = doc.to_dict()
        print(f"Deep Inspection for {doc_id}:")
        # Print all keys and values, but truncate long text
        for k, v in data.items():
            if isinstance(v, str) and len(v) > 100:
                print(f"  {k}: {v[:100]}...")
            else:
                print(f"  {k}: {v}")
    else:
        print("Document not found.")

if __name__ == "__main__":
    deep_inspect("0f925e2b-a9c4-492c-ac95-a4a8b40f5373")
