import firebase_admin
from firebase_admin import credentials, firestore
import json

def audit_visibility():
    # Use Service Account for consistency
    service_account_path = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
    if not firebase_admin._apps:
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    questions_ref = db.collection('questions')
    
    docs = questions_ref.stream()
    
    stats = {}
    missing_creator_id = []
    missing_unique_id = []
    missing_question = []
    invalid_structure = []
    
    total_count = 0
    
    for doc in docs:
        total_count += 1
        data = doc.to_dict()
        data['id'] = doc.id
        
        lang = data.get('language', 'English')
        stats[lang] = stats.get(lang, 0) + 1
        
        errors = []
        if not data.get('uniqueId') and not data.get('id'):
            errors.append("Missing uniqueId/id")
            missing_unique_id.append(doc.id)
            
        if not data.get('question') or not isinstance(data.get('question'), str):
            errors.append("Missing or invalid question text")
            missing_question.append(doc.id)
            
        if not data.get('creatorId') or not isinstance(data.get('creatorId'), str):
            errors.append("Missing creatorId")
            missing_creator_id.append(doc.id)
            
        if errors:
            invalid_structure.append({
                "id": doc.id,
                "errors": errors,
                "language": lang
            })

    print(f"Total documents scanned: {total_count}")
    print("\nLanguage counts:")
    for lang, count in sorted(stats.items()):
        print(f"  {lang}: {count}")
        
    print(f"\nInvalid documents: {len(invalid_structure)}")
    if missing_creator_id:
        print(f"  Missing creatorId: {len(missing_creator_id)}")
    if missing_unique_id:
        print(f"  Missing uniqueId: {len(missing_unique_id)}")
    if missing_question:
        print(f"  Missing question text: {len(missing_question)}")
        
    if invalid_structure:
        print("\nSample invalid docs:")
        for item in invalid_structure[:10]:
            print(f"  ID: {item['id']}, Lang: {item['language']}, Errors: {item['errors']}")

if __name__ == "__main__":
    audit_visibility()
