"""
One-time migration: convert dict-typed firestoreUpdatedAt to native Timestamp.

CONTEXT
-------
Some questions docs in prod have firestoreUpdatedAt stored as a plain dict
{seconds, nanoseconds} instead of a Firestore Timestamp. Firestore's orderBy()
silently excludes those docs from query results, which broke the manual
"Force Re-sync" path (it returned 0 docs).

The realtime listener was already patched to drop orderBy (commit 446c48b1),
and getAllQuestionsFromFirestore now does the same. This script fixes the
underlying data so orderBy works correctly going forward.

USAGE
-----
Dry run (default — prints what it would change, makes no writes):
    python scripts/migrate_firestoreupdatedat_dicts.py

Live run (commits the writes):
    python scripts/migrate_firestoreupdatedat_dicts.py --live

Auth: uses backups/assets/ue5-questions-prod-99289c4d03b3.json.
"""
import argparse
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

SERVICE_ACCOUNT = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
BATCH_SIZE = 400  # Firestore caps batches at 500 ops


def init_db():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(SERVICE_ACCOUNT))
    return firestore.client()


def to_timestamp(value):
    """Convert a stored firestoreUpdatedAt value into a real Firestore Timestamp.

    Returns either a datetime (which the SDK serializes as Timestamp) or
    SERVER_TIMESTAMP as a fallback when no usable time is present.
    """
    if isinstance(value, dict):
        seconds = value.get("seconds")
        nanos = value.get("nanoseconds", 0)
        if isinstance(seconds, (int, float)):
            micros = int(nanos // 1000) if isinstance(nanos, (int, float)) else 0
            return datetime.fromtimestamp(seconds, tz=timezone.utc).replace(microsecond=micros)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return SERVER_TIMESTAMP
    return SERVER_TIMESTAMP


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--live",
        action="store_true",
        help="Actually commit the writes. Default is dry-run.",
    )
    args = parser.parse_args()
    dry_run = not args.live

    db = init_db()
    print(f"Mode: {'LIVE WRITE' if not dry_run else 'DRY RUN (no writes)'}")
    print("Scanning questions collection ...")

    docs = db.collection("questions").stream()

    fixable = []  # list of (doc_id, original_value, normalized_value)
    skipped_str = 0
    total = 0

    for d in docs:
        total += 1
        data = d.to_dict()
        v = data.get("firestoreUpdatedAt")
        # Native Firestore Timestamps come back as DatetimeWithNanoseconds (a
        # datetime subclass). Anything else needs fixing.
        if isinstance(v, datetime):
            continue
        if v is None:
            fixable.append((d.id, None, SERVER_TIMESTAMP))
            continue
        if isinstance(v, dict):
            fixable.append((d.id, v, to_timestamp(v)))
            continue
        if isinstance(v, str):
            skipped_str += 1
            fixable.append((d.id, v, to_timestamp(v)))
            continue
        # Anything else: log and skip
        print(f"  ! Unrecognized type {type(v).__name__} on {d.id}: {v!r}")

    print(f"Total docs scanned: {total}")
    print(f"Fixable: {len(fixable)} (string-typed: {skipped_str})")
    if fixable:
        sample = fixable[:5]
        print("Sample fixes:")
        for doc_id, before, after in sample:
            print(f"  {doc_id}")
            print(f"    before: {before!r}")
            print(f"    after:  {after!r}")

    if dry_run:
        print("\nDry run complete. Re-run with --live to commit writes.")
        return

    print(f"\nCommitting {len(fixable)} updates in batches of {BATCH_SIZE} ...")
    written = 0
    for i in range(0, len(fixable), BATCH_SIZE):
        chunk = fixable[i : i + BATCH_SIZE]
        batch = db.batch()
        for doc_id, _before, after in chunk:
            ref = db.collection("questions").document(doc_id)
            batch.update(ref, {"firestoreUpdatedAt": after})
        batch.commit()
        written += len(chunk)
        print(f"  committed {written}/{len(fixable)}")

    print(f"\nDone. {written} docs updated.")


if __name__ == "__main__":
    main()
