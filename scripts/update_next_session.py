
import os

file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\docs\project-context\NEXT_SESSION.md'

new_session_header = """## 📅 Session Summary (2026-02-09)

### 🎯 Objectives Achieved
1. **Stabilized CI/Icon Infrastructure**: Fixed missing `shield-x` and `clipboard-check` mappings in `Icon.jsx`.
2. **Repaired Integration Tests**: Fixed `firebase/auth` mock regressions (`setCustomParameters`) in all major integration test suites.
3. **Hardened Translation Flow**: Added parser guards for markdown table responses and updated mock data to JSON format.
4. **Verified 100% Pass Rate**: All core tests (`InviteSignUp`, Integration, SCORM) are now passing.

### 📂 Technical Changes
| File | Change |
|------|--------|
| `src/components/Icon.jsx` | Added missing `ShieldX` and `ClipboardCheck` icons. |
| `src/__tests__/*.integration.test.jsx` | Fixed `GoogleAuthProvider` mock. |
| `src/hooks/generation/useQuestionTranslation.js` | Added markdown table parser guard. |
| `src/__tests__/testHelpers.js` | Updated translation mock to JSON format. |

### 🚀 Deployment Status
- **Git**: Changes committed and pushed to main.
- **Tests**: 100% pass rate on local environment.

### ⏭️ Next Steps
1. **Bundle Size Reduction**: Resume the plan to lazy-load authentication and large dependencies.
2. **PWA Optimizations**: Implement service worker and compression as per the optimization roadmap.
"""

with open(file_path, 'r', encoding='utf-8') as f:
    old_content = f.read()

# Insert after the main title but before the first session summary
if '# Next Session Context' in old_content:
    parts = old_content.split('##', 1)
    updated_content = parts[0].strip() + "\n\n" + new_session_header + "\n##" + parts[1]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(updated_content)
    print("NEXT_SESSION.md updated.")
else:
    print("Format not recognized.")
