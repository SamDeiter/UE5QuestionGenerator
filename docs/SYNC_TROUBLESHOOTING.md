# 🔧 Review Sync Troubleshooting Guide

If your reviews aren't saving or showing in analytics, follow these steps.

---

## Step 1: Check for Queued Items

1. Open browser DevTools: Press **F12**
2. Click the **Console** tab
3. Paste and run this command:

```javascript
localStorage.getItem('ue5_offline_queue')
```

**If you see `null`** → Your queue is empty, skip to Step 3  
**If you see data** → Your reviews are queued! Continue to Step 2

---

## Step 2: View Queued Items

Run this in the console to see what's queued:

```javascript
const queue = JSON.parse(localStorage.getItem('ue5_offline_queue') || '[]');
console.log('Total queued:', queue.length);
queue.forEach(item => console.log('→', item.question?.uniqueId?.slice(0,8), item.question?.status));
```

This shows how many reviews are waiting to sync.

---

## Step 3: Refresh Your Authentication

This is the most important step:

1. Click your **avatar** in the top-right corner
2. Click **Sign Out**
3. Wait 3 seconds
4. Click **Sign in with Google**
5. Complete the sign-in

---

## Step 4: Watch for Sync Messages

After logging back in, watch the console for these messages:

| Message | Meaning |
|---------|---------|
| `✓ Synced queued item: xxx` | ✅ Review saved successfully! |
| `Processing X queued items...` | ✅ Sync in progress |
| `Failed to sync xxx` | ❌ Still having issues |
| `PERMISSION_DENIED` | ❌ Auth token problem |

---

## Step 5: If Sync Still Fails

If your reviews won't sync after logging in:

1. **Copy the queue data** from Step 2 output (screenshot or copy text)
2. **Contact Sam** with the error messages
3. **Re-review the questions** manually as a last resort

---

## Prevention Tips

- **Don't leave the tab open for hours** without activity
- **Refresh the page** every 30-60 minutes during long sessions
- **Watch for the sync icon** in the header (⚠️ warning sign = connection issue)

---

*Last updated: December 30, 2025*
