import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

def find_and_print_keys(prefix):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    docs = db.collection("questions").where("uniqueId", ">=", prefix).where("uniqueId", "<=", prefix + "\uf8ff").stream()
    
    for doc in docs:
        data = doc.to_dict()
        print(f"--- Doc: {doc.id} ---")
        for key in ['id', 'uniqueId', 'status', 'reviewerName', 'humanVerifiedBy', 'acceptedBy', 'reviewedBy', 'creatorName', 'creatorEmail', 'reviewCompletedAt']:
            print(f"  {key}: {data.get(key)}")

if __name__ == "__main__":
    find_and_print_keys("76054948")
