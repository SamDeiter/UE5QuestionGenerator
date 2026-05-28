# 🔧 Migration Scripts

This directory contains database migration and maintenance scripts for the UE5QuestionGenerator.

## Prerequisites

1. **Python 3.7+** installed (for Python scripts)
2. **Node 20+** installed (for JS scripts)
3. **Firebase Admin SDK** installed:

   ```bash
   pip install firebase-admin              # Python scripts
   npm install                             # JS scripts (firebase-admin in devDependencies)
   ```

4. **Service Account Key** — download from Firebase Console and save somewhere outside the repo.

### Getting Your Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → **Project Settings**
4. Navigate to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save it OUTSIDE the repository (e.g., `~/Downloads/ue5-questions-prod-admin-sdk.json`)
7. **⚠️ NEVER commit this file to git**

## Canonical SA-Key Convention (JS scripts)

All JavaScript maintenance scripts in this directory expect the service-account
key path via the `GOOGLE_APPLICATION_CREDENTIALS` environment variable. This is
the [Google ADC](https://cloud.google.com/docs/authentication/application-default-credentials)
convention and is what the `firebase-admin/app` `applicationDefault()` call
picks up automatically.

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
node scripts/backfill_human_verified.js --dry-run
```

Setting it this way means:

- No file path is hard-coded inside any script (the previous convention
  required dropping the key at `config/serviceAccountKey.json`, which is
  the same directory as the firestore rules — easy to commit by accident).
- The same key can serve every script.
- The CI runner can supply credentials via a workload identity step
  without rewriting scripts.

---

## Available Scripts

### `add_version_to_questions.py`

**Purpose**: Add `version: 1` field to all existing questions in Firestore for concurrent editing protection.

**When to run**: Before enabling concurrent editing features (one-time migration).

**Usage**:

```bash
# Dry run (see what would change without making changes)
python scripts/add_version_to_questions.py --dry-run

# Apply changes (adds version field to all questions)
python scripts/add_version_to_questions.py

# Verify migration was successful
python scripts/add_version_to_questions.py --verify-only

# Custom batch size (default: 500)
python scripts/add_version_to_questions.py --batch-size 100
```

**Expected Output**:

```
============================================================
FIRESTORE VERSION MIGRATION SCRIPT
============================================================
Mode: LIVE UPDATE
Batch size: 500
Timestamp: 2025-12-18 15:45:00
============================================================

Fetching all questions from Firestore...
  + question-abc123: Adding version: 1
  + question-def456: Adding version: 1
  ✓ question-xyz789: Already has version 1

Committing batch of 500 updates...
Batch committed successfully

============================================================
MIGRATION SUMMARY
============================================================
Total questions found:          523
Already have version field:     0
Updated:                        523
============================================================

✅ Migration completed successfully!
   523 questions now have version: 1

============================================================
VERIFICATION
============================================================
✅ All questions have a version field

Sample questions:
  question-abc123: version = 1
  question-def456: version = 1
  question-xyz789: version = 1
```

**Safety Features**:

- ✅ Dry-run mode to preview changes
- ✅ Batch processing to avoid timeouts
- ✅ Verification step to confirm success
- ✅ Doesn't overwrite existing version fields

---

### `validate-firestore-fields.js`

**Purpose**: Parse Firestore rules and generate a list of allowed reviewer fields. Validates that code updates match the rules.

**When to run**: Before deploying new features that update question fields, or as part of CI.

**Usage**:

```bash
# Run validation and generate allowedFields.generated.js
node scripts/validate-firestore-fields.js

# Or use npm script (after adding to package.json)
npm run validate:rules
```

**What it does**:

1. Parses `config/firestore/firestore.rules` for the `.hasOnly()` field list
2. Extracts all allowed reviewer update fields
3. Generates `src/utils/allowedFields.generated.js` with:
   - `REVIEWER_ALLOWED_FIELDS` - Array of allowed field names
   - `isFieldAllowed(fieldName)` - Check if a field is allowed
   - `filterToAllowedFields(object)` - Filter an object to only allowed fields

**Expected Output**:

```
🔍 Validating Firestore rules...
✓ Read rules file: config/firestore/firestore.rules
✓ Found 45 allowed fields

📋 Allowed Reviewer Fields:
──────────────────────────────────────────────────
    1. status
    2. humanVerified
   ...
   45. notes
──────────────────────────────────────────────────

✓ Generated: src/utils/allowedFields.generated.js

✅ Firestore rules validation complete!
```

---

## Troubleshooting

### Error: `firebase-admin package not installed`

**Solution**:

```bash
pip install firebase-admin
```

### Error: `serviceAccountKey.json not found`

**Solution**: Follow the "Getting Your Service Account Key" instructions above.

### Error: `Permission denied`

**Solution**: Ensure your service account has **Cloud Datastore User** or **Editor** role in IAM.

### Questions finish but verification fails

**Solution**: Wait a few seconds for Firestore to propagate changes, then run:

```bash
python scripts/add_version_to_questions.py --verify-only
```

---

## Post-Migration Checklist

After running the migration:

- [ ] Run verification to confirm all questions have `version: 1`
- [ ] Deploy updated Firestore Security Rules (enforce version incrementing)
- [ ] Deploy updated client code (agents + UI changes)
- [ ] Test concurrent editing with two browser tabs
- [ ] Monitor audit log for `save_conflict` events

---

## Future Scripts (Planned)

- `cleanup_expired_locks.py` - Remove locks older than 5 minutes
- `audit_log_export.py` - Export audit logs to CSV for analysis
- `revert_version_migration.py` - Rollback migration (for testing)

---

**Questions?** Check the main `PRODUCTION_READINESS_ROADMAP.md` for full context.
