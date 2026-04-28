import firebase_admin
from firebase_admin import credentials, firestore

key_path = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\backups\assets\ue5-questions-prod-99289c4d03b3.json"

if not firebase_admin._apps:
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

def check_english_dates():
    docs = db.collection('questions').where(filter=firestore.FieldFilter('language', '==', 'English')).limit(5).get()
    print(f"Checking {len(docs)} English documents:")
    for d in docs:
        data = d.to_dict()
        print(f"ID: {d.id}, UpdatedAt: {data.get('firestoreUpdatedAt')}")

if __name__ == "__main__":
    check_english_dates()
