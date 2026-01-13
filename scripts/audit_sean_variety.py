import firebase_admin
from firebase_admin import credentials, firestore

def audit_sean_tag_variety():
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': 'ue5-questions-prod',
        })
    
    db = firestore.client()
    questions_ref = db.collection("questions")
    
    reviewer_email = "sean.spitzer@epicgames.com"
    
    docs = questions_ref.where("reviewedBy", "==", reviewer_email).stream()
    
    tag_counts = {}
    source_counts = {}
    
    total = 0
    for doc in docs:
        total += 1
        data = doc.to_dict()
        tags = data.get("tags", [])
        source = data.get("sourceUrl") or data.get("source")
        
        for t in tags:
            tag_counts[t] = tag_counts.get(t, 0) + 1
        
        if source:
            source_domain = source.split('/')[2] if '/' in source else source
            source_counts[source_domain] = source_counts.get(source_domain, 0) + 1
        else:
            source_counts["MISSING"] = source_counts.get("MISSING", 0) + 1

    print(f"Total questions by Sean: {total}")
    print("\nTag Counts:")
    for t, c in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:20]:
        print(f"  {t}: {c}")
    
    print("\nSource Counts:")
    for s, c in sorted(source_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {s}: {c}")

if __name__ == "__main__":
    audit_sean_tag_variety()
