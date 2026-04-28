
import firebase_admin
from firebase_admin import credentials, firestore
import os

# Path to service account key
key_path = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\backups\assets\ue5-questions-prod-99289c4d03b3.json"

if not firebase_admin._apps:
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

def check_progress():
    docs = db.collection('questions').where('language', '==', 'Chinese (Simplified)').where('creatorName', '==', 'Local Translation Bot').get()
    print(f"TOTAL_TRANSLATED: {len(docs)}")

if __name__ == "__main__":
    check_progress()
