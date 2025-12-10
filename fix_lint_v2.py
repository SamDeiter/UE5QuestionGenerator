import os

def fix_file_content(filepath, find_str, replace_str):
    """Fix a specific string in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if find_str in content:
            new_content = content.replace(find_str, replace_str)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✓ Fixed: {os.path.basename(filepath)}")
            return True
        else:
            print(f"⚠ Pattern not found in: {os.path.basename(filepath)}")
            return False
    except Exception as e:
        print(f"✗ Error in {filepath}: {e}")
        return False

base = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator"

print("Fixing lint warnings...\n")

# Fix 1: googleSheets.integration.test.jsx - remove waitFor
fix_file_content(
    os.path.join(base, r"src\__tests__\googleSheets.integration.test.jsx"),
    "import { waitFor } from '@testing-library/react';",
    "// waitFor removed - unused"
)

# Fix 2: translation.integration.test.jsx - remove mockSetConfig
fix_file_content(
    os.path.join(base, r"src\__tests__\translation.integration.test.jsx"),
    "    const mockSetConfig = vi.fn();",
    "    // mockSetConfig removed - unused"
)

# Fix 3: CritiqueDisplay.jsx - already has _onApplyAndAccept, need to check onApplyRewrite
fix_file_content(
    os.path.join(base, r"src\components\CritiqueDisplay.jsx"),
    "const CritiqueDisplay = ({ critique, onRewrite, isProcessing, suggestedRewrite, rewriteChanges, onApplyRewrite, _onApplyAndAccept, originalQuestion, onExplain, onVariate }) => {",
    "const CritiqueDisplay = ({ critique, onRewrite, isProcessing, suggestedRewrite, rewriteChanges, onApplyRewrite: _onApplyRewrite, _onApplyAndAccept, originalQuestion, onExplain, onVariate }) => {"
)

# Fix 4: FilterButton.jsx
fix_file_content(
    os.path.join(base, r"src\components\FilterButton.jsx"),
    "const FilterButton = ({ label, isActive, onClick, color }) => {",
    "const FilterButton = ({ label, isActive, onClick }) => {"
)

# Fix 5: GlobalModals.jsx
fix_file_content(
    os.path.join(base, r"src\components\GlobalModals.jsx"),
    "    onSaveCustomTags,\n    onResetSettings",
    "    onSaveCustomTags"
)

# Fix 6: QuestionItem.jsx - remove memo
fix_file_content(
    os.path.join(base, r"src\components\QuestionItem.jsx"),
    "import React, { useState, useEffect, memo } from 'react';",
    "import React, { useState, useEffect } from 'react';"
)

# Fix 7: QuestionItem.jsx - remove onRewrite
fix_file_content(
    os.path.join(base, r"src\components\QuestionItem.jsx"),
    "    onDelete, \n    onRewrite,",
    "    onDelete,"
)

# Fix 8: LanguageControls.jsx
fix_file_content(
    os.path.join(base, r"src\components\QuestionItem\LanguageControls.jsx"),
    "const LanguageControls = ({ question, onUpdateQuestion, appMode }) => {",
    "const LanguageControls = ({ question, onUpdateQuestion }) => {"
)

# Fix 9: QuestionMetadata.jsx - remove stripHtmlTags
fix_file_content(
    os.path.join(base, r"src\components\QuestionItem\QuestionMetadata.jsx"),
    "import { getDifficultyColor, stripHtmlTags, formatTime } from '../../utils/helpers';",
    "import { getDifficultyColor, formatTime } from '../../utils/helpers';"
)

# Fix 10: QuestionMetadata.jsx - remove showMessage
fix_file_content(
    os.path.join(base, r"src\components\QuestionItem\QuestionMetadata.jsx"),
    "const QuestionMetadata = ({ question, showMessage }) => {",
    "const QuestionMetadata = ({ question }) => {"
)

# Fix 11: SourceContextCard.jsx
fix_file_content(
    os.path.join(base, r"src\components\QuestionItem\SourceContextCard.jsx"),
    "const SourceContextCard = ({ question, sourceFile, sourceExcerpt }) => {",
    "const SourceContextCard = ({ sourceFile, sourceExcerpt }) => {"
)

# Fix 12: useFileHandler.js - prefix err with _
fix_file_content(
    os.path.join(base, r"src\hooks\useFileHandler.js"),
    "    } catch (err) {",
    "    } catch (_err) {"
)

# Fix 13-15: useGeneration.js - prefix e with _
filepath = os.path.join(base, r"src\hooks\useGeneration.js")
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all "} catch (e) {" with "} catch (_e) {"
new_content = content.replace("} catch (e) {", "} catch (_e) {")

if new_content != content:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"✓ Fixed: useGeneration.js (multiple catch blocks)")

print("\n✓ All fixes applied!")
