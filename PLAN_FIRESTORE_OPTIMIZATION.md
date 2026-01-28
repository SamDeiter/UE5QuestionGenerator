# 🚀 Firestore Performance Optimization Plan

**Created:** 2026-01-28  
**Target:** 10× traffic scalability for "questions" loading  
**Current State:** 5000 docs fetched per session (~15MB, 2-4s latency)  
**Target State:** <200 docs per session (<1MB, <500ms latency)

---

## 📊 Impact Summary

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Reads/session | 5,000 | <200 | **96% reduction** |
| Bandwidth/session | 15MB | <1MB | **93% reduction** |
| Initial load latency | 2-4s | <500ms | **85% improvement** |
| Monthly cost (10× scale) | ~$200 | ~$5 | **97.5% reduction** |

---

## 🎯 Phase Overview

| Phase | Focus | Duration | Risk | Dependencies |
|-------|-------|----------|------|--------------|
| **Phase 1** | Critical Query Fixes | 2-3 days | Low | None |
| **Phase 2** | Server-side Aggregations | 2-3 days | Medium | Phase 1 |
| **Phase 3** | Caching & Batching | 2-3 days | Low | None |
| **Phase 4** | Schema Optimization | 3-5 days | High | Phases 1-3 |
| **Phase 5** | Monitoring & Benchmarks | 1-2 days | Low | Phases 1-4 |

---

## 🔴 Phase 1: Critical Query Fixes (IMMEDIATE)

### Goal: Eliminate unbounded queries and add missing indexes

### 1.1 Add Missing Composite Indexes

**File:** `config/firestore/firestore.indexes.json`

**New Indexes:**

```json
{
  "collectionGroup": "questions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "critiqueScore", "order": "ASCENDING" },
    { "fieldPath": "firestoreUpdatedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "questions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "discipline", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "firestoreUpdatedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "questions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "createdBy", "order": "ASCENDING" },
    { "fieldPath": "firestoreUpdatedAt", "order": "DESCENDING" }
  ]
}
```

**Action:** Deploy indexes with `firebase deploy --only firestore:indexes`

**Estimated Time:** 30 minutes (deploy) + 10-30 minutes (index build)

---

### 1.2 Reduce Default Query Limit from 5000 to 100

**File:** `src/services/firebaseQueries.js`

**Change:**

```javascript
// OLD
export const getAllQuestionsFromFirestore = async (currentLimit = 5000, forceRefresh = false) => {

// NEW  
export const getAllQuestionsFromFirestore = async (currentLimit = 100, forceRefresh = false) => {
```

**Risk:** Existing code may rely on getting "all" questions. Need to audit callers.

**Callers to audit:**

- [ ] `App.jsx` - Main database view
- [ ] `useQuestionManager.js` - Question state hook
- [ ] `dataMaintenanceTasks.js` - Admin tasks (keep high limit for admin)

---

### 1.3 Implement Cursor-based Pagination in firebaseQueries.js

**File:** `src/services/firebaseQueries.js`

**New Function:**

```javascript
/**
 * Paginated question fetch with cursor-based pagination.
 * @param {Object} options - Pagination options
 * @param {string} options.status - Filter by status (optional)
 * @param {number} options.limit - Number of docs per page (default 50)
 * @param {DocumentSnapshot} options.lastDoc - Last doc from previous page (optional)
 * @param {string} options.orderByField - Field to order by (default 'firestoreUpdatedAt')
 * @param {string} options.orderDirection - 'asc' or 'desc' (default 'desc')
 * @returns {Promise<{questions: Array, lastDoc: DocumentSnapshot, hasMore: boolean}>}
 */
export const getQuestionsPaginated = async ({
  status = null,
  limit: pageLimit = 50,
  lastDoc = null,
  orderByField = 'firestoreUpdatedAt',
  orderDirection = 'desc'
} = {}) => {
  const constraints = [];
  
  if (status) {
    constraints.push(where('status', '==', status));
  }
  
  constraints.push(orderBy(orderByField, orderDirection));
  constraints.push(limit(pageLimit + 1)); // Fetch one extra to check hasMore
  
  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }
  
  const q = query(collection(getDb(), 'questions'), ...constraints);
  const snapshot = await getDocs(q);
  
  const docs = snapshot.docs;
  const hasMore = docs.length > pageLimit;
  
  // Remove the extra doc if we have more
  const questions = docs.slice(0, pageLimit).map(doc => ({
    ...doc.data(),
    id: doc.id,
    _source: QUESTION_SOURCES.DATABASE
  }));
  
  return {
    questions,
    lastDoc: docs[pageLimit - 1] || null,
    hasMore
  };
};
```

