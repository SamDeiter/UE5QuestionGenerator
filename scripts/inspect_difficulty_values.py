"""
Diagnose what `difficulty` values actually live in Firestore.

Run from repo root:
    python scripts/inspect_difficulty_values.py

Reports:
  - Distinct raw difficulty strings and their counts
  - How each one classifies under the SCORM matcher
    (easy / medium / hard / other), mirroring
    src/utils/quizUtils.js#classifyDifficulty.
  - Breakdown by status (accepted/pending) and discipline so we can spot
    whether legacy "Easy/Medium/Hard" data is concentrated in one cohort.

The classifier accepts BOTH vocabularies:
  Easy / Beginner             -> easy
  Medium / Intermediate       -> medium
  Hard / Expert / Advanced    -> hard
  (anything else)             -> other
"""

from collections import Counter, defaultdict

import firebase_admin
from firebase_admin import credentials, firestore


SERVICE_ACCOUNT = "backups/assets/ue5-questions-prod-99289c4d03b3.json"


def classify(raw: str) -> str:
    d = (raw or "").lower()
    if not d:
        return "other"
    if "easy" in d or "beginner" in d:
        return "easy"
    if "medium" in d or "intermediate" in d:
        return "medium"
    if "hard" in d or "expert" in d or "advanced" in d:
        return "hard"
    return "other"


def main() -> None:
    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    questions = db.collection("questions").stream()

    raw_counter: Counter[str] = Counter()
    tier_counter: Counter[str] = Counter()
    by_status: dict[str, Counter[str]] = defaultdict(Counter)
    by_discipline: dict[str, Counter[str]] = defaultdict(Counter)
    examples: dict[str, str] = {}

    total = 0
    for doc in questions:
        data = doc.to_dict() or {}
        total += 1
        raw = data.get("difficulty", "")
        tier = classify(raw)

        raw_counter[raw] += 1
        tier_counter[tier] += 1
        by_status[data.get("status", "<missing>")][tier] += 1
        by_discipline[data.get("discipline", "<missing>")][tier] += 1

        # Remember one example doc id per raw value
        examples.setdefault(raw, doc.id)

    print(f"\nScanned {total} question docs\n")

    print("Distinct raw `difficulty` values:")
    for raw, count in raw_counter.most_common():
        tier = classify(raw)
        label = repr(raw) if raw != "" else "<empty/missing>"
        print(
            f"  {label:<30} count={count:<6} -> classified as {tier:<6}  "
            f"(sample doc: {examples[raw]})"
        )

    print("\nClassifier totals across all questions:")
    for tier in ("easy", "medium", "hard", "other"):
        print(f"  {tier:<6} {tier_counter[tier]}")

    print("\nBy status:")
    for status, c in by_status.items():
        print(
            f"  status={status:<12} easy={c['easy']:<5} "
            f"medium={c['medium']:<5} hard={c['hard']:<5} other={c['other']}"
        )

    print("\nBy discipline (accepted+pending+other combined):")
    for disc, c in sorted(by_discipline.items()):
        print(
            f"  {disc:<18} easy={c['easy']:<5} medium={c['medium']:<5} "
            f"hard={c['hard']:<5} other={c['other']}"
        )

    others = [r for r in raw_counter if classify(r) == "other"]
    if others:
        print(
            "\n[!] Raw values that did NOT match any tier "
            "(will land in 'other' / be missed by SCORM weighted draw):"
        )
        for r in others:
            print(f"   - {r!r}  (count={raw_counter[r]})")
    else:
        print("\n[OK] Every difficulty value classified into easy/medium/hard.")


if __name__ == "__main__":
    main()
