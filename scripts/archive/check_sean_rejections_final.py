import firebase_admin
from firebase_admin import credentials, firestore

def check_sean_rejections():
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': 'ue5-questions-prod',
        })
    
    db = firestore.client()
    questions_ref = db.collection("questions")
    
    reviewer_email = "sean.spitzer@epicgames.com"
    
    # Check for cases where he is the reviewer and it was rejected
    docs = questions_ref.where("status", "==", "rejected").where("reviewedBy", "==", reviewer_email).stream()
    
    rejected_count = 0
    for doc in docs:
        rejected_count += 1
        data = doc.to_dict()
        print(f"Rejected ID: {doc.id} | Reason: {data.get('rejectionReason')}")

    print(f"\nTotal rejections found for {reviewer_email}: {rejected_count}")

if __name__ == "__main__":
    check_sean_rejections()