---

### 1.4 Add Query Limit Guardrail

**File:** `src/utils/constants.js`

**Add:**

```javascript
// Firestore safety limits
export const FIRESTORE_LIMITS = {
  MAX_QUERY_LIMIT: 100,           // Maximum docs per query (non-admin)
  ADMIN_MAX_QUERY_LIMIT: 5000,    // Admin maintenance tasks only
  MAX_BATCH_SIZE: 500,            // Firestore batch limit
  MAX_LISTENERS: 5,               // Max concurrent real-time listeners
  CACHE_TTL_MS: 5 * 60 * 1000,    // 5 minute cache TTL
  MIN_QUERY_INTERVAL_MS: 1000,    // Rate limit between queries
};
```

---

### 1.5 Update Real-time Listener with Limit

**File:** `src/services/firebaseQueries.js`

**Change `subscribeToAllQuestions`:**

```javascript
// OLD
export const subscribeToAllQuestions = (callback, onError, queryLimit = 5000) => {

// NEW
export const subscribeToAllQuestions = (callback, onError, queryLimit = 100) => {
```

---

### Phase 1 Checklist

- [ ] Add 3 new composite indexes to `firestore.indexes.json`
- [ ] Deploy indexes with `firebase deploy --only firestore:indexes`
- [ ] Reduce `getAllQuestionsFromFirestore` default limit to 100
- [ ] Add `getQuestionsPaginated` function
- [ ] Add `FIRESTORE_LIMITS` constants
- [ ] Update `subscribeToAllQuestions` default limit to 100
- [ ] Add guardrail wrapper for queries without limits
- [ ] Test: Verify list views still work with reduced data
- [ ] Test: Verify admin maintenance tasks work with explicit high limit

---

## 🟠 Phase 2: Server-side Aggregations (HIGH PRIORITY)

### Goal: Move expensive calculations to server

### 2.1 Token Usage Aggregation via Firestore `count()` and `sum()`

**File:** `src/services/firebaseQueries.js`

**New Function:**

```javascript
import { getAggregateFromServer, count, sum } from 'firebase/firestore';

/**
 * Get token usage stats for a user using server-side aggregation.
 * MUCH cheaper than downloading all docs and filtering client-side.
 * 
 * @param {string} userId - The user's UID
 * @returns {Promise<{totalCost: number, questionCount: number}>}
 */
export const getUserTokenUsageAggregated = async (userId) => {
  if (!userId) return { totalCost: 0, questionCount: 0 };
  
  const userQuery = query(
    collection(getDb(), 'questions'),
    where('createdBy', '==', userId)
  );
  
  const snapshot = await getAggregateFromServer(userQuery, {
    totalCost: sum('estimatedCost'),
    questionCount: count()
  });
  
  const data = snapshot.data();
  
  return {
    totalCost: data.totalCost || 0,
    questionCount: data.questionCount || 0,
    // Estimate tokens (avg 500 input + 200 output per question)
    estimatedInputTokens: (data.questionCount || 0) * 500,
    estimatedOutputTokens: (data.questionCount || 0) * 200
  };
};
```

**File:** `src/App.jsx`

**Replace client-side calculation:**

```javascript
// OLD (downloads 5000 docs, filters in browser)
const firestoreTokenUsage = useMemo(
  () => getTokenUsageFromQuestions(
    databaseQuestions.filter((q) => q.createdBy === user?.uid)
  ),
  [databaseQuestions, user?.uid]
);

// NEW (1 server-side aggregation query)
const [firestoreTokenUsage, setFirestoreTokenUsage] = useState(null);

useEffect(() => {
  if (user?.uid) {
    getUserTokenUsageAggregated(user.uid).then(setFirestoreTokenUsage);
  }
}, [user?.uid]);
```

---

### 2.2 Dashboard Stats via Pre-computed Aggregate Doc

**New Collection:** `_aggregates/questionStats`

**Document Structure:**

```javascript
{
  byStatus: {
    pending: 150,
    accepted: 3800,
    rejected: 500,
    draft: 50
  },
  byDiscipline: {
    blueprints: 1200,
    materials: 800,
    animation: 600,
    // ...
  },
  totalQuestions: 4500,
  lastUpdated: Timestamp
}
```

