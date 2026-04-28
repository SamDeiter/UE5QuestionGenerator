import firebase_admin
from firebase_admin import credentials, firestore

key_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\backups\assets\ue5-questions-prod-99289c4d03b3.json'
cred = credentials.Certificate(key_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

print("Identifying missing Spanish uniqueIds...")
en_ids = set()
en_docs = db.collection('questions').where('language', '==', 'English').get()
for d in en_docs:
    en_ids.add(d.get('uniqueId'))

es_ids = set()
es_docs = db.collection('questions').where('language', '==', 'Spanish').get()
for d in es_docs:
    es_ids.add(d.get('uniqueId'))

missing = list(en_ids - es_ids)
print(f"Missing Spanish: {len(missing)}")

# Write to a temporary file for the translation script to consume if needed
# Or just run the script normally since it skips existing ones.
