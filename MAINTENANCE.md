# UE5 Question Generator - Maintenance Guide

## Quick Reference

### Account & API Policy
> [!IMPORTANT]
> All API access and cloud processing MUST use the **Epic Games account** (`sam.deiter@epicgames.com`). 
> Always verify via `gcloud config list account` before running bulk scripts.

### Before Making Changes

```bash
npm test -- --run        # Run all tests (1000+ pass)
npm run dev              # Start dev server
```

### After Making Changes

```bash
npm test -- --run        # Verify nothing broke
npm run lint             # Check for code issues
git add -A && git commit -m "description"
git push origin main     # Triggers auto-deploy
```

---

## Monthly Maintenance

### 1. Update Dependencies

```bash
npm outdated             # Check for updates
npm update               # Apply safe updates
npm test -- --run        # Verify nothing broke
```

### 2. Check ESLint

```bash
npx eslint src --quiet   # Show only errors (no warnings)
```

---

## What the Tests Guard

| Test File | Purpose |
|-----------|---------|
| `SmokeTests.test.jsx` | Catches import/chunk loading errors |
| `CriticalUI.regression.test.jsx` | Ensures Reject button works |
| Component tests | Individual component behavior |
| Integration tests | Firebase save operations |

---

## Project Structure

```
src/
├── components/          # UI components
│   ├── Admin/           # Admin panel sub-components
│   ├── Analytics/       # Chart components
│   ├── Header/          # Header sub-components
│   └── QuestionItem/    # Question card sub-components
├── hooks/               # React state logic
├── services/            # Firebase & API calls
│   ├── firebase.js      # Central hub (re-exports)
│   ├── firebaseAuth.js  # Authentication
│   ├── firebaseQueries.js # Read operations
│   └── firebaseSave.js  # Write operations
└── utils/               # Pure helper functions
```

---

## When Things Break

1. **Run tests** - `npm test -- --run`
2. **Check browser console** - Look for red error messages
3. **Check terminal** - Look for build errors
4. **Ask for help** - Describe what you see

---

## Key Commands Cheat Sheet

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start local development server |
| `npm test -- --run` | Run all tests once |
| `npm run build` | Create production build |
| `npm run lint` | Check code quality |
| `git status` | See uncommitted changes |
| `git push origin main` | Deploy to GitHub Pages |
