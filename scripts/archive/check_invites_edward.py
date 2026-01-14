import firebase_admin
from firebase_admin import credentials, firestore
import os

def check_invite_for_user(search_term):
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
    
    print(f"--- Checking invites for '{search_term}' ---")
    
    # We'll stream and filter locally since there are only ~567
    docs = invites_ref.stream()
    
    matches = []
    for doc in docs:
        data = doc.to_dict()
        email = data.get('email', '')
        note = data.get('note', '')
        
        if (email and search_term.lower() in email.lower()) or \
           (note and search_term.lower() in note.lower()):
            matches.append({
                "id": doc.id,
                "email": email,
                "code": data.get('code'),
                "note": note,
                "status": data.get('status')
            })
    
    if matches:
        print(f"\n✅ Found {len(matches)} matching invites:")
        for m in matches:
            print(f"  ID: {m['id']}, Email: {m['email']}, Code: {m['code']}, Note: {m['note']}, Status: {m['status']}")
    else:
        print(f"❌ No matching invites found for '{search_term}'")

if __name__ == "__main__":
    check_invite_for_user("Bennett")
    print("\n" + "="*50 + "\n")
    check_invite_for_user("Edward")
