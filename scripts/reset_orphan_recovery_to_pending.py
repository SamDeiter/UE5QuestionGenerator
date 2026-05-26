"""
reset_orphan_recovery_to_pending.py
-----------------------------------
Flip every Firestore question authored by the Orphan Recovery Bot
(see scripts/recover_orphan_english.py) back to status="pending" and clear
all reviewer metadata so the questions look like they have never been reviewed.

The marker is `_recoveredFromOrphan == True`, which is unique to the recovery
script (cloud_translate_bulk shares the same creatorId but does NOT set this
flag, so this query won't catch translation docs).

Fields preserved:
  - All content (question, options, sourceExcerpt, etc.)
  - All creator metadata (creatorName="Orphan Recovery Bot", creatorId, ...)
  - The _recoveredFromOrphan marker (so we can still identify them later)

Fields cleared / reset:
  - status -> "pending"
  - reviewerName, reviewedBy, reviewedAt
  - reviewStartedAt, reviewCompletedAt, reviewDuration
  - acceptedAt, acceptedBy
  - rejectedAt, rejectedBy, rejectionReason
  - critiqueScore
  - humanVerified, humanVerifiedBy, humanVerifiedAt

Auth: uses Application Default Credentials. Point GOOGLE_APPLICATION_CREDENTIALS
at the Firebase Admin SDK service account JSON for ue5-questions-prod.

Usage:
  python scripts/reset_orphan_recovery_to_pending.py             # dry run
  python scripts/reset_orphan_recovery_to_pending.py --live      # commits writes
"""
import argparse
import sys

import firebase_admin
from firebase_admin import firestore
from google.cloud.firestore_v1 import DELETE_FIELD

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

GCP_PROJECT = "ue5-questions-prod"

# Reviewer-side fields cleared via Firestore DELETE_FIELD sentinel
REVIEW_FIELDS_TO_DELETE = [
    "reviewerName",
    "reviewedBy",
    "reviewedAt",
    "reviewStartedAt",
    "reviewCompletedAt",
    "reviewDuration",
    "acceptedAt",
    "acceptedBy",
    "rejectedAt",
    "rejectedBy",
    "rejectionReason",
    "critiqueScore",
    "humanVerified",
    "humanVerifiedBy",
    "humanVerifiedAt",
]


def init_db():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={"projectId": GCP_PROJECT})
    return firestore.client()


def build_reset_payload():
    payload = {"status": "pending"}
    for f in REVIEW_FIELDS_TO_DELETE:
        payload[f] = DELETE_FIELD
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="Commit writes")
    args = parser.parse_args()
    dry_run = not args.live

    db = init_db()
    print(f"Project: {GCP_PROJECT}")
    print(f"Mode: {'LIVE WRITE' if not dry_run else 'DRY RUN'}")
    print("Querying questions where _recoveredFromOrphan == True ...")

    query = db.collection("questions").where("_recoveredFromOrphan", "==", True)
    snaps = list(query.stream())
    print(f"Found {len(snaps)} bot-authored docs to reset.")
    if not snaps:
        return

    print("\nDocs that would be reset:")
    for s in snaps:
        d = s.to_dict() or {}
        q_text = (d.get("question") or "").replace("\n", " ").strip()
        print(
            f"  - {s.id}  status={d.get('status'):<10}  discipline={d.get('discipline', ''):<14}  "
            f"q={q_text[:70]!r}"
        )

    if dry_run:
        print(
            f"\nDry run only. {len(snaps)} docs would be updated. "
            "Re-run with --live to commit."
        )
        return

    payload = build_reset_payload()
    batch = db.batch()
    for s in snaps:
        batch.update(db.collection("questions").document(s.id), payload)
    batch.commit()
    print(f"\nCommitted: {len(snaps)} docs reset to status='pending'.")


if __name__ == "__main__":
    main()