**Cloud Function:** `functions/src/triggers/questionStatsUpdater.js`

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();

exports.updateQuestionStats = functions.firestore
  .document('questions/{questionId}')
  .onWrite(async (change, context) => {
    const statsRef = db.doc('_aggregates/questionStats');
    
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    
    const updates = {};
    
    // Handle status changes
    if (before?.status !== after?.status) {
      if (before?.status) {
        updates[`byStatus.${before.status}`] = admin.firestore.FieldValue.increment(-1);
      }
      if (after?.status) {
        updates[`byStatus.${after.status}`] = admin.firestore.FieldValue.increment(1);
      }
    }
    
    // Handle discipline changes
    if (before?.discipline !== after?.discipline) {
      if (before?.discipline) {
        updates[`byDiscipline.${before.discipline}`] = admin.firestore.FieldValue.increment(-1);
      }
      if (after?.discipline) {
        updates[`byDiscipline.${after.discipline}`] = admin.firestore.FieldValue.increment(1);
      }
    }
    
    // Handle doc creation/deletion
    if (!before && after) {
      updates.totalQuestions = admin.firestore.FieldValue.increment(1);
    } else if (before && !after) {
      updates.totalQuestions = admin.firestore.FieldValue.increment(-1);
    }
    
    updates.lastUpdated = admin.firestore.FieldValue.serverTimestamp();
    
    await statsRef.set(updates, { merge: true });
  });
```

**Client Usage:**

```javascript
// Instead of counting 5000 docs client-side:
const getQuestionStats = async () => {
  const doc = await getDoc(doc(db, '_aggregates', 'questionStats'));
  return doc.exists() ? doc.data() : null;
};
```

---

### 2.3 Backfill Script for Aggregate Doc

**File:** `scripts/backfill-question-stats.js`

```javascript
// One-time script to initialize _aggregates/questionStats from existing data
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function backfillStats() {
  const snapshot = await db.collection('questions').get();
  
  const stats = {
    byStatus: {},
    byDiscipline: {},
    totalQuestions: 0,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  };
  
  snapshot.forEach(doc => {
    const data = doc.data();
    stats.totalQuestions++;
    
    if (data.status) {
      stats.byStatus[data.status] = (stats.byStatus[data.status] || 0) + 1;
    }
    if (data.discipline) {
      stats.byDiscipline[data.discipline] = (stats.byDiscipline[data.discipline] || 0) + 1;
    }
  });
  
  await db.doc('_aggregates/questionStats').set(stats);
  console.log('Backfilled stats:', stats);
}

backfillStats();
```

---

### Phase 2 Checklist

- [ ] Add `getUserTokenUsageAggregated` function using Firestore `sum()` and `count()`
- [ ] Update `App.jsx` to use aggregated token usage instead of client-side calculation
- [ ] Create Cloud Function `updateQuestionStats` trigger
- [ ] Deploy Cloud Function
- [ ] Create `scripts/backfill-question-stats.js`
- [ ] Run backfill script to initialize aggregate doc
- [ ] Update dashboard components to read from `_aggregates/questionStats`
- [ ] Test: Verify token usage displays correctly
- [ ] Test: Verify dashboard stats update in real-time

---

## 🟡 Phase 3: Caching & Batching (MEDIUM PRIORITY)

### Goal: Reduce redundant reads and optimize writes

### 3.1 Persist Cache to IndexedDB

**New File:** `src/services/questionCache.js`

```javascript
import { openDB } from 'idb';

const DB_NAME = 'ue5-questions-cache';
const STORE_NAME = 'questions';
const META_STORE = 'meta';
const DB_VERSION = 1;

let dbPromise = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Questions store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('status', 'status');
          store.createIndex('firestoreUpdatedAt', 'firestoreUpdatedAt');
        }
        // Meta store for cache timestamps
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      }
    });
  }
  return dbPromise;
};

export const cacheQuestions = async (questions) => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all([
    ...questions.map(q => tx.store.put(q)),
    tx.done
  ]);
  
  // Update cache timestamp
  const metaTx = db.transaction(META_STORE, 'readwrite');
  await metaTx.store.put(Date.now(), 'lastCached');
};

export const getCachedQuestions = async (status = null) => {
  const db = await getDB();
  
  if (status) {
    return db.getAllFromIndex(STORE_NAME, 'status', status);
  }
  return db.getAll(STORE_NAME);
};

