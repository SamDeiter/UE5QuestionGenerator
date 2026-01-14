import firebase_admin
from firebase_admin import credentials, firestore
import os

def find_duplicates():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    users_ref = db.collection("registeredUsers")
    docs = users_ref.stream()
    
    emails = {}
    for doc in docs:
        email = doc.to_dict().get('email')
        if email:
            if email in emails:
                emails[email].append(doc.id)
            else:
                emails[email] = [doc.id]
                
    for email, uids in emails.items():
        if len(uids) > 1:
            print(f"DUPLICATE EMAIL: {email} | UIDs: {uids}")

if __name__ == "__main__":
    find_duplicates()
