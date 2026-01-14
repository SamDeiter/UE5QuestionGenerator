#!/usr/bin/env python3
"""
Database Audit Script

Analyzes the composition of all questions in the production database.
Provides breakdown by status, discipline, creator, language, and age.

Usage:
    python scripts/audit_database.py
"""

import firebase_admin
from firebase_admin import credentials, firestore
from collections import defaultdict
from datetime import datetime, timezone
import os

def init_firebase():
    if not firebase_admin._apps:
        cred_path = os.path.join(os.path.dirname(__file__), '..', 'serviceAccountKey.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {'projectId': 'ue5-questions-prod'})
        else:
            firebase_admin.initialize_app(options={'projectId': 'ue5-questions-prod'})
    return firestore.client()


def main():
    db = init_firebase()
    
    print("\n" + "="*70)
    print("DATABASE AUDIT REPORT")
    print("="*70)
    print(f"Database: ue5-questions-prod")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()
    
    # Fetch all questions
    questions_ref = db.collection('questions')
    all_docs = list(questions_ref.stream())
    total = len(all_docs)
    
    print(f"📊 TOTAL QUESTIONS: {total:,}")
    print()
    
    # Initialize counters
    by_status = defaultdict(int)
    by_discipline = defaultdict(int)
    by_creator = defaultdict(int)
    by_language = defaultdict(int)
    by_difficulty = defaultdict(int)
    by_type = defaultdict(int)
    by_month = defaultdict(int)
    has_critique = 0
    has_verified = 0
    has_tags = 0
    
    for doc in all_docs:
        data = doc.to_dict()
        
        # Status breakdown
        status = data.get('status', 'pending')
        by_status[status] += 1
        
        # Discipline
        discipline = data.get('discipline', 'Unknown')
        by_discipline[discipline] += 1
        
        # Creator
        creator = data.get('creatorEmail') or data.get('createdBy') or 'Unknown'
        by_creator[creator] += 1
        
        # Language
        language = data.get('language', 'English')
        by_language[language] += 1
        
        # Difficulty
        difficulty = data.get('difficulty', 'Unknown')
        by_difficulty[difficulty] += 1
        
        # Type
        qtype = data.get('type', 'Unknown')
        by_type[qtype] += 1
        
        # Created date
        created = data.get('createdAt') or data.get('generatedAt')
        if created:
            try:
                if isinstance(created, str):
                    dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
                else:
                    dt = created
                month_key = dt.strftime('%Y-%m')
                by_month[month_key] += 1
            except:
                pass
        
        # Quality flags
        if data.get('critiqueScore') is not None:
            has_critique += 1
        if data.get('humanVerified'):
            has_verified += 1
        if data.get('tags') and len(data.get('tags', [])) > 0:
            has_tags += 1
    
    # Print results
    print("-"*70)
    print("BY STATUS:")
    print("-"*70)
    for status, count in sorted(by_status.items(), key=lambda x: -x[1]):
        pct = (count / total) * 100
        print(f"  {status:20} {count:6,} ({pct:5.1f}%)")
    
    print("\n" + "-"*70)
    print("BY DISCIPLINE:")
    print("-"*70)
    for discipline, count in sorted(by_discipline.items(), key=lambda x: -x[1]):
        pct = (count / total) * 100
        print(f"  {discipline:20} {count:6,} ({pct:5.1f}%)")
    
    print("\n" + "-"*70)
    print("BY LANGUAGE:")
    print("-"*70)
    for lang, count in sorted(by_language.items(), key=lambda x: -x[1]):
        pct = (count / total) * 100
        print(f"  {lang:20} {count:6,} ({pct:5.1f}%)")
    
    print("\n" + "-"*70)
    print("BY DIFFICULTY:")
    print("-"*70)
    for diff, count in sorted(by_difficulty.items(), key=lambda x: -x[1]):
        pct = (count / total) * 100
        print(f"  {diff:20} {count:6,} ({pct:5.1f}%)")
    
    print("\n" + "-"*70)
    print("BY TYPE:")
    print("-"*70)
    for qtype, count in sorted(by_type.items(), key=lambda x: -x[1]):
        pct = (count / total) * 100
        print(f"  {qtype:20} {count:6,} ({pct:5.1f}%)")
    
    print("\n" + "-"*70)
    print("TOP 10 CREATORS:")
    print("-"*70)
    for creator, count in sorted(by_creator.items(), key=lambda x: -x[1])[:10]:
        pct = (count / total) * 100
        # Truncate email for display
        display = creator[:35] + '...' if len(creator) > 35 else creator
        print(f"  {display:38} {count:6,} ({pct:5.1f}%)")
    
    print("\n" + "-"*70)
    print("QUESTIONS BY MONTH (Recent):")
    print("-"*70)
    for month, count in sorted(by_month.items())[-12:]:
        print(f"  {month:20} {count:6,}")
    
    print("\n" + "-"*70)
    print("QUALITY METRICS:")
    print("-"*70)
    print(f"  Has Critique Score: {has_critique:6,} ({(has_critique/total)*100:.1f}%)")
    print(f"  Human Verified:     {has_verified:6,} ({(has_verified/total)*100:.1f}%)")
    print(f"  Has Tags:           {has_tags:6,} ({(has_tags/total)*100:.1f}%)")
    
    print("\n" + "="*70)
    print("AUDIT COMPLETE")
    print("="*70 + "\n")


if __name__ == '__main__':
    main()
