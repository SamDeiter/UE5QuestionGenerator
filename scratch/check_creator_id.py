import firebase_admin
from firebase_admin import credentials, firestore

key_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\backups\assets\ue5-questions-prod-99289c4d03b3.json'
cred = credentials.Certificate(key_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

print("Checking for creatorId in translations...")
langs = ["Spanish", "French", "German", "Chinese (Simplified)"]

for lang in langs:
    docs = db.collection('questions').where('language', '==', lang).limit(1).get()
    if docs:
        d = docs[0]
        data = d.to_dict()
        cid = data.get('creatorId')
        print(f"  - {lang}: creatorId={cid} (Type: {type(cid)})")
    else:
        print(f"  - {lang}: No documents found")
