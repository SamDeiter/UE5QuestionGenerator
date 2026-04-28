"""Inspect docs that should be English bases to figure out why they're orphans."""
import firebase_admin
from firebase_admin import credentials, firestore

SA = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(SA))

db = firestore.client()

# Two suspicious doc IDs from earlier audits
target_ids = [
    "00033e77-0436-4953-988a-6484c63d02c3",
    "00033e77-0436-4953-988a-6484c63d02c3_Chinese_(Simplified)",
    "001ef5f0-ab46-4df8-9d87-d614d2ca5105",
]

for doc_id in target_ids:
    doc = db.collection("questions").document(doc_id).get()
    if not doc.exists:
        print(f"{doc_id}: DOES NOT EXIST")
        continue
    data = doc.to_dict()
    print(f"{doc_id}:")
    print(f"  uniqueId: {data.get('uniqueId')!r}")
    print(f"  language: {data.get('language')!r}")
    print(f"  status:   {data.get('status')!r}")
    print(f"  question: {(data.get('question') or '')[:80]!r}")
    print()
