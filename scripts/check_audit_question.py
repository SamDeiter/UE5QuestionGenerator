import firebase_admin
from firebase_admin import credentials, firestore
import os

def check_audit_log_question(qid):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    print(f"--- Checking 'audit-log' for questionId: {qid} ---")
    
    docs = db.collection("audit-log").where("questionId", "==", qid).stream()
    found = False
    for doc in docs:
        data = doc.to_dict()
        print(f"✅ Found in audit-log! Doc ID: {doc.id}")
        print(f"   Timestamp: {data.get('timestamp')}")
        print(f"   User: {data.get('userEmail')}")
        print(f"   Action: {data.get('action')}")
        print(f"   Details: {data.get('details')}")
        found = True
            
    if not found:
        # Try searching by string
        docs = db.collection("audit-log").where("questionId", "==", str(qid)).stream()
        for doc in docs:
            print(f"✅ Found in audit-log! (string) Doc ID: {doc.id}")
            print(f"   Timestamp: {data.get('timestamp')}")
            print(f"   User: {data.get('userEmail')}")
            print(f"   Action: {data.get('action')}")
            print(f"   Details: {data.get('details')}")
            found = True

    if not found:
        print("❌ No matches in audit-log for this question ID.")

if __name__ == "__main__":
    check_audit_log_question("76054948")
    check_audit_log_question(76054948)
