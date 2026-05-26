"""
audit_orphan_recovery.py
------------------------
Count and dump every Firestore question authored by the Orphan Recovery Bot
(see scripts/recover_orphan_english.py). The marker is `_recoveredFromOrphan == True`,
which is unique to that script and avoids over-counting docs written by
cloud_translate_bulk (which shares the same creatorId).

Output: prints a count + CSV at scripts/orphan_recovery_audit.csv with one row
per recovered doc.

Auth: uses Application Default Credentials. Point GOOGLE_APPLICATION_CREDENTIALS
at the Firebase Admin SDK service account JSON for ue5-questions-prod.

Usage:
  python scripts/audit_orphan_recovery.py
"""
import csv
import sys
from datetime import datetime, timezone
from pathlib import Path

import firebase_admin
from firebase_admin import firestore

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

GCP_PROJECT = "ue5-questions-prod"
OUTPUT_CSV = Path(__file__).parent / "orphan_recovery_audit.csv"


def init_db():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={"projectId": GCP_PROJECT})
    return firestore.client()


def format_created_at(value):
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value / 1000, tz=timezone.utc).isoformat()
        except (OverflowError, OSError, ValueError):
            return str(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def main():
    db = init_db()
    print(f"Project: {GCP_PROJECT}")
    print("Querying questions where _recoveredFromOrphan == True ...")

    query = db.collection("questions").where("_recoveredFromOrphan", "==", True)
    rows = []
    for snap in query.stream():
        d = snap.to_dict() or {}
        rows.append(
            {
                "docId": snap.id,
                "uniqueId": d.get("uniqueId", ""),
                "discipline": d.get("discipline", ""),
                "difficulty": d.get("difficulty", ""),
                "status": d.get("status", ""),
                "question": (d.get("question") or "").replace("\n", " ").strip(),
                "sourceUrl": d.get("sourceUrl", ""),
                "createdAt": format_created_at(d.get("createdAt")),
                "creatorName": d.get("creatorName", ""),
                "creatorId": d.get("creatorId", ""),
                "language": d.get("language", ""),
            }
        )

    print(f"\nTotal recovered docs: {len(rows)}")

    if not rows:
        print("Nothing to write.")
        return

    fieldnames = list(rows[0].keys())
    with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote CSV: {OUTPUT_CSV}")

    by_status = {}
    by_discipline = {}
    for r in rows:
        by_status[r["status"]] = by_status.get(r["status"], 0) + 1
        by_discipline[r["discipline"]] = by_discipline.get(r["discipline"], 0) + 1
    print(f"\nBy status:     {by_status}")
    print(f"By discipline: {by_discipline}")


if __name__ == "__main__":
    main()
