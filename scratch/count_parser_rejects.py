"""Read-only: how many docs would parseQuestionDoc reject?

parseQuestionDoc rules:
- Reject if missing uniqueId AND missing id (we use id from doc.id, so this never trips)
- Reject if missing/non-string question text
- For base English (language is missing or 'English'): reject if missing creatorId
- For non-English (translation variant): warn but accept
"""
import firebase_admin
from firebase_admin import credentials, firestore
from collections import Counter

SA = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(SA))

db = firestore.client()

reject_reasons = Counter()
accepted_english_loaded = 0
total = 0

for d in db.collection("questions").stream():
    total += 1
    data = d.to_dict()
    raw_q = data.get("question")
    raw_creator = data.get("creatorId")
    raw_lang = data.get("language")
    raw_status = data.get("status")

    is_translation = bool(raw_lang) and raw_lang != "English"

    if not raw_q or not isinstance(raw_q, str):
        reject_reasons["missing/invalid question text"] += 1
        continue

    if (not raw_creator or not isinstance(raw_creator, str)) and not is_translation:
        reject_reasons[f"missing creatorId on base ({raw_lang or 'None'})"] += 1
        continue

    if (raw_lang or "English") == "English" and raw_status == "accepted":
        accepted_english_loaded += 1

print(f"Total docs scanned: {total}")
print(f"Loaded English+accepted: {accepted_english_loaded}")
print()
print("Rejected by parseQuestionDoc:")
for reason, c in reject_reasons.most_common():
    print(f"  {reason}: {c}")
