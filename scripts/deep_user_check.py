import firebase_admin
from firebase_admin import credentials, firestore
import os

def list_all_collections_and_users():
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
    
    print("--- Checking 'admins' collection ---")
    admins_ref = db.collection("admins")
    docs = admins_ref.stream()
    for doc in docs:
        print(f"  ADMIN: {doc.to_dict().get('email')} (ID: {doc.id})")
        
    print("\n--- Checking 'registeredUsers' collection ---")
    users_ref = db.collection("registeredUsers")
    docs = users_ref.stream()
    for doc in docs:
        data = doc.to_dict()
        print(f"  USER: {data.get('email')} | Role: {data.get('role')} | Name: {data.get('name', 'N/A')}")

if __name__ == "__main__":
    list_all_collections_and_users()
