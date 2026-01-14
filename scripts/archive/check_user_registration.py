#!/usr/bin/env python3
"""
Check User Registration Status

This script checks if a specific user is registered in the `registeredUsers` collection
and provides details about their account status.

Usage:
    python scripts/check_user_registration.py --email "sean@example.com"
    python scripts/check_user_registration.py --name "Sean"
"""

import firebase_admin
from firebase_admin import credentials, firestore
import argparse
import os

# Initialize Firebase with production credentials
def init_firebase():
    if not firebase_admin._apps:
        # Use the service account key file
        cred_path = os.path.join(os.path.dirname(__file__), '..', 'serviceAccountKey.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {
                'projectId': 'ue5-questions-prod'  # Production database
            })
        else:
            # Try default credentials
            firebase_admin.initialize_app(options={
                'projectId': 'ue5-questions-prod'
            })
    return firestore.client()


def check_registration(db, email=None, name=None):
    """Check if user is in registeredUsers collection."""
    print("\n" + "="*60)
    print("CHECKING USER REGISTRATION STATUS")
    print("="*60)
    print(f"Target: {email or name}")
    print(f"Database: ue5-questions-prod")
    print()
    
    registered_users_ref = db.collection('registeredUsers')
    
    # Search by email
    if email:
        # Query where email field matches
        query = registered_users_ref.where('email', '==', email).limit(10)
        results = list(query.stream())
        
        if results:
            print(f"✅ FOUND {len(results)} match(es) for email: {email}\n")
            for doc in results:
                data = doc.to_dict()
                print(f"  Document ID: {doc.id}")
                print(f"  Email: {data.get('email', 'N/A')}")
                print(f"  Role: {data.get('role', 'N/A')}")
                print(f"  Registered At: {data.get('registeredAt', 'N/A')}")
                print(f"  Invite Code Used: {data.get('inviteCodeUsed', 'N/A')}")
                print()
        else:
            print(f"❌ NO USER FOUND with email: {email}")
            print("   This user needs an invite code to register.")
    
    # Search by name (partial match across all users)
    if name:
        all_users = list(registered_users_ref.stream())
        matches = []
        
        for doc in all_users:
            data = doc.to_dict()
            user_email = data.get('email', '').lower()
            if name.lower() in user_email:
                matches.append((doc.id, data))
        
        if matches:
            print(f"✅ FOUND {len(matches)} match(es) containing '{name}':\n")
            for doc_id, data in matches:
                print(f"  Document ID: {doc_id}")
                print(f"  Email: {data.get('email', 'N/A')}")
                print(f"  Role: {data.get('role', 'N/A')}")
                print(f"  Registered At: {data.get('registeredAt', 'N/A')}")
                print(f"  Invite Code Used: {data.get('inviteCodeUsed', 'N/A')}")
                print()
        else:
            print(f"❌ NO USER FOUND containing '{name}' in email")
    
    # Also list all registered users for reference
    print("\n" + "-"*60)
    print("ALL REGISTERED USERS:")
    print("-"*60)
    all_users = list(registered_users_ref.stream())
    print(f"Total: {len(all_users)} registered users\n")
    
    for doc in all_users:
        data = doc.to_dict()
        role_badge = "👑" if data.get('role') == 'admin' else "👤"
        print(f"  {role_badge} {data.get('email', 'N/A')} ({data.get('role', 'user')})")
    
    print()


def main():
    parser = argparse.ArgumentParser(description='Check user registration status in Firestore')
    parser.add_argument('--email', type=str, help='Email address to search for')
    parser.add_argument('--name', type=str, help='Name/partial email to search for')
    
    args = parser.parse_args()
    
    if not args.email and not args.name:
        # Default to searching for "Sean"
        args.name = "Sean"
    
    db = init_firebase()
    check_registration(db, email=args.email, name=args.name)


if __name__ == '__main__':
    main()
