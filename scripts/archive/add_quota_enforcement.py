"""
Adds quota enforcement to useGeneration.js handleGenerate function
"""
import re

file_path = r"c:\Users\sam.deiter\Documents\GitHub\UE5QuestionGenerator\src\hooks\useGeneration.js"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the handleGenerate function and add quota check after the existing checks
# Look for the line: if (config.difficulty !== 'Balanced All' && isTargetMet)...

search_pattern = r"(if \(config\.difficulty !== 'Balanced All' && isTargetMet\) \{[^}]+\})"

replacement = r"""\1

        // QUOTA ENFORCEMENT: Check if category/total quota is met
        const allQuestions = Array.from(allQuestionsMap.values()).flat();
        const quotaCheck = validateGeneration(
            config.discipline,
            config.difficulty,
            config.batchSize,
            allQuestions
        );

        if (!quotaCheck.allowed) {
            showMessage(quotaCheck.reason, 7000);
            return;
        }

        // If batch size needs to be reduced, update it
        if (quotaCheck.warning && quotaCheck.maxAllowed < config.batchSize) {
            config.batchSize = quotaCheck.maxAllowed;
            showMessage(`Batch size reduced to ${quotaCheck.maxAllowed} (quota limit). ${quotaCheck.reason}`, 7000);
        }"""

content = re.sub(search_pattern, replacement, content, flags=re.DOTALL)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Added quota enforcement to handleGenerate")
print("  - Validates before generation")
print("  - Blocks if quota met")
print("  - Reduces batch size if needed")
