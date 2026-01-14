"""
diagnose_critique_state.py - Detailed analysis of question review states

This script provides a comprehensive view of all questions and their review workflow state
to help diagnose issues where questions appear in wrong workflow states.

Usage:
    python scripts/diagnose_critique_state.py
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone
from collections import Counter


def init_firebase():
    """Initialize Firebase Admin SDK using Application Default Credentials."""
    try:
        firebase_admin.get_app()
    except ValueError:
        try:
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, {
                'projectId': 'ue5-questions-prod'
            })
        except Exception as e:
            print(f"❌ Could not initialize Firebase: {e}")
            print("   Please run: gcloud auth application-default login")
            raise
    return firestore.client()


def analyze_questions(db):
    """Analyze all questions and their review workflow state."""
    questions_ref = db.collection("questions")
    all_docs = list(questions_ref.stream())
    
    print(f"\n📊 Total questions in database: {len(all_docs)}")
    print("=" * 80)
    
    # Categorize by workflow state
    categories = {
        'uncritiqued': [],      # No critiqueScore, no critique text
        'critiqued_passing': [], # Has critiqueScore >= 85
        'critiqued_failing': [], # Has critiqueScore < 85
        'verified': [],          # humanVerified = true
        'accepted': [],          # status = 'accepted'
        'suspicious': []         # Has critiqueScore but no critique text (potential bug)
    }
    
    status_counts = Counter()
    
    for doc in all_docs:
        data = doc.to_dict()
        q_id = doc.id
        
        # Extract key fields
        critique_score = data.get("critiqueScore")
        critique_text = data.get("critique")
        human_verified = data.get("humanVerified", False)
        status = data.get("status", "unknown")
        improvements_applied = data.get("improvementsApplied", False)
        quality_score = data.get("qualityScore")  # Legacy field from generation
        created_at = data.get("createdAt", "")
        updated_at = data.get("updatedAt", "")
        
        status_counts[status] += 1
        
        question_info = {
            "id": q_id,
            "question": data.get("question", "")[:60],
            "status": status,
            "critiqueScore": critique_score,
            "qualityScore": quality_score,
            "hasCritiqueText": critique_text is not None and len(str(critique_text)) > 20,
            "humanVerified": human_verified,
            "improvementsApplied": improvements_applied,
            "createdAt": str(created_at)[:19] if created_at else "N/A",
            "updatedAt": str(updated_at)[:19] if updated_at else "N/A"
        }
        
        # Categorize
        if status == "accepted":
            categories['accepted'].append(question_info)
        elif human_verified:
            categories['verified'].append(question_info)
        elif critique_score is not None:
            # Check if suspicious (has score but no text)
            has_critique_text = critique_text is not None and len(str(critique_text)) > 20
            if not has_critique_text and not improvements_applied:
                categories['suspicious'].append(question_info)
            elif critique_score >= 85:
                categories['critiqued_passing'].append(question_info)
            else:
                categories['critiqued_failing'].append(question_info)
        else:
            categories['uncritiqued'].append(question_info)
    
    # Print status breakdown
    print("\n📈 STATUS BREAKDOWN:")
    for status, count in sorted(status_counts.items()):
        print(f"   {status}: {count}")
    
    # Print workflow state breakdown
    print("\n🔄 WORKFLOW STATE BREAKDOWN:")
    print(f"   Uncritiqued (Step 1 not started): {len(categories['uncritiqued'])}")
    print(f"   Critiqued - Passing (>= 85):      {len(categories['critiqued_passing'])}")
    print(f"   Critiqued - Failing (< 85):       {len(categories['critiqued_failing'])}")
    print(f"   Human Verified (Step 2 done):     {len(categories['verified'])}")
    print(f"   Accepted (Step 3 done):           {len(categories['accepted'])}")
    print(f"   ⚠️  SUSPICIOUS (score but no text): {len(categories['suspicious'])}")
    
    # Detailed view of suspicious questions
    if categories['suspicious']:
        print("\n" + "=" * 80)
        print("⚠️  SUSPICIOUS QUESTIONS (Have critiqueScore but NO critique text):")
        print("=" * 80)
        for q in categories['suspicious']:
            print(f"\n  ID: {q['id']}")
            print(f"  Question: {q['question']}...")
            print(f"  Status: {q['status']}")
            print(f"  critiqueScore: {q['critiqueScore']}")
            print(f"  qualityScore: {q['qualityScore']}")
            print(f"  hasCritiqueText: {q['hasCritiqueText']}")
            print(f"  humanVerified: {q['humanVerified']}")
            print(f"  improvementsApplied: {q['improvementsApplied']}")
            print(f"  Created: {q['createdAt']}")
            print(f"  Updated: {q['updatedAt']}")
    
    # Detailed view of verified questions (these might be the issue)
    if categories['verified']:
        print("\n" + "=" * 80)
        print("✓ VERIFIED QUESTIONS (humanVerified = true):")
        print("=" * 80)
        for q in categories['verified']:
            print(f"\n  ID: {q['id']}")
            print(f"  Question: {q['question']}...")
            print(f"  Status: {q['status']}")
            print(f"  critiqueScore: {q['critiqueScore']}")
            print(f"  hasCritiqueText: {q['hasCritiqueText']}")
            print(f"  improvementsApplied: {q['improvementsApplied']}")
    
    return categories


def main():
    """Main entry point."""
    print("=" * 80)
    print("CRITIQUE STATE DIAGNOSTIC REPORT")
    print("=" * 80)
    print(f"Run time: {datetime.now().isoformat()}")
    
    db = init_firebase()
    categories = analyze_questions(db)
    
    print("\n" + "=" * 80)
    print("RECOMMENDATION:")
    if categories['suspicious']:
        print(f"  Found {len(categories['suspicious'])} suspicious questions with critiqueScore but no critique text.")
        print("  Run: python scripts/repair_pending_questions.py --apply")
    else:
        print("  No data corruption detected. If questions are showing wrong states,")
        print("  the issue may be in the UI logic rather than the data.")
    print("=" * 80)


if __name__ == "__main__":
    main()
