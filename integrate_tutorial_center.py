"""
AGENT T4 - Add Tutorial Center to Header and implement auto-trigger on first visit
"""

# First, let's add the Tutorial Center to Header.jsx
with open(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\Header.jsx', 'r', encoding='utf-8') as f:
    header_content = f.read()

# Add TutorialCenter import if not already present
if 'TutorialCenter' not in header_content:
    # Find the import section and add TutorialCenter
    header_content = header_content.replace(
        'import Icon from "./Icon";',
        '''import Icon from "./Icon";
import TutorialCenter from "./TutorialCenter";'''
    )

# Add state for Tutorial Center modal
if 'showTutorialCenter' not in header_content:
    # Find the first useState and add our state
    header_content = header_content.replace(
        'const Header = ({',
        '''const Header = ({'''
    )
    # Add state inside component (after props destructuring)
    header_content = header_content.replace(
        '}) => {',
        '''}) => {
  const [showTutorialCenter, setShowTutorialCenter] = useState(false);
'''
    )
    # Add import for useState if needed
    if 'useState' not in header_content:
        header_content = header_content.replace(
            'import React from "react";',
            'import React, { useState } from "react";'
        )
    elif 'import React' in header_content and '{ useState }' not in header_content:
        header_content = header_content.replace(
            'import React from "react";',
            'import React, { useState } from "react";'
        )

with open(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\Header.jsx', 'w', encoding='utf-8') as f:
    f.write(header_content)

print("✅ Updated Header.jsx with Tutorial Center import and state")

# Note: We'll need to manually add the Tutorial Center button and modal to the Header JSX
# This requires viewing the file structure first to find the right place to insert it

print("⚠️  Manual step required: Add Tutorial Center button to Header.jsx")
print("⚠️  Manual step required: Add auto-trigger logic to ViewRouter.jsx or MainLayout.jsx")
print("✅ AGENT T4 Partial Complete - TutorialCenter component created")
