---
description: Rapid bug fix workflow - skip planning overhead for simple, localized changes
---

# Quick Fix Workflow

Invoke with `/quick-fix` for simple bug fixes that don't require full planning.

## When to Use

✅ **Use Quick Fix when:**

- Single file change (or 2-3 closely related files)
- No architectural impact
- Clear reproduction steps exist
- Fix is obvious once bug is understood

❌ **Don't use when:**

- Multiple unrelated files affected
- Database schema changes needed
- New dependencies required
- You're unsure of the root cause

---

## Process

### 1. Understand the Bug

// turbo
Read any error messages, logs, or user description. Identify the file(s) involved.

### 2. Reproduce

// turbo
Confirm the bug exists:

- Check browser console
- Check terminal output
- Verify the exact steps to trigger

### 3. Root Cause Analysis

Before fixing, identify **why** the bug exists:

- Off-by-one error?
- Missing null check?
- Race condition?
- Typo?

### 4. Implement Fix

// turbo
Make the minimal change to fix the issue. Follow `ANCHOR_MANIFEST.md` standards.

### 5. Verify Fix

// turbo

- Confirm the bug no longer reproduces
- Check for console errors/warnings
- Ensure no regressions in related functionality

### 6. Commit

// turbo

```bash
git add -A
git commit -m "fix: [concise description of what was fixed]"
```

---

## Output

Brief summary of:

- What was broken
- Why it was broken  
- What was changed to fix it
