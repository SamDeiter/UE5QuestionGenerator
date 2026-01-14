import firebase_admin
from firebase_admin import credentials, firestore
import os

def check_test_db():
    # Use the test project ID from .firebaserc
    test_project_id = "ue5questionssoure"
    
    if not firebase_admin._apps:
        # We assume ADC or a valid environment is set up for the default app,
        # but for a specific project we might need to be explicit or hope use_env works.
        try:
            firebase_admin.initialize_app(options={'projectId': test_project_id})
        except Exception as e:
            print(f"Error initializing test app: {e}")
            return
    
    db = firestore.client()
    email = "edward.bennett@epicgames.com"
    
    print(f"--- Checking TEST DB: {test_project_id} for {email} ---")
    
    try:
        # Check registeredUsers
        docs = db.collection("registeredUsers").where("email", "==", email).stream()
        found = False
        for doc in docs:
            print(f"FOUND in 'registeredUsers' (TEST DB): {doc.id} -> {doc.to_dict()}")
            found = True
            
        # Check admins
        docs = db.collection("admins").where("email", "==", email).stream()
        for doc in docs:
            print(f"FOUND in 'admins' (TEST DB): {doc.id} -> {doc.to_dict()}")
            found = True
            
        if not found:
            print("NOT found in TEST DB registeredUsers/admins.")
            
        # Check for the specific question ID in TEST DB
        qid = "76054948"
        print(f"--- Searching for Question {qid} in TEST DB questions ---")
        docs = db.collection("questions").where("uniqueId", ">=", qid).where("uniqueId", "<=", qid + "\uf8ff").stream()
        for doc in docs:
            print(f"FOUND question in TEST DB! Doc ID: {doc.id}")
            print(f"   Data: {doc.to_dict()}")

    except Exception as e:
        print(f"Error querying test DB: {e}")

if __name__ == "__main__":
    check_test_db()
