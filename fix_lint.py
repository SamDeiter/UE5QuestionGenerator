import re
import os

def fix_file(filepath, replacements):
    """Apply replacements to a file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        for old, new in replacements:
            content = content.replace(old, new)
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Fixed {filepath}")
            return True
        else:
            print(f"⚠ No changes needed in {filepath}")
            return False
    except Exception as e:
        print(f"✗ Error fixing {filepath}: {e}")
        return False

# Define all the fixes
fixes = [
    # Test files
    (
        r"src\__tests__\googleSheets.integration.test.jsx",
        [
            ("import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';",
             "import { render, screen, fireEvent, act } from '@testing-library/react';")
        ]
    ),
    (
        r"src\__tests__\translation.integration.test.jsx",
        [
            ("    const mockSetConfig = vi.fn();\n    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});",
             "    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});")
        ]
    ),
    # Components
    (
        r"src\components\CritiqueDisplay.jsx",
        [
            ("const CritiqueDisplay = ({ critique, score, onApplyRewrite }) => {",
             "const CritiqueDisplay = ({ critique, score, onApplyRewrite: _onApplyRewrite }) => {")
        ]
    ),
    (
        r"src\components\FilterButton.jsx",
        [
            ("const FilterButton = ({ label, isActive, onClick, color }) => {",
             "const FilterButton = ({ label, isActive, onClick }) => {")
        ]
    ),
    (
        r"src\components\GlobalModals.jsx",
        [
            ("    onSaveCustomTags,\n    onResetSettings",
             "    onSaveCustomTags")
        ]
    ),
    (
        r"src\components\QuestionItem.jsx",
        [
            ("import React, { useState, useEffect, memo } from 'react';",
             "import React, { useState, useEffect } from 'react';"),
            ("    onDelete, \n    onRewrite,",
             "    onDelete,")
        ]
    ),
    (
        r"src\components\QuestionItem\LanguageControls.jsx",
        [
            ("const LanguageControls = ({ question, onUpdateQuestion, appMode }) => {",
             "const LanguageControls = ({ question, onUpdateQuestion }) => {")
        ]
    ),
    (
        r"src\components\QuestionItem\QuestionMetadata.jsx",
        [
            ("import { getDifficultyColor, stripHtmlTags, formatTime } from '../../utils/helpers';",
             "import { getDifficultyColor, formatTime } from '../../utils/helpers';"),
            ("const QuestionMetadata = ({ question, showMessage }) => {",
             "const QuestionMetadata = ({ question }) => {")
        ]
    ),
    (
        r"src\components\QuestionItem\SourceContextCard.jsx",
        [
            ("const SourceContextCard = ({ question, sourceFile, sourceExcerpt }) => {",
             "const SourceContextCard = ({ sourceFile, sourceExcerpt }) => {")
        ]
    ),
    # Hooks
    (
        r"src\hooks\useFileHandler.js",
        [
            ("    } catch (err) {\n      console.error('Error processing file:', err);",
             "    } catch (_err) {\n      console.error('Error processing file:', _err);")
        ]
    ),
    (
        r"src\hooks\useGeneration.js",
        [
            ("      } catch (e) {\n        console.error('Error generating question:', e);",
             "      } catch (_e) {\n        console.error('Error generating question:', _e);")
        ]
    ),
    # Utils
    (
        r"src\utils\questionHelpers.js",
        [
            ("    } catch (e) {",
             "    } catch (_e) {")
        ]
    ),
]

base_path = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator"

print("Starting lint fixes...\n")
fixed_count = 0

for filepath, replacements in fixes:
    full_path = os.path.join(base_path, filepath)
    if fix_file(full_path, replacements):
        fixed_count += 1

print(f"\n✓ Fixed {fixed_count} files")
