import os
import argparse
import firebase_admin
from firebase_admin import credentials, firestore

DEFAULT_SERVICE_ACCOUNT = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
LANGUAGES = [
    "English", "Japanese", "Korean", "Spanish", "French",
    "German", "Italian", "Portuguese", "Russian",
    "Chinese (Simplified)"
]

def init_firebase(key_path: str):
    """Initialize Firebase Admin SDK."""
    if not os.path.exists(key_path):
        print(f"Error: Service account key not found at {key_path}")
        exit(1)
    if not firebase_admin._apps:
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
    return firestore.client()

def main():
    parser = argparse.ArgumentParser(description="Check translation progress across all languages.")
    parser.add_argument("--key", default=DEFAULT_SERVICE_ACCOUNT, help="Path to Firebase service account JSON")
    args = parser.parse_args()

    print("Connecting to Firestore...")
    db = init_firebase(args.key)
    collection_ref = db.collection("questions")

    print(f"\n{'='*40}")
    print(f"{'Language':<25} | {'Count':>10}")
    print(f"{'-'*40}")

    total_count = 0
    for lang in LANGUAGES:
        try:
            # Efficient count query (does not download documents)
            aggregation_query = collection_ref.where(filter=firestore.FieldFilter("language", "==", lang)).count()
            results = aggregation_query.get()
            count = results[0][0].value
            total_count += count
            print(f"{lang:<25} | {count:>10,}")
        except Exception as e:
            print(f"{lang:<25} | {'Error':>10}")

    print(f"{'='*40}")
    print(f"{'Total Questions in DB':<25} | {total_count:>10,}")
    print(f"{'='*40}\n")

if __name__ == "__main__":
    main()
