import firebase_admin
from firebase_admin import credentials, firestore

def check_stolen_locks():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    email = "edward.bennett@epicgames.com"
    
    print(f"--- Checking lock_stolen events for {email} ---")
    stolen_docs = db.collection("audit-log") \
        .where("userEmail", "==", email) \
        .where("eventType", "==", "lock_stolen") \
        .stream()
    
    for s_doc in stolen_docs:
        s_data = s_doc.to_dict()
        qid = s_data.get("questionId")
        ts = s_data.get("timestamp")
        print(f"\nEdward stole lock for {qid} at {ts}")
        
        # Look for the previous lock events for this question
        all_events = db.collection("audit-log") \
            .where("questionId", "==", qid) \
            .stream()
            
        events = []
        for e in all_events:
            d = e.to_dict()
            if d.get("eventType") == "lock_acquired" and d.get("timestamp") < ts:
                events.append(d)
        
        if events:
            # Sort by timestamp descending
            events.sort(key=lambda x: x.get("timestamp"), reverse=True)
            p_data = events[0]
            print(f"  Previous owner: {p_data.get('userEmail')} (ID: {p_data.get('userId')}) at {p_data.get('timestamp')}")


if __name__ == "__main__":
    check_stolen_locks()
