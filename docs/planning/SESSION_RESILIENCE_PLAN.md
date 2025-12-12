# Session Management & Connection Resilience Plan

## Current State

- Questions are stored in localStorage (persists across page reloads)
- Questions auto-sync to Firestore on generation/modification (cloud backup)
- Multi-tab sync via localStorage `storage` event listener (just added)

## Scenarios & Solutions

### 1. Multiple Tabs Open (Same User)

**Current:** ✅ Implemented

- localStorage changes trigger `storage` event in other tabs
- All tabs automatically sync when one tab makes changes
- Last-write-wins for simultaneous edits (acceptable for single user)

### 2. Bad Internet Connection / Connection Drop

**Current:** Partial coverage

- Firestore writes may fail silently
- localStorage keeps working offline

**Proposed Improvements:**

1. **Offline Queue**: Queue failed Firestore writes and retry when connection restores
2. **Connection Status Indicator**: Show online/offline badge in header
3. **Sync Status**: Show "Saved ✓" or "Saving..." or "Offline - will sync later"

**Implementation:**

```javascript
// Add to firebase.js
let offlineQueue = [];

export const saveWithRetry = async (question) => {
    try {
        await saveQuestionToFirestore(question);
        return { success: true };
    } catch (err) {
        offlineQueue.push({ question, timestamp: Date.now() });
        console.warn('Queued for later sync:', question.uniqueId);
        return { success: false, queued: true };
    }
};

// Retry queue when online
window.addEventListener('online', async () => {
    console.log('🌐 Back online, syncing queued items...');
    for (const item of offlineQueue) {
        await saveQuestionToFirestore(item.question);
    }
    offlineQueue = [];
});
```

### 3. Same User Logs In Twice (Different Devices/Browsers)

**Current:** No protection

- Both instances would operate independently
- Cloud has latest data, but local states differ

**Proposed Solutions:**

#### Option A: Lock Session (Strict)

- Use Firestore to track active session with heartbeat
- New login kicks out old session or is blocked
- Show "Another session is active" modal

#### Option B: Merge on Conflict (Collaborative)

- Each device works independently
- On next cloud sync, merge questions by uniqueId
- Newer timestamp wins for conflicts
- Show "Synced X new questions from cloud" message

#### Option C: Read-Only Mode for Secondary Sessions

- First session is "primary" (can edit)
- Other sessions are "read-only" until primary closes
- Show banner: "Read-only: Another session is active"

**Recommended: Option B (Merge)** - Most user-friendly, no data loss

### 4. Browser Crash During Generation

**Current:** ✅ Covered

- Auto-save to Firestore on each question generation
- On restart, can restore from Firestore

### 5. Page Refresh During Editing

**Current:** ✅ Covered

- localStorage saves on every state change
- State restored on page load

---

## Implementation Priority

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| ✅ Done | Multi-tab localStorage sync | Low | High |
| 🟡 P1 | Connection status indicator | Low | Medium |
| 🟡 P1 | Offline queue with retry | Medium | High |
| 🟢 P2 | Sync status badge ("Saved ✓") | Low | Medium |
| 🟢 P2 | Merge conflicts on cloud sync | Medium | Medium |
| 🔵 P3 | Session locking/detection | Medium | Low |

---

## Quick Wins for Next Session

1. **Add online/offline listener to show status**

```javascript
const [isOnline, setIsOnline] = useState(navigator.onLine);
useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}, []);
```

2. **Show indicator in Header component**

```jsx
{!isOnline && (
    <span className="bg-yellow-500 text-black px-2 py-0.5 rounded text-xs font-bold animate-pulse">
        OFFLINE
    </span>
)}
```
