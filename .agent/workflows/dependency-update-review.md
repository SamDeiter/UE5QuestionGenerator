---
description: 
---

**Task:** Update a single specified dependency to the latest major or minor version, ensuring no breaking changes are introduced to the existing codebase.

**Input:** The user will specify the package name and the desired version (e.g., 'Update react-router-dom to the latest minor version').

**Steps:**
1.  **Terminal Check:** Check the current version in the relevant manifest file (e.g., `package.json` or `requirements.txt`).
2.  **Analyze Changes:** Search external sources (release notes, changelogs) for known breaking changes between the current version and the target version.
3.  **Implementation Plan:** Generate an Implementation Plan artifact detailing the version number change and any required code changes to accommodate API updates (based on changelog analysis).
4.  **Execute Update:** Run the necessary terminal command (`npm install [package]@[version]` or `pip install --upgrade [package]`) and update the manifest file.
5.  **Verification:** Run all project unit tests. If any fail, attempt to resolve the test failures with the minimum necessary code changes.
6.  **Final Artifacts:** Generate a final artifact detailing the old and new version numbers, any code changes that were required, and the terminal output confirming successful installation and passing tests.

**Output Format:** Deliver the final result as a markdown artifact confirming the successful, non-breaking update.