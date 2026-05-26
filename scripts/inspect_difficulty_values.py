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
  - Distinct `legacyDifficulty` values (audit field written by
    migrate_difficulty_to_canonical.py) so we can tell whether the
    pre-migration data had variety that we could restore.
  - Cross-tab of current `difficulty` x `legacyDifficulty` — if we see
    rows like (current=Intermediate, legacy=Easy) or
    (current=Intermediate, legacy=Hard), something overwrote the
    difficulty after the migration and we have a regression to roll back.

The classifier accepts BOTH vocabularies:
  Easy / Beginner             -> easy
  Medium / Intermediate       -> medium
  Hard / Expert / Advanced    -> hard
  (anything else)             -> other
"""

import os
from collections import Counter, defaultdict

import firebase_admin
from firebase_admin import credentials, firestore


SERVICE_ACCOUNT = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
FIREBASE_PROJECT_ID = "ue5-questions-prod"


def _init_firebase() -> None:
    """Use service account JSON if available; otherwise fall back to gcloud ADC."""
    if firebase_admin._apps:
        return
    if os.path.exists(SERVICE_ACCOUNT):
        cred = credentials.Certificate(SERVICE_ACCOUNT)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app(
            credentials.ApplicationDefault(),
            {"projectId": FIREBASE_PROJECT_ID},
        )


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
    _init_firebase()

    db = firestore.client()
    questions = db.collection("questions").stream()

    raw_counter: Counter[str] = Counter()
    tier_counter: Counter[str] = Counter()
    by_status: dict[str, Counter[str]] = defaultdict(Counter)
    by_discipline: dict[str, Counter[str]] = defaultdict(Counter)
    by_language: dict[str, Counter[str]] = defaultdict(Counter)  # NEW: vocab x language
    by_language_raw: dict[str, Counter[str]] = defaultdict(Counter)  # NEW: raw values per language
    examples: dict[str, str] = {}

    # Per-uniqueId tracking: does the same source question carry legacy vocab
    # across all its language copies, or only some?
    uniqueid_difficulties: dict[str, set[str]] = defaultdict(set)
    uniqueid_languages: dict[str, set[str]] = defaultdict(set)

    # Audit-field diagnostics: was the original (pre-migration) data different?
    legacy_counter: Counter[str] = Counter()
    legacy_present = 0
    cross_tab: Counter[tuple[str, str]] = Counter()  # (current_difficulty, legacy_difficulty)
    suspicious_examples: dict[tuple[str, str], str] = {}

    total = 0
    for doc in questions:
        data = doc.to_dict() or {}
        total += 1
        raw = data.get("difficulty", "")
        tier = classify(raw)
        language = data.get("language", "<missing>")
        unique_id = data.get("uniqueId", doc.id)

        raw_counter[raw] += 1
        tier_counter[tier] += 1
        by_status[data.get("status", "<missing>")][tier] += 1
        by_discipline[data.get("discipline", "<missing>")][tier] += 1
        by_language[language][tier] += 1
        # Track whether each language has legacy vs canonical vocab
        if raw in ("Easy", "Medium", "Hard"):
            by_language_raw[language]["legacy"] += 1
        elif raw in ("Beginner", "Intermediate", "Expert"):
            by_language_raw[language]["canonical"] += 1
        else:
            by_language_raw[language]["other"] += 1

        uniqueid_difficulties[unique_id].add(raw)
        uniqueid_languages[unique_id].add(language)

        # Remember one example doc id per raw value
        examples.setdefault(raw, doc.id)

        # Audit-field tracking
        legacy = data.get("legacyDifficulty")
        if legacy is not None:
            legacy_present += 1
            legacy_counter[legacy] += 1
            pair = (raw, legacy)
            cross_tab[pair] += 1
            # Flag pairs where the migration would NOT have produced the
            # current value (e.g. legacy=Easy but current=Intermediate ->
            # something overwrote difficulty after the 1:1 migration).
            expected = {"Easy": "Beginner", "Medium": "Intermediate", "Hard": "Expert"}.get(legacy)
            if expected and raw != expected:
                suspicious_examples.setdefault(pair, doc.id)

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

    # ── Language breakdown: did translation introduce or amplify the legacy vocab? ──
    print("\nBy language (legacy=Easy/Medium/Hard vs canonical=Beginner/Intermediate/Expert):")
    for lang in sorted(by_language_raw.keys()):
        c = by_language_raw[lang]
        legacy = c.get("legacy", 0)
        canonical = c.get("canonical", 0)
        other = c.get("other", 0)
        total_lang = legacy + canonical + other
        if total_lang == 0:
            continue
        legacy_pct = 100 * legacy / total_lang
        print(
            f"  {lang:<22} total={total_lang:<6} legacy={legacy:<5} ({legacy_pct:>5.1f}%) "
            f"canonical={canonical:<5} other={other}"
        )

    # ── Per-source-question coherence: does the same uniqueId carry consistent vocab? ──
    multi_lang_uniqueids = {
        uid: langs for uid, langs in uniqueid_languages.items() if len(langs) > 1
    }
    print(
        f"\nFound {len(multi_lang_uniqueids)} uniqueIds with translations "
        f"(out of {len(uniqueid_languages)} total source questions)"
    )

    mixed_vocab_uniqueids = []  # source-q with BOTH legacy and canonical across langs
    consistent_legacy = 0
    consistent_canonical = 0
    consistent_mixed_other = 0
    for uid, diffs in uniqueid_difficulties.items():
        if len(uniqueid_languages[uid]) < 2:
            continue  # only care about translated questions
        has_legacy = bool(diffs & {"Easy", "Medium", "Hard"})
        has_canonical = bool(diffs & {"Beginner", "Intermediate", "Expert"})
        if has_legacy and has_canonical:
            mixed_vocab_uniqueids.append(uid)
        elif has_legacy:
            consistent_legacy += 1
        elif has_canonical:
            consistent_canonical += 1
        else:
            consistent_mixed_other += 1

    print(
        f"\nAmong translated source-questions ({len(multi_lang_uniqueids)} total):"
    )
    print(f"  all-copies use legacy (Easy/Medium/Hard):     {consistent_legacy}")
    print(f"  all-copies use canonical (Beg/Int/Exp):       {consistent_canonical}")
    print(f"  mixed (translation drift across languages):   {len(mixed_vocab_uniqueids)}")
    print(f"  other/none of the above:                      {consistent_mixed_other}")

    if mixed_vocab_uniqueids:
        print(
            "\n[!] Sample uniqueIds where translation copies disagree on difficulty vocab:"
        )
        for uid in mixed_vocab_uniqueids[:5]:
            print(f"   uniqueId={uid!r} -> difficulties seen: {sorted(uniqueid_difficulties[uid])}")
        print(
            "\n   If this list is non-empty: translation flow DID drift difficulty across "
            "language copies. If it's empty: translation faithfully copied the source value."
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

    # ── Audit-field diagnostics ──────────────────────────────────────────
    print(
        f"\nAudit fields: {legacy_present}/{total} docs carry a "
        "`legacyDifficulty` (from migrate_difficulty_to_canonical.py)"
    )

    if legacy_present == 0:
        print(
            "  (No audit fields found. Either the migration never ran, or "
            "the docs predate it. Cannot use legacyDifficulty for rollback.)"
        )
    else:
        print("\nDistinct `legacyDifficulty` values:")
        for legacy, count in legacy_counter.most_common():
            print(f"  {legacy!r:<20} count={count}")

        print("\nCross-tab  (current difficulty -> legacyDifficulty -> count):")
        for (current, legacy), count in cross_tab.most_common():
            marker = ""
            expected = {"Easy": "Beginner", "Medium": "Intermediate", "Hard": "Expert"}.get(legacy)
            if expected and current != expected:
                marker = "  <-- DRIFT: post-migration overwrite suspected"
            print(f"  current={current!r:<18} legacy={legacy!r:<10} count={count:<6}{marker}")

        if suspicious_examples:
            print(
                "\n[!] Found docs whose current difficulty does NOT match the "
                "1:1 mapping of their legacyDifficulty. Something rewrote them "
                "after the migration:"
            )
            for (current, legacy), doc_id in list(suspicious_examples.items())[:10]:
                print(
                    f"   legacy={legacy!r} -> expected current={ {'Easy':'Beginner','Medium':'Intermediate','Hard':'Expert'}.get(legacy)!r:<14} "
                    f"actual current={current!r:<14} (sample doc: {doc_id})"
                )
            print(
                "\n   These docs are rollback candidates: their original difficulty "
                "lives in `legacyDifficulty` and we can map it back to canonical."
            )
        else:
            print(
                "\n[OK] Every doc with a legacyDifficulty audit field still has "
                "the expected post-migration value. No post-migration drift detected."
            )


if __name__ == "__main__":
    main()
