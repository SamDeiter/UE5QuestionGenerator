"""
recover_orphan_english.py
--------------------------
Recover English base questions for the 21 orphaned uniqueIds whose
English content was overwritten by an earlier bulk-translate run.

For each orphan:
1. Pick up to 3 source translations in priority order:
   Spanish > Portuguese > French > Italian > German > anything else
2. Send the 3 to Gemini Vertex AI in a single prompt and ask for
   the most-faithful English reconstruction.
3. Move the corrupted base doc (currently at id=<uniqueId> with the
   wrong language) to id=<uniqueId>_<that-language>, preserving it
   as a proper translation variant at the suffixed location.
4. Write the new English doc to id=<uniqueId> with status=accepted.

Usage:
  python scripts/recover_orphan_english.py            # dry run
  python scripts/recover_orphan_english.py --live     # commits writes
"""
import argparse
import json
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore
from google import genai
from google.genai import types

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SERVICE_ACCOUNT = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
MODEL = "gemini-2.5-flash"
GCP_PROJECT = "development-317819"
GCP_LOCATION = "us-central1"

# Priority order for picking source translations (best round-trip first).
SOURCE_PRIORITY = [
    "Spanish",
    "Portuguese",
    "French",
    "Italian",
    "German",
    "Russian",
    "Japanese",
    "Korean",
    "Chinese (Simplified)",
]

RECOVERY_BOT_CREATOR_ID = "AF4rHG5PHzXCUBZMftJ1cySdz442"  # same as cloud_translate_bulk
MAX_RETRIES = 5


def init_db():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(SERVICE_ACCOUNT))
    return firestore.client()


def find_orphans(db):
    """Return {uniqueId: {language: doc_snapshot}} for all 21 orphans."""
    variants_by_uid = defaultdict(dict)
    for d in db.collection("questions").stream():
        data = d.to_dict()
        uid = data.get("uniqueId")
        if not uid:
            continue
        lang = data.get("language") or "English"
        variants_by_uid[uid][lang] = (d.id, data)

    orphans = {
        uid: variants
        for uid, variants in variants_by_uid.items()
        if "English" not in variants
    }
    return orphans


def pick_sources(variants, max_n=3):
    """Pick up to max_n source translations in priority order."""
    chosen = []
    for lang in SOURCE_PRIORITY:
        if lang in variants and len(chosen) < max_n:
            chosen.append(lang)
    return chosen


def build_recovery_prompt(sources):
    """Build a prompt that asks Gemini to reconstruct English from N translations."""
    blocks = []
    for lang, q in sources:
        blocks.append(
            f"--- Source: {lang} ---\n"
            + json.dumps(
                {
                    "Question": q.get("question"),
                    "OptionA": q.get("options", {}).get("A"),
                    "OptionB": q.get("options", {}).get("B"),
                    "OptionC": q.get("options", {}).get("C", ""),
                    "OptionD": q.get("options", {}).get("D", ""),
                    "SourceExcerpt": q.get("sourceExcerpt"),
                },
                indent=2,
                ensure_ascii=False,
            )
        )

    return (
        "You are a professional technical translator for Unreal Engine 5 "
        "documentation. The English ORIGINAL of a quiz question was lost. "
        f"Below are {len(sources)} translations of the same question in different "
        "languages. Reconstruct the most accurate English version by reading all "
        "of them and producing a single English JSON object.\n\n"
        "RULES:\n"
        "1. Return ONLY valid JSON. No markdown, no code fences, no explanation.\n"
        "2. Output keys: Question, OptionA, OptionB, OptionC, OptionD, SourceExcerpt.\n"
        "3. Use precise Unreal Engine 5 terminology in English (do not invent terms).\n"
        "4. If the sources disagree, prefer the meaning shared by the majority.\n"
        "5. If a field is empty in all sources, return an empty string.\n\n"
        "Sources:\n\n" + "\n\n".join(blocks)
    )


def call_gemini(client, prompt):
    config = types.GenerateContentConfig(
        response_mime_type="application/json", temperature=0.1
    )
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = client.models.generate_content(
                model=MODEL, contents=prompt, config=config
            )
            return json.loads(resp.text)
        except Exception as e:
            err = str(e)
            wait = (2**attempt) * (5 if "429" in err or "503" in err else 2)
            print(f"  [retry {attempt}/{MAX_RETRIES}] {e}", flush=True)
            time.sleep(wait)
    return None


