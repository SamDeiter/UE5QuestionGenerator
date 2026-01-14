import firebase_admin
from firebase_admin import credentials, firestore
import os

def list_sample_questions():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    
    db = firestore.client()
    docs = db.collection("questions").limit(10).stream()
    for doc in docs:
        data = doc.to_dict()
        print(f"Doc ID: {doc.id} | id: {data.get('id')} | uniqueId: {data.get('uniqueId')}")

if __name__ == "__main__":
    list_sample_questions()
