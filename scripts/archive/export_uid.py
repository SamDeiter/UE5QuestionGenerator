import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

def check_specific_user(uid):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    
    results = {}
    
    admin_doc = db.collection("admins").document(uid).get()
    if admin_doc.exists:
        results['admins'] = admin_doc.to_dict()
        # Convert timestamp to string
        for k, v in results['admins'].items():
            if hasattr(v, 'isoformat'):
                results['admins'][k] = v.isoformat()
    
    user_doc = db.collection("registeredUsers").document(uid).get()
    if user_doc.exists:
        results['registeredUsers'] = user_doc.to_dict()
        for k, v in results['registeredUsers'].items():
            if hasattr(v, 'isoformat'):
                results['registeredUsers'][k] = v.isoformat()
    
    with open('uid_details.json', 'w') as f:
        json.dump(results, f, indent=2)
    print("Done. See uid_details.json")

if __name__ == "__main__":
    check_specific_user("DeK9qKRBZUV8EJFGFC5FaVyc1Xy2")
