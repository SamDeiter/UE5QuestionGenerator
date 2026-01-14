import firebase_admin
from firebase_admin import credentials, firestore
import os
import sys

def exhaustive_search(term):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    collections = db.collections()
    
    for coll in collections:
        print(f"Searching collection: {coll.id}")
        docs = coll.stream()
        for doc in docs:
            data = doc.to_dict()
            if term.lower() in str(data).lower():
                print(f"MATCH FOUND in {coll.id}!")
                print(f"   Doc ID: {doc.id}")
                print(f"   Sample fields: { {k: v for k, v in data.items() if k in ['id', 'uniqueId', 'reviewerName', 'humanVerifiedBy', 'status', 'email']} }")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        exhaustive_search(sys.argv[1])
    else:
        exhaustive_search("Bennett")
