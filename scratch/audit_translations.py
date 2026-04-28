import os
import firebase_admin
from firebase_admin import credentials, firestore
from collections import defaultdict

# --- Configuration ---
SERVICE_ACCOUNT = "backups/assets/ue5-questions-prod-99289c4d03b3.json"

def audit_translations():
    if not os.path.exists(SERVICE_ACCOUNT):
        print(f"Error: Service account not found at {SERVICE_ACCOUNT}")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT)
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    print("Fetching all questions from Firestore...")
    docs = db.collection("questions").stream()
    
    questions_by_uid = defaultdict(list)
    malformed_docs = []
    
    count = 0
    for doc in docs:
        count += 1
        data = doc.to_dict()
        uid = data.get("uniqueId")
        
        # Check for malformed docs (similar to parseQuestionDoc)
        errors = []
        if not uid and not data.get("id"):
            errors.append("Missing uniqueId/id")
        if not data.get("question"):
            errors.append("Missing question text")
        if not data.get("creatorId"):
            errors.append("Missing creatorId")
            
        if errors:
            malformed_docs.append({"id": doc.id, "errors": errors, "data": data})
        
        if uid:
            questions_by_uid[uid].append(data)
            
    print(f"Total documents scanned: {count}")
    print(f"Unique questions (by uniqueId): {len(questions_by_uid)}")
    print(f"Malformed documents: {len(malformed_docs)}")
    
    if malformed_docs:
        print("\n--- Top 5 Malformed Docs ---")
        for m in malformed_docs[:5]:
            print(f"Doc ID: {m['id']} | Errors: {m['errors']}")
            # print(f"Data: {m['data']}")
            
    # Language coverage
    languages = ["English", "Chinese (Simplified)", "Japanese", "Korean", "Spanish", "French", "German", "Italian", "Portuguese", "Russian"]
    coverage = defaultdict(int)
    
    for uid, variants in questions_by_uid.items():
        langs_present = {v.get("language", "English") for v in variants}
        for lang in languages:
            if lang in langs_present:
                coverage[lang] += 1
                
    print("\n--- Language Coverage ---")
    for lang in languages:
        print(f"{lang}: {coverage[lang]} / {len(questions_by_uid)} ({coverage[lang]/len(questions_by_uid)*100:.1f}%)")

    # Spot check a few with missing translations
    print("\n--- Samples missing Japanese ---")
    samples = 0
    for uid, variants in questions_by_uid.items():
        langs_present = {v.get("language", "English") for v in variants}
        if "English" in langs_present and "Japanese" not in langs_present:
            eng_v = next(v for v in variants if v.get("language", "English") == "English")
            print(f"UID: {uid} | Question: {eng_v.get('question')[:50]}...")
            samples += 1
            if samples >= 5:
                break

if __name__ == "__main__":
    audit_translations()
