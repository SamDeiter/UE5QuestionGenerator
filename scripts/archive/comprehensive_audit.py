import firebase_admin
from firebase_admin import credentials, firestore

def comprehensive_audit():
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': 'ue5-questions-prod',
        })
    
    db = firestore.client()
    questions_ref = db.collection("questions")
    
    docs = questions_ref.where("status", "==", "accepted").stream()
    
    stats = {
        "total_accepted": 0,
        "missing_tags": 0,
        "low_tags": 0, # < 3
        "missing_source_url": 0,
        "missing_source_excerpt": 0,
        "missing_both_source": 0,
        "reviewers": {}
    }
    
    for doc in docs:
        stats["total_accepted"] += 1
        data = doc.to_dict()
        tags = data.get("tags", [])
        source_url = data.get("sourceUrl") or data.get("source")
        source_excerpt = data.get("sourceExcerpt")
        reviewed_by = data.get("reviewedBy") or "Unknown"
        
        if reviewed_by not in stats["reviewers"]:
            stats["reviewers"][reviewed_by] = {"total": 0, "missing_tags": 0, "missing_source": 0}
        
        stats["reviewers"][reviewed_by]["total"] += 1
        
        if not tags or len(tags) == 0:
            stats["missing_tags"] += 1
            stats["reviewers"][reviewed_by]["missing_tags"] += 1
        elif len(tags) < 3:
            stats["low_tags"] += 1
            
        has_source = source_url or source_excerpt
        if not source_url:
            stats["missing_source_url"] += 1
        if not source_excerpt:
            stats["missing_source_excerpt"] += 1
        if not has_source:
            stats["missing_both_source"] += 1
            stats["reviewers"][reviewed_by]["missing_source"] += 1

    print(json.dumps(stats, indent=2))

import json
if __name__ == "__main__":
    comprehensive_audit()
