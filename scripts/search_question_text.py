import firebase_admin
from firebase_admin import credentials, firestore
import os

def search_text_in_questions(search_term):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    
    print(f"--- Searching for '{search_term}' in 'questions' ---")
    # We can't do partial text search in Firestore easily without external index, 
    # but we can stream and check locally for a specific question if it's recent.
    # However, since we have the ID from the screenshot, let's try searching 'training_data' first.
    
    colls = ["questions", "training_data"]
    for coll in colls:
        print(f"Checking collection: {coll}")
        docs = db.collection(coll).stream()
        for doc in docs:
            data = doc.to_dict()
            q_text = data.get('question', '')
            if search_term.lower() in q_text.lower():
                print(f"✅ Found in {coll}! Doc ID: {doc.id}")
                print(f"   ID Field: {data.get('id')}")
                print(f"   UniqueId: {data.get('uniqueId')}")
                print(f"   ReviewerName: {data.get('reviewerName')}")
                print(f"   AcceptedBy: {data.get('acceptedBy')}")
                print(f"   HumanVerifiedBy: {data.get('humanVerifiedBy')}")
                # Print the whole dict for context
                # print(data) 
    
if __name__ == "__main__":
    search_text_in_questions("Timing Insights tab")
