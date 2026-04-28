
import firebase_admin
from firebase_admin import credentials, firestore

key_path = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\backups\assets\ue5-questions-prod-99289c4d03b3.json"

if not firebase_admin._apps:
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

def check_accepted_translations():
    # Find Chinese translations that are accepted
    cn_docs = db.collection('questions').where('language', '==', 'Chinese (Simplified)').where('status', '==', 'accepted').get()
    
    if not cn_docs:
        print("No accepted Chinese translations found.")
        return

    print(f"Found {len(cn_docs)} accepted Chinese translations.")
    
    for doc in cn_docs:
        data = doc.to_dict()
        uid = data.get('uniqueId')
        # Check if English version is also accepted
        en_docs = db.collection('questions').where('uniqueId', '==', uid).where('language', '==', 'English').get()
        if en_docs:
            en_status = en_docs[0].to_dict().get('status')
            print(f"UID: {uid} | CN Status: accepted | EN Status: {en_status}")
        else:
            print(f"UID: {uid} | CN Status: accepted | EN NOT FOUND")

if __name__ == "__main__":
    check_accepted_translations()
