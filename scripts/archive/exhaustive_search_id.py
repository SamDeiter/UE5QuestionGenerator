import firebase_admin
from firebase_admin import credentials, firestore
import os

def exhaustive_search_id(qid):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    collections = db.collections()
    
    for coll in collections:
        print(f"Searching collection: {coll.id}")
        docs = coll.where("id", "==", qid).stream()
        for doc in docs:
            print(f"✅ MATCH FOUND in {coll.id} (by id)!")
            print(f"   Doc ID: {doc.id}")
            print(f"   Data: {doc.to_dict()}")
            
        docs = coll.where("uniqueId", "==", qid).stream()
        for doc in docs:
            print(f"✅ MATCH FOUND in {coll.id} (by uniqueId)!")
            print(f"   Doc ID: {doc.id}")
            print(f"   Data: {doc.to_dict()}")

if __name__ == "__main__":
    exhaustive_search_id("1767142306489.6343")
    exhaustive_search_id(1767142306489.6343)
