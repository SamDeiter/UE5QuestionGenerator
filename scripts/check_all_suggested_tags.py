import firebase_admin
from firebase_admin import credentials, firestore
import json

def check_all_suggested_tags():
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': 'ue5-questions-prod',
        })
    
    db = firestore.client()
    questions_ref = db.collection("questions")
    
    # Check ANY questions that have suggestedRewrite
    # Firestore doesn't support 'exists', so we'll just stream and filter
    docs = questions_ref.limit(500).stream()
    
    results = []
    found = 0
    
    for doc in docs:
        data = doc.to_dict()
        suggested = data.get("suggestedRewrite")
        if suggested:
            tags = data.get("tags", [])
            suggested_tags = suggested.get("tags", [])
            results.append({
                "id": doc.id,
                "status": data.get("status"),
                "current_tags": tags,
                "suggested_tags": suggested_tags,
                "suggested_count": len(suggested_tags)
            })
            found += 1
            if found >= 20:
                break

    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    check_all_suggested_tags()
