import firebase_admin
from firebase_admin import credentials, firestore
import os

def check_uid_directly(uid):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    print(f"--- Checking UID: {uid} ---")
    
    colls = ["registeredUsers", "admins", "userSettings"]
    for coll in colls:
        doc = db.collection(coll).document(uid).get()
        if doc.exists:
            print(f"✅ Found in {coll}: {doc.to_dict()}")
        else:
            print(f"❌ Not found in {coll}")

if __name__ == "__main__":
    check_uid_directly("hNAbyqnzIaNb6KiTkqPfAtQkSPz2")
