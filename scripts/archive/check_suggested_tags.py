import firebase_admin
from firebase_admin import credentials, firestore
import json

def check_suggested_tags():
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': 'ue5-questions-prod',
        })
    
    db = firestore.client()
    questions_ref = db.collection("questions")
    
    # Check 10 questions with low tags that have a critique
    docs = questions_ref.where("status", "==", "accepted").stream()
    
    checked = 0
    results = []
    
    for doc in docs:
        data = doc.to_dict()
        tags = data.get("tags", [])
        suggested = data.get("suggestedRewrite")
        
        if len(tags) < 3 and suggested:
            suggested_tags = suggested.get("tags", [])
            results.append({
                "id": doc.id,
                "current_tags": tags,
                "suggested_tags": suggested_tags,
                "suggested_count": len(suggested_tags)
            })
            checked += 1
            if checked >= 10:
                break

    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    check_suggested_tags()
