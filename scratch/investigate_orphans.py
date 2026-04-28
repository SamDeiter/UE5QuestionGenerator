"""Investigate the 21 uniqueIds that have translations but no English variant.

Questions to answer:
1. List all 21 orphan uniqueIds.
2. For each: check audit-log for any deletion or rejection events on the
   English base (id matching the uniqueId).
3. Are they clustered (creation date, creator, discipline)?
4. What is the question content of the translations? (helps user decide
   whether they're worth recovering or were intentionally deleted)
"""
import sys
from collections import defaultdict, Counter

import firebase_admin
from firebase_admin import credentials, firestore

# Force UTF-8 stdout on Windows
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SA = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(SA))

db = firestore.client()

# Step 1: rebuild the orphan list
variants_by_uid = defaultdict(list)  # uid -> [(doc_id, lang, status, creator, created)]
for d in db.collection("questions").stream():
    data = d.to_dict()
    uid = data.get("uniqueId")
    if not uid:
        continue
    variants_by_uid[uid].append(
        (
            d.id,
            data.get("language") or "English",
            data.get("status"),
            data.get("creatorEmail"),
            data.get("createdAt") or data.get("firestoreUpdatedAt"),
            (data.get("question") or "")[:80],
        )
    )

orphans = {
    uid: variants
    for uid, variants in variants_by_uid.items()
    if not any(v[1] == "English" for v in variants)
}

print(f"Total orphan uniqueIds (no English variant): {len(orphans)}\n")

# Step 2: check whether a doc with id == uniqueId (the canonical English location) exists
print("Checking if a doc with id == uniqueId exists for each orphan...")
docs_at_uid = 0
for uid in orphans:
    snap = db.collection("questions").document(uid).get()
    if snap.exists:
        docs_at_uid += 1
        print(f"  EXISTS at id={uid}: language={snap.to_dict().get('language')!r}")

if docs_at_uid == 0:
    print("  None of the 21 orphan uniqueIds have a doc at id == uniqueId.")
print()

# Step 3: check audit log
print("Searching audit-log for deletion/rejection of orphans...")
hits = 0
audit_actions = Counter()
try:
    for log_doc in db.collection("audit-log").stream():
        data = log_doc.to_dict()
        target = data.get("questionId") or data.get("targetId") or data.get("docId")
        action = data.get("action") or data.get("event") or data.get("type")
        if target in orphans:
            hits += 1
            audit_actions[action] += 1
            if hits <= 10:
                print(
                    f"  uid={target} action={action!r} "
                    f"by={data.get('userEmail')!r} at={data.get('timestamp')}"
                )
except Exception as e:
    print(f"  audit-log scan failed: {e}")

print(f"\nAudit-log hits referencing orphan uniqueIds: {hits}")
if audit_actions:
    print("Action breakdown:")
    for a, c in audit_actions.most_common():
        print(f"  {a}: {c}")

# Step 4: cluster analysis
print()
print("Orphan creators:")
creator_counts = Counter()
status_counts = Counter()
disciplines = Counter()
for uid, variants in orphans.items():
    for _id, _lang, status, creator, _created, _q in variants:
        creator_counts[creator] += 1
        status_counts[status] += 1
print("  By creatorEmail (variant docs):")
for c, n in creator_counts.most_common():
    print(f"    {c}: {n}")
print("  By status (variant docs):")
for s, n in status_counts.most_common():
    print(f"    {s}: {n}")

# Step 5: list the orphans with one sample question text
print()
print("21 orphan uniqueIds with a sample question text:")
for uid, variants in list(orphans.items())[:25]:
    sample_q = next((v[5] for v in variants if v[5]), "")
    print(f"  {uid}: {sample_q!r}")
