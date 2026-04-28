import firebase_admin
from firebase_admin import credentials, firestore

def inspect_sample():
    service_account_path = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
    if not firebase_admin._apps:
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    questions_ref = db.collection('questions')
    
    # Get 5 English questions
    english_query = questions_ref.where('language', '==', 'English').limit(5)
    english_docs = english_query.stream()
    
    for en_doc in english_docs:
        en_data = en_doc.to_dict()
        uid = en_data.get('uniqueId')
        print(f"\nEnglish Question ID: {en_doc.id}")
        print(f"  uniqueId: {uid}")
        print(f"  Question: {en_data.get('question')[:50]}...")
        
        if uid:
            # Find translations for this uniqueId
            trans_query = questions_ref.where('uniqueId', '==', uid)
            trans_docs = trans_query.stream()
            
            langs = []
            for t_doc in trans_docs:
                t_data = t_doc.to_dict()
                langs.append(t_data.get('language', 'English'))
            
            print(f"  Found translations: {sorted(langs)}")

if __name__ == "__main__":
    inspect_sample()
