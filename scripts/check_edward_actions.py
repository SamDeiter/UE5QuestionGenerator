import firebase_admin
from firebase_admin import credentials, firestore
from collections import Counter

def check_user_actions():
    import sys
    email = sys.argv[1] if len(sys.argv) > 1 else "edward.bennett@epicgames.com"
    
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    
    print(f"--- Searching all audit-log events for {email} ---")
    
    # Use filter for better performance
    from google.cloud.firestore_v1.base_query import FieldFilter
    docs = db.collection("audit-log").where(filter=FieldFilter("userEmail", "==", email)).stream()
    
    events = []
    question_ids = set()
    
    for doc in docs:
        data = doc.to_dict()
        etype = data.get("eventType", "unknown")
        qid = data.get("questionId", "unknown")
        events.append(etype)
        question_ids.add(qid)
        
        # If it's a review-type action, print details
        if any(x in etype.lower() for x in ["accept", "verify", "reject", "delete"]):
            print(f"FOUND ACTION: {etype} on Question {qid} at {data.get('timestamp')}")

    print("\n--- Event Totals ---")
    for etype, count in Counter(events).items():
        print(f"  {etype}: {count}")
        
    print(f"\nTotal unique questions touched: {len(question_ids)}")

if __name__ == "__main__":
    check_user_actions()

