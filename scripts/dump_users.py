import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

def dump_all_users():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    users_ref = db.collection("registeredUsers")
    docs = users_ref.stream()
    
    users = []
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        # Convert timestamps
        for k, v in data.items():
            if hasattr(v, 'isoformat'):
                data[k] = v.isoformat()
        users.append(data)
        
    with open('all_registered_users.json', 'w') as f:
        json.dump(users, f, indent=2)
    print("Done. See all_registered_users.json")

if __name__ == "__main__":
    dump_all_users()
