
import os

file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\QuestionItem.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_usage = """        <SourceContextCard
          sourceUrl={q.sourceUrl}
          sourceExcerpt={q.sourceExcerpt}
          isVerified={q.humanVerified}
          question={q.question}
        />"""

new_usage = """        <SourceContextCard
          sourceUrl={q.sourceUrl}
          sourceExcerpt={q.sourceExcerpt}
          isVerified={q.humanVerified}
          verifiedBy={q.humanVerifiedBy}
          verifiedAt={q.humanVerifiedAt}
          onVerify={async () => {
            if (!onUpdateQuestion) return;
            await onUpdateQuestion(q.id, {
              humanVerified: true,
              humanVerifiedBy: userEmail || "Unknown",
              humanVerifiedAt: new Date().toISOString(),
            });
            logAuditEvent(q.uniqueId || q.id, AUDIT_ACTIONS.QUESTION_VERIFIED, {
              oldValue: q.humanVerified,
              newValue: true,
              verifiedBy: userEmail,
              source: "source_context_card"
            });
            if (showMessage) showMessage("✅ Source verified!", TOAST_DURATION.SHORT);
          }}
          question={q.question}
        />"""

content = content.replace(old_usage, new_usage)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(content)

print("QuestionItem.jsx updated successfully.")
