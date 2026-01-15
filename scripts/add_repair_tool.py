"""Add Repair Status tool to DataMaintenance.jsx"""
import re

file_path = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\Admin\DataMaintenance.jsx"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add the import
import_line = 'import { logger } from "../../utils/logger";'
new_import = 'import { logger } from "../../utils/logger";\nimport { normalizeStatus } from "../../utils/questionHelpers";'
content = content.replace(import_line, new_import)

# 2. Add the repair function after API_RATE_LIMIT_MS
repair_function = '''
/**
 * Repair question statuses: Normalize statuses (e.g., "Approved" -> "accepted")
 * and backfill missing firestoreUpdatedAt timestamps.
 */
async function repairStatuses(onProgress, dryRun = false) {
  const snapshot = await getDocs(collection(db, "questions"));

  const questionsToFix = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const currentStatus = data.status;
    const normalizedStatus = normalizeStatus(currentStatus);
    const needsTimestamp = !data.firestoreUpdatedAt;

    if (currentStatus !== normalizedStatus || needsTimestamp) {
      questionsToFix.push({
        id: docSnap.id,
        currentStatus,
        normalizedStatus,
        needsTimestamp,
      });
    }
  });

  onProgress(
    `Found ${questionsToFix.length} questions with status/timestamp issues`
  );

  if (dryRun || questionsToFix.length === 0) {
    return { updated: 0, total: questionsToFix.length, dryRun };
  }

  const batchSize = 500;
  let updated = 0;

  for (let i = 0; i < questionsToFix.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = questionsToFix.slice(i, i + batchSize);

    chunk.forEach((item) => {
      const ref = doc(db, "questions", String(item.id));
      const updates = { status: item.normalizedStatus };
      if (item.needsTimestamp) {
        updates.firestoreUpdatedAt = new Date().toISOString();
      }
      batch.update(ref, updates);
    });

    await batch.commit();
    updated += chunk.length;
    onProgress(`Repaired ${updated}/${questionsToFix.length}...`);
  }

  return { updated, total: questionsToFix.length, dryRun: false };
}

'''

# Find the position after API_RATE_LIMIT_MS
api_rate_pattern = r'const API_RATE_LIMIT_MS = 4000;'
content = re.sub(
    api_rate_pattern,
    r'const API_RATE_LIMIT_MS = 4000;' + repair_function,
    content,
    count=1
)

# 3. Add the handler function (after handleRestoreKickedBack)
handler_function = '''

  const handleRepairStatuses = async (dryRun = false) => {
    setProcessing(true);
    setProgress("Auditing question statuses and timestamps...");
    setLastResult(null);

    try {
      const result = await repairStatuses(setProgress, dryRun);
      setLastResult(result);
      if (dryRun) {
        showMessage(
          `🔍 DRY RUN: ${result.total} questions need repair`,
          5000
        );
      } else {
        showMessage(`✅ Repaired ${result.updated} questions!`, 5000);
      }
    } catch (error) {
      logger.error("Repair failed:", error);
      showMessage(`❌ Failed: ${error.message}`, 5000);
    } finally {
      setProcessing(false);
      setProgress("");
    }
  };
'''

# Find handleRestoreKickedBack and add after it
restore_pattern = r'(const handleRestoreKickedBack = async \(dryRun = false\) => \{[^}]+\}[^}]+\};)'
content = re.sub(
    restore_pattern,
    r'\1' + handler_function,
    content,
    count=1,
    flags=re.DOTALL
)

# 4. Add the UI section
ui_section = '''
        {/* STATUS REPAIR TOOL (CRITICAL) - Fixes "Other" Statuses */}
        <div className="p-3 bg-emerald-950/30 rounded border-2 border-emerald-700/50">
          <h4 className="text-sm font-bold text-emerald-200 mb-2 flex items-center gap-2">
            <Icon name="shield-check" size={14} className="text-emerald-400" />
            🛡️ Repair Statuses & Timestamps
          </h4>
          <p className="text-xs text-emerald-300/80 mb-3">
            Fix non-standard statuses (e.g., "Approved" → "accepted") and backfill
            missing firestoreUpdatedAt timestamps. Resolves "Other" status issues.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleRepairStatuses(true)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-50"
            >
              Dry Run (Count)
            </button>
            <button
              onClick={() => handleRepairStatuses(false)}
              disabled={processing}
              className="px-3 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold disabled:opacity-50"
            >
              Repair All
            </button>
          </div>
        </div>

'''

# Add UI before "FIX MISSING AI SCORES"
ui_pattern = r'(\s+{/\* FIX MISSING AI SCORES - Pipeline Fix \(CRITICAL\) \*/})'
content = re.sub(ui_pattern, ui_section + r'\1', content, count=1)

# Write the modified content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully added Repair Status tool to DataMaintenance.jsx")
