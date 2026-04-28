import sys
import os

file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\utils\questionDocParser.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make creatorId optional in the validation block
old_val = """  if (!raw.creatorId || typeof raw.creatorId !== "string") {
    errors.push("Missing creatorId");
  }"""

new_val = """  // creatorId is strictly required for English base questions, 
  // but we allow variants to fallback to 'system' if missing to avoid UI grayscale flags.
  const isTranslation = raw.language && raw.language !== 'English';
  if (!raw.creatorId || typeof raw.creatorId !== "string") {
    if (!isTranslation) {
      errors.push("Missing creatorId on base question");
    } else {
      logger.warn(`Translation variant ${raw.id} missing creatorId, using fallback.`);
    }
  }"""

if old_val in content:
    content = content.replace(old_val, new_val)
else:
    print("Could not find old_val in content")
    sys.exit(1)

# Update normalization to provide fallback for creatorId
old_norm = "    creatorId: raw.creatorId,"
new_norm = "    creatorId: raw.creatorId || \"system-translation\","

if old_norm in content:
    content = content.replace(old_norm, new_norm)
else:
    print("Could not find old_norm in content")
    sys.exit(1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Successfully patched questionDocParser.js')
