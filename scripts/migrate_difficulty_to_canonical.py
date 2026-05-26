"""
Migrate legacy difficulty strings in Firestore to the canonical vocabulary.

  Easy   -> Beginner
  Medium -> Intermediate
  Hard   -> Expert

Why: the app currently stores two interchangeable vocabularies side-by-side
("Easy/Medium/Hard" and "Beginner/Intermediate/Expert"). The runtime
classifier accepts both, but the dual vocabulary is a footgun for every
new query/component. This migration normalizes Firestore so the rest of
the codebase can use exact-match comparisons again.

Safety:
  * Default mode is dry-run — it scans and reports without writing.
  * Pass `--commit` to actually write.
  * Writes in batches of 400 (under Firestore's 500-op batch ceiling) and
    only updates docs whose difficulty actually needs to change.
  * Each updated doc gets `migratedFromLegacyDifficultyAt` (ISO timestamp)
    and `legacyDifficulty` (original value) for auditability + rollback.

Usage:
  Dry-run (default):
    python scripts/migrate_difficulty_to_canonical.py

  Commit (writes to prod):
    python scripts/migrate_difficulty_to_canonical.py --commit

  Limit to a single discipline (handy for staged rollout):
    python scripts/migrate_difficulty_to_canonical.py --discipline "Tech Art"
    python scripts/migrate_difficulty_to_canonical.py --discipline "Tech Art" --commit
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore


SERVICE_ACCOUNT = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
BATCH_SIZE = 400  # Firestore batch ceiling is 500; leave headroom.

LEGACY_TO_CANONICAL = {
    "Easy": "Beginner",
    "Medium": "Intermediate",
    "Hard": "Expert",
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument(
        "--commit",
        action="store_true",
        help="Write changes to Firestore. Without this flag the script is dry-run.",
    )
    p.add_argument(
        "--discipline",
        default=None,
        help="Restrict the migration to a single discipline (exact match).",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()

    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    coll = db.collection("questions")

    query = coll
    if args.discipline:
        query = query.where("discipline", "==", args.discipline)

    mode_label = "COMMIT (writing to Firestore)" if args.commit else "DRY-RUN (no writes)"
    scope_label = f"discipline={args.discipline!r}" if args.discipline else "all disciplines"
    print(f"\nMode:  {mode_label}")
    print(f"Scope: {scope_label}\n")

    scanned = 0
    needs_migration = 0
    already_canonical = 0
    unknown_values: Counter[str] = Counter()
    mapped: Counter[str] = Counter()  # raw -> canonical pair we plan to write

    pending_updates = []  # list of (doc_ref, raw_value, canonical_value)

    for doc in query.stream():
        scanned += 1
        data = doc.to_dict() or {}
        raw = data.get("difficulty", "")

        if raw in LEGACY_TO_CANONICAL:
            canonical = LEGACY_TO_CANONICAL[raw]
            needs_migration += 1
            mapped[f"{raw} -> {canonical}"] += 1
            pending_updates.append((doc.reference, raw, canonical))
        elif raw in ("Beginner", "Intermediate", "Expert"):
            already_canonical += 1
        else:
            unknown_values[raw] += 1

    print(f"Scanned {scanned} docs")
    print(f"  Already canonical:  {already_canonical}")
    print(f"  Needs migration:    {needs_migration}")
    if unknown_values:
        print(f"  Unknown values:     {sum(unknown_values.values())}")
        for v, c in unknown_values.most_common():
            print(f"     - {v!r:30} count={c}  (leaving untouched)")

    if not pending_updates:
        print("\n[OK] Nothing to do.")
        return 0

    print("\nPlanned changes:")
    for pair, count in mapped.most_common():
        print(f"  {pair:<28} {count} docs")

    if not args.commit:
        print(
            "\nDry-run complete. Re-run with `--commit` to apply these "
            f"{needs_migration} updates."
        )
        return 0

    # ── Commit path ──────────────────────────────────────────────────
    confirm = input(
        f"\nAbout to write {needs_migration} updates to PRODUCTION Firestore. "
        "Type 'yes' to proceed: "
    )
    if confirm.strip().lower() != "yes":
        print("Aborted.")
        return 1

    now_iso = datetime.now(timezone.utc).isoformat()
    written = 0
    batch = db.batch()
    ops_in_batch = 0

    for doc_ref, raw, canonical in pending_updates:
        batch.update(
            doc_ref,
            {
                "difficulty": canonical,
                "legacyDifficulty": raw,
                "migratedFromLegacyDifficultyAt": now_iso,
            },
        )
        ops_in_batch += 1
        if ops_in_batch >= BATCH_SIZE:
            batch.commit()
            written += ops_in_batch
            print(f"  ... committed {written}/{needs_migration}")
            batch = db.batch()
            ops_in_batch = 0

    if ops_in_batch:
        batch.commit()
        written += ops_in_batch

    print(f"\n[OK] Wrote {written} updates.")
    print(
        "Audit fields added to every migrated doc:\n"
        "  legacyDifficulty            (original value, for rollback)\n"
        f"  migratedFromLegacyDifficultyAt  = {now_iso}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
