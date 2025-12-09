# UE5 Question Generator - Deployment Quick Start

## 🚀 One-Command Deployment

Deploy a new version to production with a single command:

```bash
python tools/deploy/deploy_master.py --version 1.7.0
```

This will automatically:
1. ✅ Run pre-deployment validation
2. ✅ Create release branch
3. ✅ Run UAT checklist (manual approval)
4. ✅ Deploy to production
5. ✅ Run health checks

---

## 📦 Database Environment Setup

### Current Setup
- **Dev/Testing:** `ue5questionssoure` (current Firebase project)
- **Production:** `ue5questions-prod` (to be created)

### Database Isolation Strategy

**Phase 1: Create Production Firebase Project**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project: `ue5questions-prod`
3. Enable:
   - Authentication (Google OAuth)
   - Firestore Database
   - Analytics (optional)
4. Add web app, copy config

**Phase 2: Environment-Specific Configuration**

Create `.env.development` (for local dev):
```env
VITE_FIREBASE_PROJECT_ID=ue5questionssoure
VITE_FIREBASE_API_KEY=your_dev_key
VITE_FIREBASE_AUTH_DOMAIN=ue5questionssoure.firebaseapp.com
```

Create `.env.production` (for prod builds):
```env
VITE_FIREBASE_PROJECT_ID=ue5questions-prod
VITE_FIREBASE_API_KEY=your_prod_key
VITE_FIREBASE_AUTH_DOMAIN=ue5questions-prod.firebaseapp.com
```

**Phase 3: Firestore Security Rules**

**Development (permissive for testing):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /questions/{questionId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Production (strict):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /questions/{questionId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null 
        && request.resource.data.creatorId == request.auth.uid
        && request.resource.data.question.size() >= 10
        && request.resource.data.question.size() <= 1000;
      allow delete: if request.auth != null 
        && resource.data.creatorId == request.auth.uid;
    }
  }
}
```

---

## 🔧 Build Configuration

Update `vite.config.js` to use environment-specific builds:

```javascript
export default defineConfig(({ mode }) => ({
  // ... existing config
  define: {
    __DEV__: mode === 'development'
  }
}))
```

Build commands:
```bash
# Development build
vite build --mode development

# Production build
vite build --mode production
```

---

## 📋 Deployment Checklist

### Before Deployment
- [ ] All tests passing
- [ ] No console.log statements in production code
- [ ] Environment variables configured
- [ ] Firebase rules updated for production

### During Deployment
- [ ] Create release branch
- [ ] Run automated checks
- [ ] Perform UAT on staging
- [ ] Deploy to production
- [ ] Verify health checks

### After Deployment
- [ ] Monitor Firebase console (15 min)
- [ ] Test critical user flows
- [ ] Verify data sync between environments
- [ ] Document any issues

---

## 🆘 Emergency Procedures

**Rollback Frontend:**
```bash
python tools/deploy/09_rollback_frontend.py
```

**Rollback Database:**
1. Go to Firebase Console
2. Firestore → Select database
3. Restore from backup (if configured)

---

## 📊 Monitoring

Monitor these Firebase metrics:
- Authentication success rate
- Firestore read/write latency
- Cloud Function errors (if using)
- Active user count

Set up alerts for:
- Authentication failures > 5  in 5 min
- Firestore errors > 10 in 5 min
- Page load time > 5 seconds

---

**Quick Reference:**
- Deploy: `python tools/deploy/deploy_master.py --version X.X.X`
- Checks only: `python tools/deploy/deploy_master.py --version X.X.X --dry-run`
- Rollback: `python tools/deploy/09_rollback_frontend.py`