export const isCacheValid = async (maxAgeMs = 5 * 60 * 1000) => {
  const db = await getDB();
  const lastCached = await db.get(META_STORE, 'lastCached');
  
  if (!lastCached) return false;
  return Date.now() - lastCached < maxAgeMs;
};

export const clearCache = async () => {
  const db = await getDB();
  await db.clear(STORE_NAME);
  await db.clear(META_STORE);
};
```

**Integration:**

```javascript
// src/services/firebaseQueries.js - Update getAllQuestionsFromFirestore

import { getCachedQuestions, cacheQuestions, isCacheValid } from './questionCache';

export const getAllQuestionsFromFirestore = async (limit = 100, forceRefresh = false) => {
  // Try cache first (unless forced refresh)
  if (!forceRefresh && await isCacheValid()) {
    const cached = await getCachedQuestions();
    if (cached.length > 0) {
      logger.log(`📦 Loaded ${cached.length} questions from cache`);
      return cached;
    }
  }
  
  // Fetch from Firestore
  const questions = await fetchFromFirestore(limit);
  
  // Update cache
  await cacheQuestions(questions);
  
  return questions;
};
```

---

### 3.2 Batch Writes for Multi-question Operations

**File:** `src/hooks/questionManager/useQuestionSync.js`

**Replace N+1 writes with batch:**

```javascript
import { writeBatch, doc } from 'firebase/firestore';
import { getDb } from '../../services/firebase';
import { FIRESTORE_LIMITS } from '../../utils/constants';

const backupToCloud = async (newItems, targetSource) => {
  if (targetSource !== QUESTION_SOURCES.SESSION || !newItems?.length) return;
  
  logger.log(`💾 Batch-saving ${newItems.length} questions to Firestore...`);
  
  // Split into batches of 500 (Firestore limit)
  const batches = [];
  for (let i = 0; i < newItems.length; i += FIRESTORE_LIMITS.MAX_BATCH_SIZE) {
    batches.push(newItems.slice(i, i + FIRESTORE_LIMITS.MAX_BATCH_SIZE));
  }
  
  for (const batchItems of batches) {
    const batch = writeBatch(getDb());
    
    batchItems.forEach(q => {
      const ref = doc(getDb(), 'questions', q.uniqueId || q.id);
      batch.set(ref, q, { merge: true });
    });
    
    await batch.commit();
  }
  
  logger.log(`✓ Batch-saved ${newItems.length} questions`);
};
```

---

### 3.3 Query Rate Limiter

**New File:** `src/utils/queryRateLimiter.js`

```javascript
const lastQueryTimes = new Map();

export const rateLimitedQuery = async (queryKey, queryFn, minIntervalMs = 1000) => {
  const now = Date.now();
  const lastTime = lastQueryTimes.get(queryKey) || 0;
  
  const timeSinceLast = now - lastTime;
  
  if (timeSinceLast < minIntervalMs) {
    // Wait for the remaining time
    await new Promise(resolve => 
      setTimeout(resolve, minIntervalMs - timeSinceLast)
    );
  }
  
  lastQueryTimes.set(queryKey, Date.now());
  return queryFn();
};
```

---

### Phase 3 Checklist

- [ ] Install `idb` package: `npm install idb`
- [ ] Create `src/services/questionCache.js` with IndexedDB integration
- [ ] Update `getAllQuestionsFromFirestore` to use cache
- [ ] Implement batch writes in `useQuestionSync.js`
- [ ] Add query rate limiter utility
- [ ] Test: Verify cache persists across page refreshes
- [ ] Test: Verify batch writes work for 50+ questions
- [ ] Test: Verify rate limiting prevents query spam

---

## 🔵 Phase 4: Schema Optimization (LOWER PRIORITY)

### Goal: Reduce document size and enable field projection

### 4.1 Audit Current Document Fields

**High-value fields (needed for list views):**

- `uniqueId`, `question`, `type`, `status`, `difficulty`
- `discipline`, `critiqueScore`, `tags`, `creatorEmail`
- `firestoreUpdatedAt`

**Heavy fields (only needed on detail view):**

- `options` (~400 bytes)
- `explanation` (~500 bytes)
- `sourceExcerpt` (~1000 bytes)
- `critique` (~300 bytes)
- `translations` (~2000 bytes)

### 4.2 Option A: Field Projection (Recommended for now)

Use a custom `withConverter` to only include list fields:

```javascript
const listFieldsConverter = {
  toFirestore: (question) => question,
  fromFirestore: (snapshot) => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      uniqueId: data.uniqueId,
      question: data.question,
      type: data.type,
      status: data.status,
      difficulty: data.difficulty,
      discipline: data.discipline,
      critiqueScore: data.critiqueScore,
      tags: data.tags,
      creatorEmail: data.creatorEmail,
      firestoreUpdatedAt: data.firestoreUpdatedAt,
      // Omit heavy fields
    };
  }
};

