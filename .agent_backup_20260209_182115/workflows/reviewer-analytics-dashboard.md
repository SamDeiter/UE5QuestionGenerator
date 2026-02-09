---
description: Implement Reviewer Activity Analytics Dashboard in Admin Panel
---

# Reviewer Activity Analytics Dashboard - Implementation Plan

## 📋 Overview

Create an admin-only analytics dashboard within the Admin Panel that tracks and displays reviewer performance metrics including question counts and average review times.

## 🎯 Requirements

1. **Metrics to Display:**
   - Number of questions reviewed by each reviewer
   - Average time taken per question review (by reviewer)
   - Total review time per reviewer
   - Recent activity timeline

2. **Access Control:**
   - Admin-only feature (already in Admin Panel)
   - Database export remains admin-restricted
   - No database import functionality needed

3. **Data Sources:**
   - Existing fields in questions collection:
     - `reviewerName` - Who reviewed the question
     - `reviewStartedAt` - When review began
     - `reviewCompletedAt` - When review was completed
     - `reviewDuration` - Duration in seconds
     - `acceptedBy` - Who accepted the question
     - `acceptedAt` - When accepted

## 🗂️ Implementation Steps

### Phase 1: Data Aggregation Service

**File:** `src/utils/reviewerAnalytics.js` (NEW)

Create utility functions to:

- Fetch all reviewed questions from Firestore
- Aggregate data by reviewer
- Calculate metrics:
  - Total questions reviewed
  - Average review duration
  - Total review time
  - Review velocity (questions/day)
  - Date range of activity

### Phase 2: Admin Panel UI Component

**File:** `src/components/AdminPanel.jsx` (EDIT)

Add new collapsible section "Reviewer Activity Analytics":

- Display reviewer metrics in a table/card layout
- Show key stats: total reviews, avg time, last active
- Include visual indicators (charts if needed)
- Add date range filter options

### 3: Cloud Function for Analytics (Optional Enhancement)

**File:** `functions/src/index.js` (OPTIONAL)

If aggregation is heavy:

- Create `getReviewerAnalytics` Cloud Function
- Pre-aggregate data server-side
- Cache results for performance

### Phase 4: Testing & Validation

- Verify correct data aggregation
- Test with multiple reviewers
- Validate date calculations
- Ensure admin-only access

## 🔒 Security Considerations

- Ensure function is only callable by admins
- Validate Firebase Auth tokens
- No PII exposure in error logs

## 📊 UI Design Notes

- Use existing AdminPanel styling (slate-800, border colors)
- Collapsible section (default: collapsed)
- Icon: `bar-chart-2` or `activity`
- Display table with sortable columns:
  1. Reviewer Name
  2. Questions Reviewed
  3. Avg Review Time
  4. Total Time Spent
  5. Last Active

## ⚡ Performance Optimization

- Use Firestore query indexes
- Implement client-side caching
- Consider pagination for large datasets
- Debounce data refresh

## 🚀 Deployment Checklist

- [ ] Create reviewerAnalytics utility
- [ ] Add UI section to AdminPanel
- [ ] Test data aggregation accuracy
- [ ] Verify admin-only access
- [ ] Update documentation
- [ ] Commit to git
- [ ] Deploy to production
