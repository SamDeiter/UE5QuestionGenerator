"""Count exactly how many docs the 21 orphans correspond to."""
from collections import defaultdict
import firebase_admin
from firebase_admin import credentials, firestore

SA = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(SA))

db = firestore.client()

variants_by_uid = defaultdict(list)
for d in db.collection("questions").stream():
    data = d.to_dict()
    uid = data.get("uniqueId")
    if uid:
        variants_by_uid[uid].append(data.get("language") or "English")

orphans = {uid: langs for uid, langs in variants_by_uid.items() if "English" not in langs}

print(f"Orphan uniqueIds: {len(orphans)}")
total_docs = sum(len(langs) for langs in orphans.values())
print(f"Total docs across all orphans: {total_docs}")
print()
print("Per-uid variant count:")
for uid, langs in orphans.items():
    print(f"  {uid}: {len(langs)} variants")
