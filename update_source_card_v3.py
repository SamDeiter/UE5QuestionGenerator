
import os

file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\QuestionItem\SourceContextCard.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add TOAST_DURATION import
if 'import { TOAST_DURATION } from "../../utils/constants";' not in content:
    content = content.replace('import { formatDate } from "../../utils/reviewerAnalytics";', 'import { formatDate } from "../../utils/reviewerAnalytics";\nimport { TOAST_DURATION } from "../../utils/constants";')

# 2. Update props to include showMessage
old_props = 'const SourceContextCard = ({\n  sourceUrl,\n  sourceExcerpt,\n  isVerified,\n  verifiedBy,\n  verifiedAt,\n  onVerify,\n}) => {'
new_props = 'const SourceContextCard = ({\n  sourceUrl,\n  sourceExcerpt,\n  isVerified,\n  verifiedBy,\n  verifiedAt,\n  onVerify,\n  showMessage,\n}) => {'
content = content.replace(old_props, new_props)

# 3. Update onClick to copy to clipboard
old_onClick = """            onClick={(e) => {
              // Note: We don't call e.preventDefault() because we WANT to open the link
              logger.log(`[SourceContextCard] Navigating to: ${cleanUrl}`);
              if (onVerify && !isVerified) {
                onVerify();
              }
            }}"""

new_onClick = """            onClick={(e) => {
              // Copy to clipboard
              if (sourceExcerpt) {
                navigator.clipboard.writeText(sourceExcerpt)
                  .then(() => {
                    if (showMessage) showMessage("📋 Excerpt copied to clipboard!", TOAST_DURATION.SHORT);
                  })
                  .catch(err => logger.error("Failed to copy excerpt:", err));
              }

              logger.log(`[SourceContextCard] Navigating to: ${cleanUrl}`);
              if (onVerify && !isVerified) {
                onVerify();
              }
            }}"""

content = content.replace(old_onClick, new_onClick)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(content)

print("SourceContextCard.jsx updated with clipboard copy.")
