"""Read-only: check whether translation variants link back to a loadable English base.

For each variant doc, look up its uniqueId and see whether an English doc with
the same uniqueId exists. If not, the language-switch from variant -> English
will fail.
"""
import firebase_admin
from firebase_admin import credentials, firestore
from collections import Counter, defaultdict

SA = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(SA))

db = firestore.client()

variants_by_uid = defaultdict(set)  # uid -> set of languages
docs_missing_uid = 0
total = 0

for d in db.collection("questions").stream():
    total += 1
    data = d.to_dict()
    uid = data.get("uniqueId")
    lang = data.get("language") or "English"

    if not uid:
        docs_missing_uid += 1
        continue

    variants_by_uid[uid].add(lang)

print(f"Total docs: {total}")
print(f"Docs missing uniqueId: {docs_missing_uid}")
print(f"Distinct uniqueIds: {len(variants_by_uid)}")

# How many uniqueIds have an English entry?
with_english = sum(1 for langs in variants_by_uid.values() if "English" in langs)
without_english = sum(1 for langs in variants_by_uid.values() if "English" not in langs)
print(f"  uniqueIds with English variant: {with_english}")
print(f"  uniqueIds WITHOUT English variant: {without_english}")

# Sample some that lack English
print()
print("Sample uniqueIds missing an English variant:")
shown = 0
for uid, langs in variants_by_uid.items():
    if "English" not in langs and shown < 5:
        print(f"  {uid}: has {sorted(langs)}")
        shown += 1
