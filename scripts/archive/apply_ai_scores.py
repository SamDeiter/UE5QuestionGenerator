#!/usr/bin/env python3
"""
Apply AI-generated scores to questions in Firebase database.

This script reads all scored batch files from the Scores/ directory
and updates the corresponding questions in Firestore with their AI scores.
"""

import json
import os
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Initialize Firebase
def init_firebase():
    """Initialize Firebase Admin SDK."""
    # Check if already initialized
    if not firebase_admin._apps:
        # Get credentials from environment or use default
        cred_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
        else:
            # Use application default credentials
            cred = credentials.ApplicationDefault()
        
        firebase_admin.initialize_app(cred, {
            'projectId': os.getenv('VITE_FIREBASE_PROJECT_ID', 'ue5questiongenerator')
        })
    
    return firestore.client()

def load_all_scores(scores_dir):
    """Load all score batches from the Scores directory."""
    scores_dir = Path(scores_dir)
    all_scores = {}
    
    batch_files = sorted(scores_dir.glob('strict_scored_batch_*.json'))
    print(f"📂 Found {len(batch_files)} strict batch files")
    
    for batch_file in batch_files:
        print(f"   Loading {batch_file.name}...")
        with open(batch_file, 'r', encoding='utf-8') as f:
            batch_data = json.load(f)
            
        for entry in batch_data:
            question_id = str(entry['id'])
            score = entry['originalScore']
            all_scores[question_id] = score
    
    print(f"✅ Loaded {len(all_scores)} total scores")
    return all_scores

def apply_scores_to_firestore(db, scores):
    """Apply scores to questions in Firestore."""
    questions_ref = db.collection('questions')
    
    updated_count = 0
    not_found_count = 0
    error_count = 0
    
    print(f"\n🔄 Updating {len(scores)} questions in Firestore...")
    
    for question_id, score in scores.items():
        try:
            doc_ref = questions_ref.document(question_id)
            doc = doc_ref.get()
            
            if doc.exists:
                # Update with AI score
                doc_ref.update({
                    'aiScore': score,
                    'scoredAt': datetime.now(),
                    'scoreSource': 'AI_Batch_Import'
                })
                updated_count += 1
                
                if updated_count % 100 == 0:
                    print(f"   ✓ Updated {updated_count} questions...")
            else:
                not_found_count += 1
                
        except Exception as e:
            error_count += 1
            print(f"   ❌ Error updating {question_id}: {e}")
    
    print(f"\n📊 Results:")
    print(f"   ✅ Updated: {updated_count}")
    print(f"   ⚠️  Not found: {not_found_count}")
    print(f"   ❌ Errors: {error_count}")
    
    return updated_count, not_found_count, error_count

def generate_score_report(scores):
    """Generate a distribution report of the scores."""
    score_ranges = {
        '90-100 (Exceptional)': 0,
        '80-89 (Very Good)': 0,
        '70-79 (Good)': 0,
        '60-69 (Adequate)': 0,
        '50-59 (Weak)': 0,
        'Below 50 (Poor/Unacceptable)': 0
    }
    
    for score in scores.values():
        if score >= 90:
            score_ranges['90-100 (Exceptional)'] += 1
        elif score >= 80:
            score_ranges['80-89 (Very Good)'] += 1
        elif score >= 70:
            score_ranges['70-79 (Good)'] += 1
        elif score >= 60:
            score_ranges['60-69 (Adequate)'] += 1
        elif score >= 50:
            score_ranges['50-59 (Weak)'] += 1
        else:
            score_ranges['Below 50 (Poor/Unacceptable)'] += 1
    
    print("\n📈 Score Distribution:")
    for range_name, count in score_ranges.items():
        percentage = (count / len(scores) * 100) if scores else 0
        bar = '█' * int(percentage / 2)
        print(f"   {range_name:30s} {count:4d} ({percentage:5.1f}%) {bar}")

def main():
    """Main execution."""
    print("🔥 UE5 Question Scorer - Batch Import")
    print("=" * 60)
    
    # Paths
    project_root = Path(__file__).parent.parent
    scores_dir = project_root / 'Scores'
    
    # Load scores
    scores = load_all_scores(scores_dir)
    
    # Generate distribution report
    generate_score_report(scores)
    
    # Ask for confirmation
    print("\n⚠️  This will update questions in Firebase with AI scores.")
    response = input("Continue? (yes/no): ").strip().lower()
    
    if response != 'yes':
        print("❌ Aborted by user")
        return
    
    # Initialize Firebase and apply scores
    db = init_firebase()
    updated, not_found, errors = apply_scores_to_firestore(db, scores)
    
    print("\n✅ Score import complete!")
    print(f"   Remember: All questions still require human review (Human-in-the-Loop)")

if __name__ == '__main__':
    main()
