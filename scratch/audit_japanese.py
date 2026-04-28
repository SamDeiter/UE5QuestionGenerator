import firebase_admin
from firebase_admin import credentials, firestore

key_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\backups\assets\ue5-questions-prod-99289c4d03b3.json'
cred = credentials.Certificate(key_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

print("Analyzing Japanese document IDs vs English...")
en_ids = set()
en_docs = db.collection('questions').where('language', '==', 'English').get()
for d in en_docs:
    en_ids.add(d.get('uniqueId'))

ja_docs = db.collection('questions').where('language', '==', 'Japanese').get()
ja_ids = []
for d in ja_docs:
    ja_ids.append(d.get('uniqueId'))

print(f"Total English IDs: {len(en_ids)}")
print(f"Total Japanese IDs: {len(ja_ids)}")

ja_set = set(ja_ids)
print(f"Unique Japanese IDs: {len(ja_set)}")

orphans = ja_set - en_ids
if orphans:
    print(f"Japanese IDs without English parent ({len(orphans)}):")
    for o in orphans:
        print(f"  - {o}")
else:
    print("No Japanese orphans found.")

duplicates = [x for x in ja_set if ja_ids.count(x) > 1]
if duplicates:
    print(f"Duplicate Japanese IDs ({len(duplicates)}):")
    for d in duplicates:
        print(f"  - {d}")
