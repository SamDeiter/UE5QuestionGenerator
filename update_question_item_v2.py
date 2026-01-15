
import os

file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\QuestionItem.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_usage = """        <SourceContextCard
          sourceUrl={q.sourceUrl}
          sourceExcerpt={q.sourceExcerpt}
          isVerified={q.humanVerified}
          verifiedBy={q.humanVerifiedBy}
          verifiedAt={q.humanVerifiedAt}
          onVerify={async () => {"""

new_usage = """        <SourceContextCard
          sourceUrl={q.sourceUrl}
          sourceExcerpt={q.sourceExcerpt}
          isVerified={q.humanVerified}
          verifiedBy={q.humanVerifiedBy}
          verifiedAt={q.humanVerifiedAt}
          showMessage={showMessage}
          onVerify={async () => {"""

content = content.replace(old_usage, new_usage)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(content)

print("QuestionItem.jsx updated to pass showMessage to SourceContextCard.")
