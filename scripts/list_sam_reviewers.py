import firebase_admin
from firebase_admin import credentials, firestore
import os

def list_sam_deiter_reviewers():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    
    print("--- Reviewers for Sam Deiter's questions ---")
    docs = db.collection("questions").where("creatorName", "==", "Sam Deiter").stream()
    
    reviewers = set()
    found_76054948 = False
    for doc in docs:
        data = doc.to_dict()
        if data.get('id') == "76054948" or data.get('uniqueId') == "76054948":
             found_76054948 = True
             print(f"FOUND 76054948! Data: {data}")
             
        rev = data.get('reviewerName') or data.get('humanVerifiedBy')
        if rev:
            reviewers.add(rev)
            
    print(f"Unique Reviewers: {reviewers}")
    if not found_76054948:
        print("Question 76054948 still not found among Sam Deiter's questions.")

if __name__ == "__main__":
    list_sam_deiter_reviewers()