def build_english_doc(reconstructed, source_q, uniqueId):
    """Build the new English doc by overlaying reconstructed text on the
    metadata of one of the source translation docs (preserves discipline,
    difficulty, tags, sourceUrl, etc.)."""
    now = datetime.now(timezone.utc)
    return {
        "uniqueId": uniqueId,
        "language": "English",
        "discipline": source_q.get("discipline"),
        "type": source_q.get("type"),
        "difficulty": source_q.get("difficulty"),
        "question": reconstructed.get("Question") or source_q.get("question"),
        "options": {
            "A": reconstructed.get("OptionA")
            or source_q.get("options", {}).get("A"),
            "B": reconstructed.get("OptionB")
            or source_q.get("options", {}).get("B"),
            "C": reconstructed.get("OptionC", "")
            or source_q.get("options", {}).get("C", ""),
            "D": reconstructed.get("OptionD", "")
            or source_q.get("options", {}).get("D", ""),
        },
        "correct": source_q.get("correct"),
        "sourceUrl": source_q.get("sourceUrl"),
        "sourceExcerpt": reconstructed.get("SourceExcerpt")
        or source_q.get("sourceExcerpt"),
        "status": "accepted",
        "tags": source_q.get("tags", []),
        "createdAt": now.timestamp() * 1000,
        "firestoreUpdatedAt": now,
        "creatorId": RECOVERY_BOT_CREATOR_ID,
        "creatorEmail": "system-recovery@bot.local",
        "creatorName": "Orphan Recovery Bot",
        "version": 1,
        "_recoveredFromOrphan": True,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="Commit writes")
    args = parser.parse_args()
    dry_run = not args.live

    db = init_db()
    print(f"Mode: {'LIVE WRITE' if not dry_run else 'DRY RUN'}")
    print("Scanning for orphans...")
    orphans = find_orphans(db)
    print(f"Found {len(orphans)} orphan uniqueIds")

    if not dry_run:
        client = genai.Client(
            vertexai=True, project=GCP_PROJECT, location=GCP_LOCATION
        )

    successes = 0
    failures = 0

    for i, (uid, variants) in enumerate(orphans.items(), 1):
        chosen_langs = pick_sources(variants, max_n=3)
        print(f"\n[{i}/{len(orphans)}] {uid}")
        print(f"  Sources: {chosen_langs}")

        if dry_run:
            successes += 1
            continue

        sources = [(lang, variants[lang][1]) for lang in chosen_langs]
        prompt = build_recovery_prompt(sources)
        reconstructed = call_gemini(client, prompt)
        if not reconstructed:
            print("  [FAIL] Gemini returned no result")
            failures += 1
            continue

        # Use the first source's metadata for non-translated fields
        first_source_q = sources[0][1]
        new_english = build_english_doc(reconstructed, first_source_q, uid)

        # Find the corrupted base (the one whose doc.id == uniqueId)
        corrupted_id = None
        corrupted_lang = None
        for lang, (doc_id, data) in variants.items():
            if doc_id == uid:
                corrupted_id = doc_id
                corrupted_lang = lang
                break

        try:
            batch = db.batch()
            # 1. Move corrupted base to suffixed location (preserve as variant)
            if corrupted_id and corrupted_lang:
                target_suffixed_id = f"{uid}_{corrupted_lang.replace(' ', '_')}"
                # Don't clobber an existing suffixed variant
                existing = (
                    db.collection("questions")
                    .document(target_suffixed_id)
                    .get()
                )
                corrupted_data = variants[corrupted_lang][1]
                if not existing.exists:
                    batch.set(
                        db.collection("questions").document(target_suffixed_id),
                        corrupted_data,
                    )
                else:
                    print(
                        f"  [warn] {target_suffixed_id} already exists; "
                        f"corrupted base will be deleted instead of moved"
                    )
            # 2. Write new English at the canonical id
            batch.set(db.collection("questions").document(uid), new_english)
            batch.commit()
            print(f"  OK  English: {new_english['question'][:80]!r}")
            successes += 1
        except Exception as e:
            print(f"  [FAIL] write failed: {e}")
            failures += 1

    print(f"\nDone. successes={successes} failures={failures}")
    if dry_run:
        print("Dry run only. Re-run with --live to commit.")


if __name__ == "__main__":
    main()
