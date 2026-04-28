import firebase_admin
from firebase_admin import credentials, firestore

key_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\backups\assets\ue5-questions-prod-99289c4d03b3.json'
cred = credentials.Certificate(key_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

print("Inspecting first 5 Spanish documents...")
docs = db.collection('questions').where('language', '==', 'Spanish').limit(5).get()

for d in docs:
    data = d.to_dict()
    print(f"\nID: {d.id}")
    print(f"  language: {data.get('language')}")
    print(f"  uniqueId: {data.get('uniqueId')}")
    print(f"  question: {data.get('question')[:50] if data.get('question') else 'NONE'}")
    print(f"  options type: {type(data.get('options'))}")
    if isinstance(data.get('options'), dict):
        print(f"  options keys: {list(data.get('options').keys())}")
    print(f"  creatorName: {data.get('creatorName')}")
