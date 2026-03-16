# ANCHOR_MANIFEST.md
>
> **Purpose:** Map of critical files that should be EXTENDED, not duplicated.

## Core Utilities (DO NOT DUPLICATE)

| File | Purpose | Before creating similar code... |
|------|---------|--------------------------------|
| `src/utils/normalizeQuestion.js` | Question normalization (format conversion, defaults, review tracking) | Import and use `normalizeQuestion()` |
| `src/utils/constants.js` | All magic numbers, thresholds, config values | Add new constants here |
| `src/utils/parserUtils.js` | Question parsing from Gemini response | Extend existing functions |
| `src/utils/logger.js` | Centralized logging | Use `logger.info/warn/error` |

## Services (Single Responsibility)

| File | Purpose |
|------|---------|
| `src/services/scormExporter.js` | SCORM 1.2 package generation |
| `src/services/firestoreService.js` | All Firestore CRUD operations |
| `src/services/gemini.js` | Gemini API calls |

## Key Patterns

### Question Data Flow

```
Gemini Response → parserUtils.js → normalizeQuestion.js → Firestore/UI
```

### Format Conversion (handled by normalizeQuestion.js)

- **Old format:** `options: {A, B, C, D}`, `correct: "A"`  
- **New format:** `choices: [...]`, `correctAnswer: "text"`

Both formats work - normalizeQuestion converts new→old internally.

---

*Last updated: 2026-01-26*
