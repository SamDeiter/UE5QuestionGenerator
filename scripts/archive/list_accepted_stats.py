import firebase_admin
from firebase_admin import credentials, firestore
import os

def list_accepted_questions():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    
    print("--- Accepted/Rejected Questions Reviewers ---")
    docs = db.collection("questions").where("status", "in", ["accepted", "rejected"]).stream()
    
    reviewers = {}
    for doc in docs:
        data = doc.to_dict()
        name = data.get('reviewerName', 'N/A')
        email = data.get('acceptedBy') or data.get('rejectedBy') or 'N/A'
        
        key = f"{name} ({email})"
        reviewers[key] = reviewers.get(key, 0) + 1
        
    for reviewer, count in sorted(reviewers.items(), key=lambda x: x[1], reverse=True):
        print(f"  {reviewer}: {count} questions")

if __name__ == "__main__":
    list_accepted_questions()
