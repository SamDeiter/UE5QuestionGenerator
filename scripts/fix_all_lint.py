import os
import re

filepath = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\hooks\useGeneration.js"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix all instances where we have `} catch (_e) {` but then reference `e` in the block
# We need to change _e back to e where it's actually used

# Line 362-363: } catch (_e) { console.warn(..., e);
content = content.replace(
    '} catch (_e) {\n                        console.warn(`Failed to critique question ${question.id}:`, e);',
    '} catch (e) {\n                        console.warn(`Failed to critique question ${question.id}:`, e);'
)

# Line 458-459: } catch (_e) { console.warn(..., e);
content = content.replace(
    '} catch (_e) {\n                console.warn("JSON parse failed, trying parseQuestions fallback", e);',
    '} catch (e) {\n                console.warn("JSON parse failed, trying parseQuestions fallback", e);'
)

# Line 487-490: } catch (_e) { console.error(..., e); ... e.message
content = content.replace(
    '} catch (_e) {\n            console.error("Translation error:", e);\n            setStatus(\'Translation Failed\');\n            showMessage(`Translation Failed: ${e.message}`, 5000);',
    '} catch (e) {\n            console.error("Translation error:", e);\n            setStatus(\'Translation Failed\');\n            showMessage(`Translation Failed: ${e.message}`, 5000);'
)

# Line 575-578: } catch (_e) { console.error(..., e); ... e.message
content = content.replace(
    '} catch (_e) {\n            console.error("Critique failed:", e);\n            setStatus(\'Fail\');\n            showMessage(`Critique Failed: ${e.message}`, 5000);',
    '} catch (e) {\n            console.error("Critique failed:", e);\n            setStatus(\'Fail\');\n            showMessage(`Critique Failed: ${e.message}`, 5000);'
)

# Line 678-679: } catch (_e) { console.error(..., e);
content = content.replace(
    '} catch (_e) {\n                console.error(`Failed to generate translation for ${q.uniqueId} to ${targetLang}:`, e);',
    '} catch (e) {\n                console.error(`Failed to generate translation for ${q.uniqueId} to ${targetLang}:`, e);'
)

# Now remove _e where it's NOT used (lines 505, 524, 654)
# These are simple catch blocks with no reference to the error
lines = content.split('\n')
new_lines = []

for i, line in enumerate(lines):
    # Check if this is a catch block with _e that's not used
    if '} catch (_e) {' in line:
        # Look ahead to see if _e is referenced in the next few lines
        next_lines = '\n'.join(lines[i:min(i+5, len(lines))])
        if '_e' not in next_lines.replace('} catch (_e) {', ''):
            # _e is not used, remove it
            line = line.replace('} catch (_e) {', '} catch {')
    new_lines.append(line)

content = '\n'.join(new_lines)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Fixed useGeneration.js")

# Now fix the other files
fixes = [
    (
        r"src\components\QuestionItem.jsx",
        [
            ("    onDelete,\n    onRewrite,", "    onDelete,")
        ]
    ),
    (
        r"src\components\QuestionItem\LanguageControls.jsx",
        [
            ("    isProcessing,\n    appMode", "    isProcessing")
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
    (
        r"src\hooks\useFileHandler.js",
        [
            ("    } catch (_err) {", "    } catch {")
        ]
    ),
]

base = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator"

for filepath_rel, replacements in fixes:
    full_path = os.path.join(base, filepath_rel)
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        for old, new in replacements:
            content = content.replace(old, new)
        
        if content != original:
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Fixed: {os.path.basename(full_path)}")
    except Exception as e:
        print(f"✗ Error in {filepath_rel}: {e}")

print("\n✓ All fixes complete!")
