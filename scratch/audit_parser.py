import firebase_admin
from firebase_admin import credentials, firestore
import os

key_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\backups\assets\ue5-questions-prod-99289c4d03b3.json'
cred = credentials.Certificate(key_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

print("Auditing Spanish documents...")
docs = db.collection('questions').where(filter=firestore.FieldFilter('language', '==', 'Spanish')).get()

invalid = []
for d in docs:
    data = d.to_dict()
    errs = []
    
    # Required fields according to parseQuestionDoc.js
    if not data.get('uniqueId') and not d.id:
        errs.append('Missing ID')
    
    question = data.get('question')
    if not question or not isinstance(question, str) or len(question.strip()) == 0:
        errs.append('Missing Question')
        
    creator_id = data.get('creatorId')
    if not creator_id or not isinstance(creator_id, str):
        errs.append('Missing CreatorId')
        
    if errs:
        invalid.append((d.id, errs))

print(f"Total Spanish Docs: {len(docs)}")
print(f"Invalid according to parser: {len(invalid)}")

if invalid:
    print("\nSample Invalid Docs:")
    for doc_id, errs in invalid[:10]:
        print(f"  - {doc_id}: {errs}")

# Check English docs too
print("\nAuditing English documents...")
eng_docs = db.collection('questions').where(filter=firestore.FieldFilter('language', '==', 'English')).get()
eng_invalid = []
for d in eng_docs:
    data = d.to_dict()
    errs = []
    if not data.get('uniqueId') and not d.id: errs.append('Missing ID')
    question = data.get('question')
    if not question or not isinstance(question, str) or len(question.strip()) == 0: errs.append('Missing Question')
    creator_id = data.get('creatorId')
    if not creator_id or not isinstance(creator_id, str): errs.append('Missing CreatorId')
    if errs: eng_invalid.append((d.id, errs))

print(f"Total English Docs: {len(eng_docs)}")
print(f"Invalid according to parser: {len(eng_invalid)}")
