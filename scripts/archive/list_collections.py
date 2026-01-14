import firebase_admin
from firebase_admin import credentials, firestore
import os

def list_collections():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    collections = db.collections()
    for coll in collections:
        print(f"Collection: {coll.id}")

if __name__ == "__main__":
    list_collections()
