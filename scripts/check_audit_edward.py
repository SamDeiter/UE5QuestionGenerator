import firebase_admin
from firebase_admin import credentials, firestore
import os

def check_audit_log(term):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    print(f"--- Checking 'audit-log' for '{term}' ---")
    
    docs = db.collection("audit-log").stream()
    count = 0
    for doc in docs:
        data = doc.to_dict()
        data_str = str(data)
        if term.lower() in data_str.lower():
            print(f"✅ Found in audit-log! Doc ID: {doc.id}")
            print(f"   Timestamp: {data.get('timestamp')}")
            print(f"   User: {data.get('userEmail')}")
            print(f"   Action: {data.get('action')}")
            print(f"   Details: {data.get('details')}")
            count += 1
            if count > 20: break
            
    if count == 0:
        print("❌ No matches in audit-log.")

if __name__ == "__main__":
    import sys
    term = sys.argv[1] if len(sys.argv) > 1 else "Bennett"
    check_audit_log(term)

