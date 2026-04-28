import os
import csv
import argparse
import firebase_admin
from firebase_admin import credentials, firestore

DEFAULT_SERVICE_ACCOUNT = "backups/assets/ue5-questions-prod-99289c4d03b3.json"
DEFAULT_OUTPUT_FILE = "questions_export.csv"

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
    parser = argparse.ArgumentParser(description="Export all Firestore questions to a CSV file.")
    parser.add_argument("--key", default=DEFAULT_SERVICE_ACCOUNT, help="Path to Firebase service account JSON")
    parser.add_argument("--output", default=DEFAULT_OUTPUT_FILE, help="Path for the output CSV file")
    args = parser.parse_args()

    print("Connecting to Firestore...")
    db = init_firebase(args.key)
    collection_ref = db.collection("questions")

    print("Fetching English questions from Firestore (this may take a moment)...")
    docs = collection_ref.where(filter=firestore.FieldFilter("language", "==", "English")).stream()

    # Define the headers for our CSV file
    headers = [
        "id", "uniqueId", "language", "discipline", "type", "difficulty",
        "question", "optionA", "optionB", "optionC", "optionD",
        "correct", "sourceUrl", "sourceExcerpt"
    ]

    count = 0
    with open(args.output, mode='w', newline='', encoding='utf-8') as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=headers)
        writer.writeheader()

        for doc in docs:
            data = doc.to_dict()
            options = data.get("options", {})
            
            row = {
                "id": doc.id,
                "uniqueId": data.get("uniqueId", ""),
                "language": data.get("language", "English"),
                "discipline": data.get("discipline", ""),
                "type": data.get("type", ""),
                "difficulty": data.get("difficulty", ""),
                "question": data.get("question", ""),
                "optionA": options.get("A", ""),
                "optionB": options.get("B", ""),
                "optionC": options.get("C", ""),
                "optionD": options.get("D", ""),
                "correct": data.get("correct", ""),
                "sourceUrl": data.get("sourceUrl", ""),
                "sourceExcerpt": data.get("sourceExcerpt", "")
            }
            writer.writerow(row)
            count += 1
            
            # Print progress every 500 records
            if count % 500 == 0:
                print(f"Processed {count} questions...")

    print(f"\nSuccessfully exported {count} questions to '{args.output}'.")

if __name__ == "__main__":
    main()
