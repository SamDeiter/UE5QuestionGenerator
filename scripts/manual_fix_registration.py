import firebase_admin
from firebase_admin import credentials, firestore
import datetime

def manual_register():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    
    users_to_fix = [
        {"email": "edward.bennett@epicgames.com", "uid": "hNAbyqnzIaNb6KiTkqPfAtQkSPz2"},
        {"email": "james.hill@epicgames.com", "uid": "JiFCl6y5DBYJCPlWjSy1q0HRlog1"}
    ]
    
    for user in users_to_fix:
        email = user["email"]
        uid = user["uid"]
        
        print(f"--- Fixing account for {email} ({uid}) ---")
        
        # 1. Add to admins collection
        db.collection("admins").document(uid).set({
            "email": email,
            "isAdmin": True,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "createdBy": "manual_fix_script"
        })
        print(f"  Added to 'admins'")
        
        # 2. Add to registeredUsers collection
        db.collection("registeredUsers").document(uid).set({
            "email": email,
            "uid": uid,
            "role": "admin",
            "registeredAt": firestore.SERVER_TIMESTAMP,
            "inviteCode": "MANUAL_DOMAIN_FIX",
            "fixedAt": firestore.SERVER_TIMESTAMP
        }, merge=True)

        print(f"  Added to 'registeredUsers'")

if __name__ == "__main__":
    manual_register()
