"""
cloud_translate_bulk.py
-----------------------
Bulk translate UE5 questions using Gemini API directly.
Bypasses the Cloud Function AI_DAILY rate limiter entirely.

Usage:
  python scripts/cloud_translate_bulk.py --lang Japanese --api-key YOUR_GEMINI_KEY
  python scripts/cloud_translate_bulk.py --lang Spanish   # uses GEMINI_API_KEY env var

Run all languages sequentially:
  set GEMINI_API_KEY=your_key_here
  for %L in (Japanese Korean Spanish French German Italian Portuguese Russian) do (
    python scripts/cloud_translate_bulk.py --lang "%L"
  )
"""

import os
import json
import time
import argparse
import requests
from tqdm import tqdm
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone

# --- Configuration ---
DEFAULT_SERVICE_ACCOUNT = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
DEFAULT_MODEL = "gemini-2.5-flash"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

# Rate limiting: free tier ~10 RPM for 2.5-flash → 7s between calls stays safely under
REQUEST_DELAY_SECONDS = 7.0
# Max retries on 429/503 before giving up on a single question
MAX_RETRIES = 5
# Conservative daily limit — script pauses until midnight UTC if hit
DAILY_REQUEST_LIMIT = 480

SUPPORTED_LANGUAGES = [
    "Japanese", "Korean", "Spanish", "French",
    "German", "Italian", "Portuguese", "Russian",
    "Chinese (Simplified)",
]


# --- Prompt ---
def build_prompt(q: dict, target_lang: str) -> str:
    data = {
        "Discipline": q.get("discipline"),
        "Type": q.get("type"),
        "Difficulty": q.get("difficulty"),
        "Question": q.get("question"),
        "OptionA": q.get("options", {}).get("A"),
        "OptionB": q.get("options", {}).get("B"),
        "OptionC": q.get("options", {}).get("C", ""),
        "OptionD": q.get("options", {}).get("D", ""),
        "CorrectLetter": q.get("correct"),
        "SourceURL": q.get("sourceUrl"),
        "SourceExcerpt": q.get("sourceExcerpt"),
    }
    return (
        f"You are a professional technical translator for Unreal Engine 5 documentation. "
        f"Translate the following JSON object from English to {target_lang}.\n\n"
        f"CRITICAL RULES:\n"
        f"1. Return ONLY valid JSON. No markdown, no code fences, no explanation.\n"
        f"2. Translate ONLY: Question, OptionA, OptionB, OptionC, OptionD, SourceExcerpt.\n"
        f"3. DO NOT translate: Discipline, Type, Difficulty, CorrectLetter, SourceURL.\n"
        f"4. Keep exact JSON structure.\n\n"
        f"Input:\n{json.dumps(data, indent=2, ensure_ascii=False)}"
    )


