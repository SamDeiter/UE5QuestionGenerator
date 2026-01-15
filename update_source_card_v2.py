
import os

file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\QuestionItem\SourceContextCard.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'import { formatDate } from "../../utils/reviewerAnalytics";' not in content:
    content = content.replace('import { logger } from "../../utils/logger";', 'import { logger } from "../../utils/logger";\nimport { formatDate } from "../../utils/reviewerAnalytics";')

# Update formatting
content = content.replace('{new Date(verifiedAt || Date.now()).toLocaleDateString()}', '{formatDate(verifiedAt)}')

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(content)

print("SourceContextCard.jsx updated to use formatDate.")
