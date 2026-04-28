import firebase_admin
from firebase_admin import credentials, firestore

key_path = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\backups\assets\ue5-questions-prod-99289c4d03b3.json"

if not firebase_admin._apps:
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

def check_spanish():
    docs = db.collection('questions').where(filter=firestore.FieldFilter('language', '==', 'Spanish')).limit(20).get()
    print(f"Checking {len(docs)} Spanish documents:")
    for d in docs:
        data = d.to_dict()
        print(f"ID: {d.id}")
        print(f"  Status: {data.get('status')}")
        print(f"  UniqueId: {data.get('uniqueId')}")
        print(f"  Question: {str(data.get('question'))[:50]}...")
        print(f"  Creator: {data.get('creatorName')}")
        print("-" * 20)

if __name__ == "__main__":
    check_spanish()
