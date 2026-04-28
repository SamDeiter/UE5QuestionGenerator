import firebase_admin
from firebase_admin import credentials, firestore

key_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\backups\assets\ue5-questions-prod-99289c4d03b3.json'
cred = credentials.Certificate(key_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

print("Analyzing Firestore timestamps and limits...")
# Use order_by to see the distribution
docs = db.collection('questions').order_by('firestoreUpdatedAt').get()
total = len(docs)

if total > 0:
    first = docs[0].to_dict().get('firestoreUpdatedAt')
    last = docs[-1].to_dict().get('firestoreUpdatedAt')
    print(f"Total Documents: {total}")
    print(f"First Update: {first}")
    print(f"Last Update:  {last}")
    
    # Check if Spanish is at the beginning or end
    spanish_indices = [i for i, d in enumerate(docs) if d.to_dict().get('language') == 'Spanish']
    if spanish_indices:
        print(f"Spanish documents indices: {min(spanish_indices)} to {max(spanish_indices)}")
    else:
        print("No Spanish documents found in ordering.")
else:
    print("No documents found.")
