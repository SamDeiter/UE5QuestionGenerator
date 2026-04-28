import subprocess, sys

files = [
    "src/utils/questionDocParser.js",
    "src/hooks/generation/useQuestionTranslation.js",
    "src/components/QuestionItem.jsx",
    "src/components/TranslationManagementView.jsx",
]

msg = "fix: translation flags - parser leniency, re-sync button, metadata copy"

r = subprocess.run(["git", "add"] + files, capture_output=True, text=True,
                   cwd=r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator")
print("ADD stdout:", r.stdout)
print("ADD stderr:", r.stderr)
if r.returncode != 0:
    sys.exit(r.returncode)

r = subprocess.run(["git", "commit", "-m", msg], capture_output=True, text=True,
                   cwd=r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator")
print("COMMIT stdout:", r.stdout)
print("COMMIT stderr:", r.stderr)
sys.exit(r.returncode)
