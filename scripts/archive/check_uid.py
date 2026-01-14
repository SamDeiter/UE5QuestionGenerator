import firebase_admin
from firebase_admin import credentials, firestore
import os

def check_specific_user(uid):
    if not firebase_admin._apps:
        cred_path = os.path.join(os.path.dirname(__file__), '..', 'serviceAccountKey.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {
                'projectId': 'ue5-questions-prod'
            })
        else:
            firebase_admin.initialize_app(options={
                'projectId': 'ue5-questions-prod'
            })
    
    db = firestore.client()
    
    print(f"--- Checking UID: {uid} ---")
    
    # Check admins
    admin_doc = db.collection("admins").document(uid).get()
    if admin_doc.exists:
        print(f"✅ Found in 'admins': {admin_doc.to_dict()}")
    else:
        print("❌ Not found in 'admins'")
        
    # Check registeredUsers
    user_doc = db.collection("registeredUsers").document(uid).get()
    if user_doc.exists:
        print(f"✅ Found in 'registeredUsers': {user_doc.to_dict()}")
    else:
        print("❌ Not found in 'registeredUsers'")

if __name__ == "__main__":
    check_specific_user("DeK9qKRBZUV8EJFGFC5FaVyc1Xy2")