// Usage
const q = query(
  collection(db, 'questions').withConverter(listFieldsConverter),
  limit(50)
);
```

**Note:** This doesn't reduce bandwidth (Firestore doesn't support server-side projection), but it reduces client memory usage.

### 4.3 Option B: Subcollection Split (Future)

For true bandwidth reduction, split into:

```
/questions/{id}           <- Summary doc (~300 bytes)
/questions/{id}/content   <- Heavy content
/questions/{id}/translations/{lang} <- Per-language
```

**This is a major schema change** and should be done as a separate initiative with proper migration planning.

---

### Phase 4 Checklist

- [ ] Implement `listFieldsConverter` for list queries
- [ ] Measure client memory reduction
- [ ] Document schema split strategy for future
- [ ] Create migration plan if subcollection split is approved

---

## 📈 Phase 5: Monitoring & Benchmarks (FINAL)

### Goal: Verify improvements and establish baselines

### 5.1 Performance Benchmark Script

**File:** `scripts/benchmark-firestore.js`

```javascript
const SCENARIOS = [
  { name: 'Load 50 pending questions', query: getPendingQuestions(50) },
  { name: 'Load user token usage', query: getUserTokenUsageAggregated(testUserId) },
  { name: 'Load dashboard stats', query: getQuestionStats() },
];

async function runBenchmarks() {
  for (const scenario of SCENARIOS) {
    const start = performance.now();
    await scenario.query;
    const duration = performance.now() - start;
    
    console.log(`${scenario.name}: ${duration.toFixed(2)}ms`);
  }
}
```

### 5.2 Add Performance Logging

**File:** `src/utils/perfLogger.js`

```javascript
export const logQueryPerformance = (queryName, startTime, docCount) => {
  const duration = performance.now() - startTime;
  const perDoc = docCount > 0 ? (duration / docCount).toFixed(2) : 0;
  
  console.log(`[PERF] ${queryName}: ${duration.toFixed(0)}ms for ${docCount} docs (${perDoc}ms/doc)`);
  
  // Send to analytics if needed
  if (duration > 1000) {
    console.warn(`[PERF] SLOW QUERY: ${queryName} took ${duration}ms`);
  }
};
```

### 5.3 Success Metrics

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| Reads per session | 5,000 | <200 | Firebase Console → Usage |
| Initial load latency | 2-4s | <500ms | Performance logging |
| Dashboard render | 1.5s | <200ms | React DevTools Profiler |
| Bytes per session | 15MB | <1MB | Network tab |
| Active listeners | 1 (5000 docs) | 0-1 (50 docs) | Firebase Console |

---

### Phase 5 Checklist

- [ ] Create benchmark script
- [ ] Add performance logging to key queries
- [ ] Run before/after benchmarks
- [ ] Document results
- [ ] Set up Firebase Performance Monitoring (optional)

---

## 🗓️ Implementation Timeline

```
Week 1:
├── Day 1-2: Phase 1 (Indexes + Query Limits)
├── Day 3-4: Phase 2 (Aggregations)
└── Day 5: Testing + Fixes

Week 2:
├── Day 1-2: Phase 3 (Caching + Batching)
├── Day 3: Phase 5 (Benchmarks)
└── Day 4-5: Documentation + Deploy
```

---

## ⚠️ Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Index build time (up to 30 min) | Deploy indexes first, before other changes |
| Breaking existing features | Maintain backward-compatible function signatures |
| Cache staleness | Implement cache invalidation on writes |
| Aggregate doc hot spotting | Use distributed counters if needed |

---

## ✅ Approval Checkpoints

- [ ] **Phase 1 Plan Approved** - Proceed with indexes and limits
- [ ] **Phase 1 Complete** - Proceed to Phase 2
- [ ] **Phase 2 Plan Approved** - Proceed with aggregations
- [ ] **Phase 2 Complete** - Proceed to Phase 3
- [ ] **Phase 3 Complete** - Proceed to benchmarking
- [ ] **Final Review** - Deploy to production

---

**Ready to begin Phase 1?** Please review and approve this plan.
