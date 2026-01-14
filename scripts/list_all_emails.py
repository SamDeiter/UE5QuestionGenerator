import firebase_admin
from firebase_admin import credentials, firestore
import os

def list_all_emails():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    
    print("--- Unique emails in 'questions' collection ---")
    emails = set()
    docs = db.collection("questions").stream()
    for doc in docs:
        data = doc.to_dict()
        for field in ['creatorEmail', 'acceptedBy', 'reviewedBy', 'rejectedBy', 'humanVerifiedBy']:
            val = data.get(field)
            if val and isinstance(val, str):
                emails.add(val.lower())
    
    for email in sorted(list(emails)):
        print(f"  {email}")

if __name__ == "__main__":
    list_all_emails()
