import os
import json
import requests
import argparse
from tqdm import tqdm
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# --- Configuration ---
OLLAMA_URL = "http://localhost:11434/api/generate"
DEFAULT_MODEL = "qwen2.5:7b"
DEFAULT_SERVICE_ACCOUNT = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
TARGET_LANG = "Chinese (Simplified)"  # Default, overridden by --lang

# --- Prompt Templates ---
def get_system_prompt(source_lang="English", target_lang=TARGET_LANG):
    return f"""
You are a professional technical translator for Unreal Engine 5 documentation. Translate the provided JSON object from {source_lang} to {target_lang}. 
CRITICAL RULES:
1. Return ONLY valid JSON. No markdown formatting, no explanations.
2. Translate ONLY: "Question", "OptionA", "OptionB", "OptionC", "OptionD", and "SourceExcerpt".
3. DO NOT translate: "ID", "Discipline", "Type", "Difficulty", "Answer", "CorrectLetter", and "SourceURL".
4. Maintain exact JSON structure.
""".strip()

def get_user_prompt(q):
    data = {
        "Discipline": q.get('discipline'),
        "Type": q.get('type'),
        "Difficulty": q.get('difficulty'),
        "Question": q.get('question'),
        "OptionA": q.get('options', {}).get('A'),
        "OptionB": q.get('options', {}).get('B'),
        "OptionC": q.get('options', {}).get('C', ""),
        "OptionD": q.get('options', {}).get('D', ""),
        "CorrectLetter": q.get('correct'),
        "SourceURL": q.get('sourceUrl'),
        "SourceExcerpt": q.get('sourceExcerpt'),
    }
    return f"Translate this object:\n{json.dumps(data, indent=2, ensure_ascii=False)}"

# --- Core Functions ---
def init_firebase(key_path):
    if not os.path.exists(key_path):
        raise FileNotFoundError(f"Service account key not found at {key_path}")
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)
    return firestore.client()

def translate_via_ollama(model, system_prompt, user_prompt):
    payload = {
        "model": model,
        "prompt": f"{system_prompt}\n\n{user_prompt}",
        "stream": False,
        "format": "json"
    }
    
    response = requests.post(OLLAMA_URL, json=payload)
    response.raise_for_status()
    
    result = response.json()
    response_text = result.get('response', '')
    
    # Try to parse the JSON response
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        # Fallback: clean up common AI formatting artifacts
        clean_text = response_text.replace('```json', '').replace('```', '').strip()
        return json.loads(clean_text)

def process_translation(db, question_doc, target_lang, model, dry_run=False):
    q_data = question_doc.to_dict()
    unique_id = q_data.get('uniqueId')
    source_lang = q_data.get('language', 'English')
    
    if dry_run:
        return "dry_run"

    # Translate
    system_prompt = get_system_prompt(source_lang, target_lang)
    user_prompt = get_user_prompt(q_data)
    
    try:
        translated = translate_via_ollama(model, system_prompt, user_prompt)
        
        # Build the new variant
        now = datetime.now().isoformat()
        new_variant = {
            "uniqueId": unique_id,
            "discipline": q_data.get('discipline'),
            "type": q_data.get('type'),
            "difficulty": q_data.get('difficulty'),
            "question": translated.get('Question'),
            "options": {
                "A": translated.get('OptionA'),
                "B": translated.get('OptionB'),
                "C": translated.get('OptionC'),
                "D": translated.get('OptionD')
            },
            "correct": q_data.get('correct'),
            "language": target_lang,
            "status": q_data.get('status', 'pending'),
            "dateAdded": now,
            "tags": q_data.get('tags', []),
            "critiqueScore": q_data.get('critiqueScore'),
            "sourceUrl": q_data.get('sourceUrl'),
            "sourceExcerpt": translated.get('SourceExcerpt'),
            "translatedAt": now,
            "translatedFrom": source_lang,
            "firestoreUpdatedAt": firestore.SERVER_TIMESTAMP,
            "creatorId": q_data.get('creatorId'),
            "creatorEmail": q_data.get('creatorEmail', 'system-bulk-translate@local.mind'),
            "creatorName": "Local Translation Bot"
        }
        
        # Save to Firestore
        # Use uniqueId + language as a semi-deterministic ID for variants
        doc_id = f"{unique_id}_{target_lang.replace(' ', '_')}"
        db.collection('questions').document(doc_id).set(new_variant)
        return "success"
        
    except Exception as e:
        print(f"Error translating {unique_id}: {str(e)}")
        return "error"

def main():
    parser = argparse.ArgumentParser(description="Bulk translate UE5 questions using local Ollama LLM.")
    parser.add_argument("--key", default=DEFAULT_SERVICE_ACCOUNT, help="Path to Firebase service account JSON")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Ollama model name (e.g., qwen2.5:7b)")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of translations (0 for no limit)")
    parser.add_argument("--dry-run", action="store_true", help="Count questions without translating")
    parser.add_argument("--lang", default="Chinese (Simplified)", help="Target language (e.g., 'Japanese', 'Korean', 'Spanish')")

    global TARGET_LANG
    args = parser.parse_args()
    TARGET_LANG = args.lang
    
    print(f"Initializing Translation...")
    print(f"Database: ue5-questions-prod")
    print(f"Local Model: {args.model}")
    print(f"Target Language: {TARGET_LANG}")
    
    try:
        db = init_firebase(args.key)
    except Exception as e:
        print(f"Firebase Initialization Failed: {str(e)}")
        return

    # Fetch source questions (English)
    print(f"Fetching English questions...")
    source_questions = db.collection('questions') \
        .where('language', '==', 'English') \
        .stream()
    
    questions_to_process = list(source_questions)
    print(f"Found {len(questions_to_process)} English questions.")
    
    # Fetch existing Chinese translations to skip them efficiently
    print(f"Checking for existing {TARGET_LANG} translations...")
    existing_translations = db.collection('questions') \
        .where('language', '==', TARGET_LANG) \
        .select(['uniqueId']) \
        .stream()
    
    existing_ids = {doc.to_dict().get('uniqueId') for doc in existing_translations}
    print(f"Found {len(existing_ids)} existing translations.")

    success_count = 0
    exists_count = 0
    error_count = 0
    processed_count = 0

    pbar = tqdm(questions_to_process, desc="Translating", unit="q")
    for q_doc in pbar:
        q_data = q_doc.to_dict()
        unique_id = q_data.get('uniqueId')
        
        if not unique_id:
            continue
            
        if unique_id in existing_ids:
            exists_count += 1
            processed_count += 1
            continue

        if args.limit > 0 and success_count >= args.limit:
            break
            
        result = process_translation(db, q_doc, TARGET_LANG, args.model, args.dry_run)
        
        if result == "success":
            success_count += 1
        elif result == "error":
            error_count += 1
        elif result == "dry_run":
            success_count += 1
            
        processed_count += 1
        pbar.set_postfix({
            "New": success_count,
            "Skipped": exists_count,
            "Errors": error_count
        })

    print("\n" + "="*30)
    print("TRANSLATION COMPLETE")
    print("="*30)
    print(f"Total Processed:  {processed_count}")
    print(f"Newly Translated: {success_count}")
    print(f"Already Exists:   {exists_count}")
    print(f"Errors:           {error_count}")
    print("="*30)

if __name__ == "__main__":
    main()
