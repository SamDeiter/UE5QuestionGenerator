import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

# Use local credentials
cred_path = os.path.join(os.environ['USERPROFILE'], '.gemini', 'antigravity', 'brain', '8dd86955-e91a-4752-916c-310d9ca52b5d', 'scratch', 'service-account.json')

if not os.path.exists(cred_path):
    print(f"Error: Credentials not found at {cred_path}")
    exit(1)

cred = credentials.Certificate(cred_path)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Audit questions for Chinese (Simplified)
print("Auditing Chinese questions...")
docs = db.collection('questions').where('language', '==', 'Chinese (Simplified)').limit(100).stream()

results = []
for doc in docs:
    data = doc.to_dict()
    # Mask potentially long content but check for existence
    results.append({
        'id': doc.id,
        'uniqueId': data.get('uniqueId'),
        'has_question': 'question' in data,
        'question_len': len(data.get('question', '')) if 'question' in data else 0,
        'status': data.get('status'),
        'creatorId': data.get('creatorId'),
        'discipline': data.get('discipline')
    })

output_path = os.path.join(os.environ['USERPROFILE'], '.gemini', 'antigravity', 'brain', '8dd86955-e91a-4752-916c-310d9ca52b5d', 'scratch', 'audit_results.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)

print(f"Audit complete. Results saved to {output_path}")
print(f"Found {len(results)} Chinese documents.")
