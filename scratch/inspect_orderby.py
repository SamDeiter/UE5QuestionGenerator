"""Read-only inspection: how many docs would orderBy('firestoreUpdatedAt') silently drop?

Firestore's orderBy excludes docs where the field is missing OR has a different type
than the first matching doc. We classify each doc's firestoreUpdatedAt by Python type
after Firestore deserialization (Timestamp -> datetime, anything else -> dict/str/None).
"""
import firebase_admin
from firebase_admin import credentials, firestore
from collections import Counter

SA = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(SA))

db = firestore.client()
docs = db.collection("questions").stream()

type_counts = Counter()
samples = {}
total = 0
for d in docs:
    total += 1
    data = d.to_dict()
    v = data.get("firestoreUpdatedAt", "<MISSING>")
    t = type(v).__name__
    type_counts[t] += 1
    if t not in samples:
        samples[t] = (d.id, repr(v)[:200])

print(f"Total docs: {total}")
print("firestoreUpdatedAt type breakdown:")
for t, c in type_counts.most_common():
    sid, sval = samples[t]
    print(f"  {t}: {c}")
    print(f"    sample id={sid}: {sval}")
