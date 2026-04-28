"""Read-only: count accepted English base questions and their status distribution."""
import firebase_admin
from firebase_admin import credentials, firestore
from collections import Counter

SA = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(SA))

db = firestore.client()

status_lang = Counter()  # (language_norm, status_norm)
total = 0
for d in db.collection("questions").stream():
    total += 1
    data = d.to_dict()
    lang = data.get("language") or "English"
    status = data.get("status") or "<missing>"
    status_lang[(lang, status)] += 1

print(f"Total docs: {total}")
print()
print(f"{'Language':<25} {'Status':<15} {'Count':>6}")
print("-" * 50)
for (lang, status), c in sorted(status_lang.items(), key=lambda x: (-x[1])):
    print(f"{lang:<25} {status:<15} {c:>6}")

# Highlight the language view filter target
english_accepted = status_lang.get(("English", "accepted"), 0)
print()
print(f"English + accepted: {english_accepted}")
