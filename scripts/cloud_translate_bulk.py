"""
cloud_translate_bulk.py
-----------------------
Bulk translate UE5 questions using Google Cloud Vertex AI SDK.
Utilizes Application Default Credentials (ADC) for enterprise auth.

Usage:
  python scripts/cloud_translate_bulk.py --lang Japanese

Run all languages sequentially:
  for %L in (Japanese Korean Spanish French German Italian Portuguese Russian "Chinese (Simplified)") do (
    python scripts/cloud_translate_bulk.py --lang "%L"
  )
"""

import os
import json
import time
import argparse
import concurrent.futures
import threading
from tqdm import tqdm
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone
from google import genai
from google.genai import types

# --- Configuration ---
DEFAULT_SERVICE_ACCOUNT = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
DEFAULT_MODEL = "gemini-2.5-flash"
GCP_PROJECT = "development-317819"
GCP_LOCATION = "us-central1"

# Max retries on 429/503 before giving up on a single question
MAX_RETRIES = 5

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


# --- Vertex AI API call with exponential backoff retry ---
def call_gemini(client, model: str, prompt: str) -> dict | None:
    """Call Vertex AI with retry on transient errors. Returns parsed dict or None."""
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.1,
    )
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = client.models.generate_content(
                model=model,
                contents=prompt,
                config=config,
            )
            return json.loads(resp.text)
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "503" in err_str or "Quota" in err_str:
                wait = 2 ** attempt * 5
                print(f"\n  [WARN] Rate limit/503 on attempt {attempt}/{MAX_RETRIES}. Waiting {wait}s...", flush=True)
                time.sleep(wait)
            elif attempt < MAX_RETRIES:
                print(f"\n  [WARN] Attempt {attempt}/{MAX_RETRIES} failed: {e}", flush=True)
                time.sleep(2 ** attempt * 2)
            else:
                print(f"\n  [ERROR] All retries exhausted: {e}", flush=True)
    return None


# --- Firebase ---
def init_firebase(key_path: str):
    if not os.path.exists(key_path):
        raise FileNotFoundError(f"Service account key not found: {key_path}")
    if not firebase_admin._apps:
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
    return firestore.client()


# --- Process one question ---
def process_question(db, q_doc, target_lang: str, client, model: str, dry_run: bool) -> str:
    q_data = q_doc.to_dict()
    unique_id = q_data.get("uniqueId")
    if not unique_id:
        return "skip"

    if dry_run:
        return "dry_run"

    prompt = build_prompt(q_data, target_lang)
    translated = call_gemini(client, model, prompt)

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
        "creatorId": "AF4rHG5PHzXCUBZMftJ1cySdz442",
        "creatorName": "Cloud Translation Bot",
    }

    doc_id = f"{unique_id}_{target_lang.replace(' ', '_')}"
    db.collection("questions").document(doc_id).set(new_variant)
    return "success"


# --- Main ---
def main():
    parser = argparse.ArgumentParser(
        description="Bulk translate UE5 questions via Vertex AI."
    )
    parser.add_argument("--key", default=DEFAULT_SERVICE_ACCOUNT, help="Firebase service account JSON path")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Gemini model (default: gemini-2.5-flash)")
    parser.add_argument("--lang", required=True, help=f"Target language. Options: {', '.join(SUPPORTED_LANGUAGES)}")
    parser.add_argument("--limit", type=int, default=0, help="Max translations to run (0 = no limit)")
    parser.add_argument("--dry-run", action="store_true", help="Count without translating")
    args = parser.parse_args()

    if args.lang not in SUPPORTED_LANGUAGES:
        print(f"[ERROR] Unknown language '{args.lang}'. Supported: {', '.join(SUPPORTED_LANGUAGES)}")
        return

    print(f"\n=== Cloud Translate (Vertex AI) ===")
    print(f"  Model:    {args.model}")
    print(f"  Language: {args.lang}")
    print(f"  Project:  {GCP_PROJECT}")
    print(f"  Dry run:  {args.dry_run}\n")

    try:
        # Initialize Vertex AI Client (uses ADC implicitly)
        client = genai.Client(vertexai=True, project=GCP_PROJECT, location=GCP_LOCATION)
    except Exception as e:
        print(f"[ERROR] Vertex AI init failed: {e}")
        print("  Did you run 'gcloud auth application-default login'?")
        return

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

    success_count = 0
    skipped_count = 0
    error_count = 0
    lock = threading.Lock()

    tasks = []
    for q_doc in source_docs:
        uid = q_doc.to_dict().get("uniqueId")
        if uid in existing_ids:
            skipped_count += 1
            continue
        tasks.append(q_doc)

    if args.limit > 0:
        tasks = tasks[:args.limit]

    pbar = tqdm(total=len(tasks), desc=f"-> {args.lang}", unit="q")

    def worker(q_doc):
        nonlocal success_count, error_count
        res = process_question(db, q_doc, args.lang, client, args.model, args.dry_run)
        with lock:
            if res == "success":
                success_count += 1
            elif res == "error":
                error_count += 1
            pbar.update(1)
            pbar.set_postfix({"New": success_count, "Skip": skipped_count, "Err": error_count})

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(worker, q_doc) for q_doc in tasks]
        concurrent.futures.wait(futures)

    pbar.close()

    print(f"\n{'='*40}")
    print(f"  Translated: {success_count}")
    print(f"  Skipped:    {skipped_count}")
    print(f"  Errors:     {error_count}")
    print(f"{'='*40}\n")


if __name__ == "__main__":
    main()
