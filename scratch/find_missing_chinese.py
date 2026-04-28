"""Which English-accepted questions are missing a Chinese (Simplified) variant?"""
from collections import defaultdict
import firebase_admin
from firebase_admin import credentials, firestore
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SA = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(SA))

db = firestore.client()

variants_by_uid = defaultdict(dict)  # uid -> {lang: status}
for d in db.collection("questions").stream():
    data = d.to_dict()
    uid = data.get("uniqueId")
    if not uid:
        continue
    lang = data.get("language") or "English"
    variants_by_uid[uid][lang] = (data.get("status"), data.get("question") or "")

# Find English-accepted questions missing a Chinese (Simplified) variant
missing = []
english_accepted = 0
for uid, langs in variants_by_uid.items():
    eng = langs.get("English")
    if not eng or eng[0] != "accepted":
        continue
    english_accepted += 1
    if "Chinese (Simplified)" not in langs:
        missing.append((uid, eng[1][:80]))

print(f"Total English+accepted: {english_accepted}")
print(f"Missing Chinese (Simplified): {len(missing)}")
for uid, q in missing:
    print(f"  {uid}: {q!r}")
