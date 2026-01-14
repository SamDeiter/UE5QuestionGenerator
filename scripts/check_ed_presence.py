import firebase_admin
from firebase_admin import credentials, firestore
import os

def check_ed_presence():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    email = "edward.bennett@epicgames.com"
    
    print(f"--- Checking for email: {email} ---")
    
    # Check registeredUsers
    docs = db.collection("registeredUsers").where("email", "==", email).stream()
    found = False
    for doc in docs:
        print(f"✅ Found in 'registeredUsers': {doc.id} -> {doc.to_dict()}")
        found = True
        
    # Check admins
    docs = db.collection("admins").where("email", "==", email).stream()
    for doc in docs:
        print(f"✅ Found in 'admins': {doc.id} -> {doc.to_dict()}")
        found = True
        
    if not found:
        print("❌ Not found in either collection.")

if __name__ == "__main__":
    check_ed_presence()