# --- Gemini API call with exponential backoff retry ---
def call_gemini(api_key: str, model: str, prompt: str) -> dict | None:
    """Call Gemini API with retry on 429/503. Returns parsed dict or None on failure."""
    url = GEMINI_API_URL.format(model=model)
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1,
        },
    }
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(
                url,
                headers={"Content-Type": "application/json"},
                params={"key": api_key},
                json=payload,
                timeout=30,
            )
            # Rate limit hit — back off and retry
            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", 60))
                wait = max(retry_after, 2 ** attempt * 10)
                print(f"\n  [RATE LIMIT] 429 on attempt {attempt}/{MAX_RETRIES}. Waiting {wait}s...", flush=True)
                time.sleep(wait)
                continue
            # Transient server error — short backoff
            if resp.status_code == 503:
                wait = 2 ** attempt * 5
                print(f"\n  [WARN] 503 on attempt {attempt}/{MAX_RETRIES}. Waiting {wait}s...", flush=True)
                time.sleep(wait)
                continue
            resp.raise_for_status()
            result = resp.json()
            text = result["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)
        except (requests.RequestException, KeyError, json.JSONDecodeError) as e:
            print(f"\n  [WARN] Attempt {attempt}/{MAX_RETRIES} failed: {e}", flush=True)
            if attempt < MAX_RETRIES:
                time.sleep(2 ** attempt * 5)
    print("  [ERROR] All retries exhausted for this question.", flush=True)
    return None


def wait_until_midnight_utc():
    """Block until midnight UTC when the daily quota resets."""
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    midnight = (now + timedelta(days=1)).replace(hour=0, minute=5, second=0, microsecond=0)
    wait_secs = (midnight - now).total_seconds()
    print(f"\n  [DAILY LIMIT] Quota reached. Pausing {wait_secs/3600:.1f} hours until {midnight.strftime('%H:%M UTC')}...", flush=True)
    time.sleep(wait_secs)


# --- Firebase ---
def init_firebase(key_path: str):
    if not os.path.exists(key_path):
        raise FileNotFoundError(f"Service account key not found: {key_path}")
    if not firebase_admin._apps:
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
    return firestore.client()


# --- Process one question ---
def process_question(db, q_doc, target_lang: str, api_key: str, model: str, dry_run: bool) -> str:
    q_data = q_doc.to_dict()
    unique_id = q_data.get("uniqueId")
    if not unique_id:
        return "skip"

    if dry_run:
        return "dry_run"

    prompt = build_prompt(q_data, target_lang)
    translated = call_gemini(api_key, model, prompt)

    if not translated:
        return "error"

    # Build the new variant document
    now = datetime.now(timezone.utc)
    new_variant = {
        "uniqueId": unique_id,
        "language": target_lang,
        "discipline": q_data.get("discipline"),
        "type": q_data.get("type"),
        "difficulty": q_data.get("difficulty"),
        "question": translated.get("Question", q_data.get("question")),
        "options": {
            "A": translated.get("OptionA", q_data.get("options", {}).get("A")),
            "B": translated.get("OptionB", q_data.get("options", {}).get("B")),
            "C": translated.get("OptionC", q_data.get("options", {}).get("C", "")),
            "D": translated.get("OptionD", q_data.get("options", {}).get("D", "")),
        },
        "correct": q_data.get("correct"),
        "sourceUrl": q_data.get("sourceUrl"),
        "sourceExcerpt": translated.get("SourceExcerpt", q_data.get("sourceExcerpt")),
        "status": "accepted",
        "tags": q_data.get("tags", []),
        "createdAt": now.timestamp() * 1000,
        "firestoreUpdatedAt": now,
        "creatorName": "Cloud Translation Bot",
    }

    doc_id = f"{unique_id}_{target_lang.replace(' ', '_')}"
    db.collection("questions").document(doc_id).set(new_variant)
    return "success"


# --- Main ---
def main():
    parser = argparse.ArgumentParser(
        description="Bulk translate UE5 questions via Gemini API (bypasses Cloud Function rate limits)."
    )
    parser.add_argument("--key", default=DEFAULT_SERVICE_ACCOUNT, help="Firebase service account JSON path")
    parser.add_argument("--api-key", default=os.environ.get("GEMINI_API_KEY", ""), help="Gemini API key (or set GEMINI_API_KEY env var)")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Gemini model (default: gemini-2.0-flash)")
    parser.add_argument("--lang", required=True, help=f"Target language. Options: {', '.join(SUPPORTED_LANGUAGES)}")
    parser.add_argument("--limit", type=int, default=0, help="Max translations to run (0 = no limit)")
    parser.add_argument("--dry-run", action="store_true", help="Count without translating")
    args = parser.parse_args()

    api_key = args.api_key
    if not api_key and not args.dry_run:
        print("[ERROR] No Gemini API key provided. Use --api-key or set GEMINI_API_KEY environment variable.")
        print("  Get a free key at: https://aistudio.google.com/app/apikey")
        return

    if args.lang not in SUPPORTED_LANGUAGES:
        print(f"[ERROR] Unknown language '{args.lang}'. Supported: {', '.join(SUPPORTED_LANGUAGES)}")
        return

    print(f"\n=== Cloud Translate (Gemini Direct) ===")
    print(f"  Model:    {args.model}")
    print(f"  Language: {args.lang}")
    print(f"  Dry run:  {args.dry_run}\n")

    try:
        db = init_firebase(args.key)
    except Exception as e:
        print(f"[ERROR] Firebase init failed: {e}")
        return

    # Fetch source questions
    print("Fetching English questions...")
    source_docs = list(db.collection("questions").where("language", "==", "English").stream())
    print(f"  Found {len(source_docs)} English questions.")

    # Fetch existing translations for this language to skip duplicates
    print(f"Checking for existing {args.lang} translations...")
    existing = db.collection("questions").where("language", "==", args.lang).select(["uniqueId"]).stream()
    existing_ids = {doc.to_dict().get("uniqueId") for doc in existing}
    to_translate = len(source_docs) - len(existing_ids)
    print(f"  Existing: {len(existing_ids)} | Remaining: {to_translate}\n")

    success_count = skipped_count = error_count = daily_requests = 0

    pbar = tqdm(source_docs, desc=f"-> {args.lang}", unit="q")
    for q_doc in pbar:
        uid = q_doc.to_dict().get("uniqueId")
        if uid in existing_ids:
            skipped_count += 1
            continue

        if args.limit > 0 and success_count >= args.limit:
            break

        # Pause if daily request limit is approaching
        if daily_requests >= DAILY_REQUEST_LIMIT:
            wait_until_midnight_utc()
            daily_requests = 0

        result = process_question(db, q_doc, args.lang, api_key, args.model, args.dry_run)
        daily_requests += 1

        if result == "success":
            success_count += 1
        elif result == "error":
            error_count += 1

        pbar.set_postfix({"New": success_count, "Skip": skipped_count, "Err": error_count, "Day": daily_requests})

        # Rate limit: 7s delay keeps us at ~8 RPM, safely under 10 RPM free tier limit
        if not args.dry_run:
            time.sleep(REQUEST_DELAY_SECONDS)

    print(f"\n{'='*40}")
    print(f"  Translated: {success_count}")
    print(f"  Skipped:    {skipped_count}")
    print(f"  Errors:     {error_count}")
    print(f"{'='*40}\n")


if __name__ == "__main__":
    main()
