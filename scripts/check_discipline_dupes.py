"""
Verify whether 'Animation & Rigging' (10 docs) and 'Technical Art' (20 docs)
are duplicates of 'Animation' / 'Tech Art' respectively.

Reports:
  - All docs in the suspect disciplines (id, uniqueId, language, question text)
  - Whether their uniqueId or question text already exists in the canonical
    discipline (Animation / Tech Art)
"""

import os
from collections import defaultdict

import firebase_admin
from firebase_admin import credentials, firestore

SERVICE_ACCOUNT = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
FIREBASE_PROJECT_ID = "ue5-questions-prod"


def _init_firebase() -> None:
    if firebase_admin._apps:
        return
    if os.path.exists(SERVICE_ACCOUNT):
        firebase_admin.initialize_app(credentials.Certificate(SERVICE_ACCOUNT))
    else:
        firebase_admin.initialize_app(
            credentials.ApplicationDefault(),
            {"projectId": FIREBASE_PROJECT_ID},
        )


SUSPECT_PAIRS = [
    ("Animation & Rigging", "Animation"),
    ("Technical Art", "Tech Art"),
]


def _short(text: str, n: int = 80) -> str:
    text = (text or "").replace("\n", " ").strip()
    return text[:n] + ("..." if len(text) > n else "")


def main() -> None:
    _init_firebase()
    db = firestore.client()

    # Pre-build an index of (uniqueId -> set of disciplines) so we can ask
    # "does this uniqueId already live in the canonical discipline?"
    print("Building discipline index over all questions...")
    uniqueid_to_disciplines: dict[str, set[str]] = defaultdict(set)
    text_to_uniqueids_per_disc: dict[tuple[str, str], set[str]] = defaultdict(set)
    discipline_counts: dict[str, int] = defaultdict(int)

    for doc in db.collection("questions").stream():
        data = doc.to_dict() or {}
        disc = data.get("discipline", "<missing>")
        uid = data.get("uniqueId", doc.id)
        qtext = (data.get("question") or "").strip()
        discipline_counts[disc] += 1
        uniqueid_to_disciplines[uid].add(disc)
        if qtext:
            text_to_uniqueids_per_disc[(disc, qtext)].add(uid)

    print(f"Indexed {sum(discipline_counts.values())} docs.\n")
    print("Discipline counts:")
    for disc, n in sorted(discipline_counts.items(), key=lambda x: -x[1]):
        print(f"  {disc:<22} {n}")

    for suspect, canonical in SUSPECT_PAIRS:
        print("\n" + "=" * 70)
        print(f"SUSPECT: {suspect!r}  vs  CANONICAL: {canonical!r}")
        print("=" * 70)

        suspect_docs = list(
            db.collection("questions").where("discipline", "==", suspect).stream()
        )
        print(f"Found {len(suspect_docs)} docs in {suspect!r}.\n")

        if not suspect_docs:
            continue

        same_uid_in_canonical = 0
        same_text_in_canonical = 0
        per_uid_languages: dict[str, set[str]] = defaultdict(set)

        for doc in suspect_docs:
            data = doc.to_dict() or {}
            uid = data.get("uniqueId", doc.id)
            lang = data.get("language", "<missing>")
            qtext = (data.get("question") or "").strip()
            diff = data.get("difficulty", "")
            status = data.get("status", "")

            per_uid_languages[uid].add(lang)

            uid_also_in_canonical = canonical in uniqueid_to_disciplines.get(uid, set())
            text_dupes_in_canonical = text_to_uniqueids_per_disc.get((canonical, qtext), set())
            text_dupes_in_canonical_other_uid = text_dupes_in_canonical - {uid}

            if uid_also_in_canonical:
                same_uid_in_canonical += 1
            if text_dupes_in_canonical_other_uid:
                same_text_in_canonical += 1

            flags = []
            if uid_also_in_canonical:
                flags.append(f"SAME uniqueId exists in {canonical!r}")
            if text_dupes_in_canonical_other_uid:
                flags.append(
                    f"SAME question text matches {len(text_dupes_in_canonical_other_uid)} uniqueId(s) in {canonical!r}"
                )
            flag_str = "  ".join(flags) if flags else "(no overlap with canonical)"

            print(
                f"  doc={doc.id}\n"
                f"    uniqueId={uid}  lang={lang}  difficulty={diff}  status={status}\n"
                f"    text={_short(qtext)}\n"
                f"    -> {flag_str}\n"
            )

        # Per-uniqueId summary
        distinct_uids = set(per_uid_languages.keys())
        print(
            f"Summary for {suspect!r}: {len(suspect_docs)} docs across "
            f"{len(distinct_uids)} unique source-questions."
        )
        print(
            f"  - {same_uid_in_canonical} docs have a uniqueId that ALSO exists in {canonical!r}"
        )
        print(
            f"  - {same_text_in_canonical} docs have question text matching a "
            f"different uniqueId in {canonical!r}"
        )

        # Are the suspect docs concentrated in one language, or spread across all 10?
        lang_breakdown: dict[str, int] = defaultdict(int)
        for doc in suspect_docs:
            data = doc.to_dict() or {}
            lang_breakdown[data.get("language", "<missing>")] += 1
        print(f"  - language spread: {dict(lang_breakdown)}")


if __name__ == "__main__":
    main()
