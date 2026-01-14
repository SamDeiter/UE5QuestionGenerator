import firebase_admin
from firebase_admin import credentials, firestore
import os

def list_all_invites():
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
    invites_ref = db.collection("invites")
    
    print("--- Listing all invites from invites collection ---")
    docs = invites_ref.stream()
    
    count = 0
    for doc in docs:
        data = doc.to_dict()
        email = data.get('email', 'N/A')
        code = data.get('code', 'N/A')
        status = data.get('status', 'N/A')
        used_by = data.get('usedBy', 'N/A')
        print(f"  Email: {email}, Code: {code}, Status: {status}, UsedBy: {used_by}")
        count += 1
    
    print(f"\nTotal invites found: {count}")

if __name__ == "__main__":
    list_all_invites()
