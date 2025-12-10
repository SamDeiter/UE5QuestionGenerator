"""
Script to help extract and analyze the handleGenerate function from useGeneration.js
"""

# Read the file
with open(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\hooks\useGeneration.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Extract handleGenerate function (lines 115-419, but 1-indexed so 114-418 in 0-indexed)
handle_generate = lines[114:419]

print(f"handleGenerate function is {len(handle_generate)} lines long")
print("\nFirst 10 lines:")
for i, line in enumerate(handle_generate[:10], start=115):
    print(f"{i}: {line}", end='')

print("\n\nLast 10 lines:")
for i, line in enumerate(handle_generate[-10:], start=410):
    print(f"{i}: {line}", end='')
