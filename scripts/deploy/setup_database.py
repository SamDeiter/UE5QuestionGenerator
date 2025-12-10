# -*- coding: utf-8 -*-
"""
Firebase Database Setup Script
Creates production Firebase project configuration and Firestore rules
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from deployment_helper import DeploymentHelper

def create_production_env_template(helper):
    """Create .env.production template"""
    template = """# Production Firebase Configuration
# Fill in with actual production Firebase project credentials

VITE_FIREBASE_API_KEY=your_production_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=ue5questions-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ue5questions-prod
VITE_FIREBASE_STORAGE_BUCKET=ue5questions-prod.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
"""
    
    helper.write_file('.env.production.template', template)
    helper.log("Created .env.production.template", 'SUCCESS')

def create_firestore_rules(helper):
    """Create production Firestore rules"""
    rules = """rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Questions collection - production rules
    match /questions/{questionId} {
      // Anyone authenticated can read
      allow read: if request.auth != null;
      
      // Only authenticated users can create/update their own questions
      allow create: if request.auth != null 
        && request.resource.data.creatorId == request.auth.uid
        && request.resource.data.question.size() >= 10
        && request.resource.data.question.size() <= 1000
        && request.resource.data.correctAnswer.size() > 0
        && request.resource.data.correctAnswer.size() <= 500;
      
      // Only question owner can update
      allow update: if request.auth != null 
        && resource.data.creatorId == request.auth.uid
        && request.resource.data.creatorId == request.auth.uid;
      
      // Only question owner can delete
      allow delete: if request.auth != null 
        && resource.data.creatorId == request.auth.uid;
    }
    
    // Custom tags collection
    match /customTags/{userId} {
      allow read: if true;  // Tags are public
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
"""
    
    helper.write_file('firestore.rules.production', rules)
    helper.log("Created firestore.rules.production", 'SUCCESS')

def create_development_rules(helper):
    """Create permissive development Firestore rules"""
    rules = """rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Development rules - more permissive for testing
    match /questions/{questionId} {
      allow read, write: if request.auth != null;
    }
    
    match /customTags/{userId} {
      allow read, write: if request.auth != null;
    }
  }
}
"""
    
    helper.write_file('firestore.rules.development', rules)
    helper.log("Created firestore.rules.development", 'SUCCESS')

def main():
    project_root = Path(__file__).parent.parent.parent
    helper = DeploymentHelper(project_root)
    
    helper.print_header("Firebase Database Setup")
    
    helper.print_section("Creating environment templates")
    create_production_env_template(helper)
    
    helper.print_section("Creating Firestore security rules")
    create_firestore_rules(helper)
    create_development_rules(helper)
    
    helper.print_section("Next Steps")
    helper.log("1. Create production Firebase project at console.firebase.google.com", 'INFO')
    helper.log("2. Copy .env.production.template to .env.production", 'INFO')
    helper.log("3. Fill in production Firebase credentials", 'INFO')
    helper.log("4. Deploy rules: firebase deploy --only firestore:rules --project ue5questions-prod", 'INFO')
    
    helper.print_section("Summary")
    helper.log("Database setup files created successfully!", 'SUCCESS')
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
