"""
Firebase Functions index.js Integration Script
Adds the sendReviewerInvites function import to index.js
"""

def integrate_sendgrid_function():
    """Add require statement for sendReviewerInvites to index.js"""
    index_path = r"C:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\functions\index.js"
    
    # Read current file
    with open(index_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already integrated
    if 'sendReviewerInvites' in content:
        print("✅ sendReviewerInvites already integrated")
        return
    
    # Add the import at the end
    import_statement = "\n// ============================================================================\n// EMAIL SENDING - SendGrid Integration\n// ============================================================================\nObject.assign(exports, require(\"./sendReviewerInvites\"));\n"
    
    updated_content = content + import_statement
    
    # Write back
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(updated_content)
    
    print("✅ Successfully added sendReviewerInvites import to index.js")
    print(f"   Total lines: {len(updated_content.splitlines())}")

if __name__ == "__main__":
    integrate_sendgrid_function()
