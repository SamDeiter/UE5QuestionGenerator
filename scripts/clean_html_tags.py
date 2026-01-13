#!/usr/bin/env python3
"""
Clean HTML Tags from Question Text

This script finds questions with literal HTML tags like <b>, </b> stored as text
and either removes them or converts them properly.

Usage:
    python scripts/clean_html_tags.py          # Dry run - shows affected questions
    python scripts/clean_html_tags.py --apply  # Actually clean the data
"""

import firebase_admin
from firebase_admin import credentials, firestore
import argparse
import os
import re

# Initialize Firebase with production credentials
def init_firebase():
    if not firebase_admin._apps:
        cred_path = os.path.join(os.path.dirname(__file__), '..', 'serviceAccountKey.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {
                'projectId': 'ue5-questions-prod'
            })
        else:
            firebase_admin.initialize_app(options={
                'projectId': 'ue5-questions-prod'
            })
    return firestore.client()


def clean_html_tags(text):
    """Remove or clean HTML tags from text."""
    if not text:
        return text
    
    # Common HTML tags to remove
    # Remove <b>, </b>, <i>, </i>, <strong>, </strong>, <em>, </em>, etc.
    cleaned = re.sub(r'</?b\s*/?>', '', text, flags=re.IGNORECASE)
    cleaned = re.sub(r'</?i\s*/?>', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'</?strong\s*/?>', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'</?em\s*/?>', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'</?u\s*/?>', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'</?span[^>]*>', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'</?p\s*/?>', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'<br\s*/?>', ' ', cleaned, flags=re.IGNORECASE)
    
    # Clean up extra whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    return cleaned


def has_html_tags(text):
    """Check if text contains visible HTML tags."""
    if not text:
        return False
    # Look for common HTML tags
    return bool(re.search(r'</?[a-zA-Z][^>]*>', text))


def main():
    parser = argparse.ArgumentParser(description='Clean HTML tags from question data')
    parser.add_argument('--apply', action='store_true', help='Actually apply changes (default: dry run)')
    args = parser.parse_args()

    db = init_firebase()
    
    print("\n" + "="*60)
    print("CLEANING HTML TAGS FROM QUESTIONS")
    print("="*60)
    print(f"Mode: {'APPLY CHANGES' if args.apply else 'DRY RUN (use --apply to make changes)'}")
    print(f"Database: ue5-questions-prod")
    print()

    questions_ref = db.collection('questions')
    all_questions = list(questions_ref.stream())
    
    affected = []
    
    for doc in all_questions:
        data = doc.to_dict()
        needs_update = False
        updates = {}
        
        # Check question text
        question_text = data.get('question', '')
        if has_html_tags(question_text):
            cleaned = clean_html_tags(question_text)
            if cleaned != question_text:
                updates['question'] = cleaned
                needs_update = True
        
        # Check options
        options = data.get('options', {})
        if options:
            cleaned_options = {}
            for key, value in options.items():
                if has_html_tags(value):
                    cleaned_options[key] = clean_html_tags(value)
                    needs_update = True
                else:
                    cleaned_options[key] = value
            if needs_update and cleaned_options:
                updates['options'] = cleaned_options
        
        if needs_update:
            affected.append({
                'id': doc.id,
                'question': question_text[:80] + '...' if len(question_text) > 80 else question_text,
                'updates': updates
            })
    
    print(f"Found {len(affected)} questions with HTML tags\n")
    
    if not affected:
        print("✅ No questions need cleaning!")
        return
    
    # Show first 10 examples
    print("-"*60)
    print("EXAMPLES (first 10):")
    print("-"*60)
    for item in affected[:10]:
        print(f"\n  ID: {item['id']}")
        print(f"  Question: {item['question']}")
        if 'options' in item['updates']:
            for key, val in item['updates']['options'].items():
                print(f"  Option {key}: {val[:50]}...")
    
    if args.apply:
        print("\n" + "-"*60)
        print("APPLYING CHANGES...")
        print("-"*60)
        
        success = 0
        errors = 0
        
        for item in affected:
            try:
                doc_ref = questions_ref.document(item['id'])
                doc_ref.update(item['updates'])
                success += 1
                print(f"  ✅ Cleaned {item['id']}")
            except Exception as e:
                errors += 1
                print(f"  ❌ Error on {item['id']}: {e}")
        
        print(f"\n{'='*60}")
        print(f"SUMMARY: {success} cleaned, {errors} errors")
        print(f"{'='*60}")
    else:
        print(f"\n⚠️  Run with --apply to clean {len(affected)} questions")


if __name__ == '__main__':
    main()
