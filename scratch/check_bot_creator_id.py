import firebase_admin
from firebase_admin import credentials, firestore

key_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\backups\assets\ue5-questions-prod-99289c4d03b3.json'
cred = credentials.Certificate(key_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

print("Checking Cloud Translation Bot documents for creatorId...")
docs = db.collection('questions').where('creatorName', '==', 'Cloud Translation Bot').limit(5).get()

if docs:
    for d in docs:
        data = d.to_dict()
        print(f"ID: {d.id}")
        print(f"  language: {data.get('language')}")
        print(f"  creatorId: {data.get('creatorId')}")
else:
    print("No Cloud Translation Bot documents found.")
