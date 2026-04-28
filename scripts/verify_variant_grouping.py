import firebase_admin
from firebase_admin import credentials, firestore

def verify_grouping():
    service_account_path = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
    if not firebase_admin._apps:
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    questions_ref = db.collection('questions')
    
    docs = questions_ref.stream()
    
    by_unique_id = {}
    
    for doc in docs:
        data = doc.to_dict()
        uid = data.get('uniqueId') or doc.id
        lang = data.get('language', 'English')
        
        if uid not in by_unique_id:
            by_unique_id[uid] = []
        by_unique_id[uid].append(lang)

    orphaned_translations = []
    missing_langs = []
    
    for uid, langs in by_unique_id.items():
        if 'English' not in langs:
            orphaned_translations.append((uid, langs))
        
        # Check for missing target languages
        supported = ["Japanese", "Korean", "Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Chinese (Simplified)"]
        missing = [l for l in supported if l not in langs]
        if missing:
            missing_langs.append((uid, missing))

    print(f"Total Unique Questions: {len(by_unique_id)}")
    print(f"Orphaned Translations (no English source): {len(orphaned_translations)}")
    for uid, langs in orphaned_translations[:10]:
        print(f"  UID: {uid}, Langs: {langs}")
        
    print(f"Questions with missing translations: {len(missing_langs)}")
    
    # Check Japanese specifically
    jp_missing = [item for item in missing_langs if "Japanese" in item[1]]
    print(f"Questions missing Japanese: {len(jp_missing)}")

if __name__ == "__main__":
    verify_grouping()
