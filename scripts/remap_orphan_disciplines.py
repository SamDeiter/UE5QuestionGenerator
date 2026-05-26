"""
Remap orphan discipline labels in Firestore to their canonical equivalents.

  "Animation & Rigging"  ->  "Animation"
  "Technical Art"        ->  "Tech Art"

Why: a small set of question docs were generated with discipline strings that
don't match the canonical UI disciplines, so they don't show up in normal
discipline-filtered views. Confirmed via scripts/check_discipline_dupes.py
that these aren't content duplicates — they're real questions filed under
slightly-misspelled discipline names.

Safety:
  * Default mode is dry-run — scans and reports without writing.
  * Pass `--commit` to actually write.
  * Writes in batches of 400 (under Firestore's 500-op batch ceiling) and
    only updates docs whose discipline actually needs to change.
  * Each updated doc gets `remappedFromDisciplineAt` (ISO timestamp) and
    `legacyDiscipline` (original value) for auditability + rollback.
  * Asks for explicit 'yes' confirmation before committing.

Usage:
  Dry-run (default):
    python scripts/remap_orphan_disciplines.py

  Commit (writes to prod):
    python scripts/remap_orphan_disciplines.py --commit
"""

from __future__ import annotations

import argparse
import os
import sys
from collections import Counter
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore


SERVICE_ACCOUNT = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
FIREBASE_PROJECT_ID = "ue5-questions-prod"
BATCH_SIZE = 400  # Firestore batch ceiling is 500; leave headroom.

ORPHAN_TO_CANONICAL = {
    "Animation & Rigging": "Animation",
    "Technical Art": "Tech Art",
}


def _init_firebase() -> None:
    """Use service-account JSON if present, else fall back to gcloud ADC."""
    if firebase_admin._apps:
        return
    if os.path.exists(SERVICE_ACCOUNT):
        firebase_admin.initialize_app(credentials.Certificate(SERVICE_ACCOUNT))
    else:
        firebase_admin.initialize_app(
            credentials.ApplicationDefault(),
            {"projectId": FIREBASE_PROJECT_ID},
        )


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument(
        "--commit",
        action="store_true",
        help="Write changes to Firestore. Without this flag the script is dry-run.",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()
    _init_firebase()

    db = firestore.client()
    coll = db.collection("questions")

    mode_label = "COMMIT (writing to Firestore)" if args.commit else "DRY-RUN (no writes)"
    print(f"\nMode: {mode_label}")
    print(f"Remap table:")
    for orphan, canonical in ORPHAN_TO_CANONICAL.items():
        print(f"  {orphan!r} -> {canonical!r}")
    print()

    pending_updates = []  # (doc_ref, doc_id, orphan_disc, canonical_disc, language, uniqueId)
    mapped: Counter[str] = Counter()

    for orphan, canonical in ORPHAN_TO_CANONICAL.items():
        docs = list(coll.where("discipline", "==", orphan).stream())
        print(f"Found {len(docs)} docs with discipline={orphan!r}")
        for doc in docs:
            data = doc.to_dict() or {}
            pending_updates.append(
                (
                    doc.reference,
                    doc.id,
                    orphan,
                    canonical,
                    data.get("language", "<missing>"),
                    data.get("uniqueId", doc.id),
                )
            )
            mapped[f"{orphan} -> {canonical}"] += 1

    print(f"\nTotal docs to remap: {len(pending_updates)}")
    for pair, count in mapped.most_common():
        print(f"  {pair}: {count}")

    if not pending_updates:
        print("\n[OK] Nothing to do.")
        return 0

    # Show every planned update for review
    print("\nPlanned writes:")
    for ref, doc_id, orphan, canonical, lang, uid in pending_updates:
        print(f"  doc={doc_id}")
        print(f"    uniqueId={uid}  language={lang}")
        print(f"    discipline: {orphan!r} -> {canonical!r}")

    if not args.commit:
        print(
            f"\nDry-run complete. Re-run with `--commit` to apply these "
            f"{len(pending_updates)} updates."
        )
        return 0

    # ── Commit path ──────────────────────────────────────────────────
    confirm = input(
        f"\nAbout to write {len(pending_updates)} updates to PRODUCTION Firestore. "
        "Type 'yes' to proceed: "
    )
    if confirm.strip().lower() != "yes":
        print("Aborted.")
        return 1

    now_iso = datetime.now(timezone.utc).isoformat()
    written = 0
    batch = db.batch()
    ops_in_batch = 0

    for doc_ref, _doc_id, orphan, canonical, _lang, _uid in pending_updates:
        batch.update(
            doc_ref,
            {
                "discipline": canonical,
                "legacyDiscipline": orphan,
                "remappedFromDisciplineAt": now_iso,
            },
        )
        ops_in_batch += 1
        if ops_in_batch >= BATCH_SIZE:
            batch.commit()
            written += ops_in_batch
            print(f"  ... committed {written}/{len(pending_updates)}")
            batch = db.batch()
            ops_in_batch = 0

    if ops_in_batch:
        batch.commit()
        written += ops_in_batch

    print(f"\n[OK] Wrote {written} updates.")
    print(
        "Audit fields added to every remapped doc:\n"
        "  legacyDiscipline            (original value, for rollback)\n"
        f"  remappedFromDisciplineAt    = {now_iso}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
