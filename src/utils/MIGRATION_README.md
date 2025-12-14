## Database Migration: Fix Auto-Accepted Questions

### Problem
41 questions in Firestore have `status: "accepted"` but were never manually reviewed. They need to be reset to `status: "pending"`.

### Solution
Run the migration script once to fix all improperly accepted questions.

### How to Run

1. **In Browser Console** (when signed in as admin):
   ```javascript
   // Import and run migration
   const { migrateAutoAcceptedQuestions } = await import('./utils/migrateAutoAccepted.js');
   const result = await migrateAutoAcceptedQuestions();
   console.log('Migration result:', result);
   ```

2. **Expected Output**:
   ```
   🔄 Starting migration: Fixing auto-accepted questions...
   📝 Fixing question abc123 - was auto-accepted
   📝 Fixing question def456 - was auto-accepted
   ...
   ✅ Migration complete: Fixed 41 of 41 questions
   ```

### What It Does
- Finds all questions with `status: "accepted"` AND no `reviewCompletedAt` timestamp
- Changes their status back to `"pending"`
- Adds migration markers (`migratedAt`, `migrationReason`)
- Leaves manually reviewed questions untouched

### Safety
- Only affects questions that were auto-accepted (no review timestamp)
- Does NOT modify questions that were properly reviewed by a user
- Can be run multiple times safely (idempotent)
