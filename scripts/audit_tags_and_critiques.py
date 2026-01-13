import firebase_admin
from firebase_admin import credentials, firestore
import json

def audit_tags_and_critiques():
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': 'ue5-questions-prod',
        })
    
    db = firestore.client()
    questions_ref = db.collection("questions")
    
    # Audit all accepted questions
    docs = questions_ref.where("status", "==", "accepted").stream()
    
    stats = {
        "total_accepted": 0,
        "low_tags_count": 0,
        "low_tags_with_critique": 0,
        "low_tags_no_critique": 0,
        "average_tags_with_critique": 0,
        "average_tags_no_critique": 0,
        "critiqued_count": 0
    }
    
    total_tags_with = 0
    total_tags_without = 0
    
    for doc in docs:
        stats["total_accepted"] += 1
        data = doc.to_dict()
        tags = data.get("tags", [])
        has_critique = "critiqueScore" in data
        
        num_tags = len(tags)
        
        if num_tags < 3:
            stats["low_tags_count"] += 1
            if has_critique:
                stats["low_tags_with_critique"] += 1
            else:
                stats["low_tags_no_critique"] += 1
        
        if has_critique:
            stats["critiqued_count"] += 1
            total_tags_with += num_tags
        else:
            total_tags_without += num_tags

    if stats["critiqued_count"] > 0:
        stats["average_tags_with_critique"] = total_tags_with / stats["critiqued_count"]
    
    no_critique_count = stats["total_accepted"] - stats["critiqued_count"]
    if no_critique_count > 0:
        stats["average_tags_no_critique"] = total_tags_without / no_critique_count

    print(json.dumps(stats, indent=2))

if __name__ == "__main__":
    audit_tags_and_critiques()
