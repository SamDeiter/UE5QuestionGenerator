# Update exportUtils.js to include rejection data in CSV exports

with open('src/utils/exportUtils.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Update headers to include rejection data
old_headers = '''const headers = ["ID", "Question ID", "Discipline", "Type", "Difficulty", "Question", "Option A", "Option B", "Option C", "Option D", "Correct Answer", "Generation Date", "Source URL", "Source Excerpt", "Creator", "Reviewer", "Language", "Quality Score", "AI Critique", "Token Cost"];'''

new_headers = '''const headers = ["ID", "Question ID", "Discipline", "Type", "Difficulty", "Question", "Option A", "Option B", "Option C", "Option D", "Correct Answer", "Generation Date", "Source URL", "Source Excerpt", "Creator", "Reviewer", "Language", "Quality Score", "AI Critique", "Token Cost", "Status", "Rejection Reason", "Rejected At"];'''

content = content.replace(old_headers, new_headers)

# Update row data to include rejection data
old_row = '''row.tokenCost || ""
        ];'''

new_row = '''row.tokenCost || "",
            row.status || "pending",
            row.rejectionReason || "",
            row.rejectedAt || ""
        ];'''

content = content.replace(old_row, new_row)

with open('src/utils/exportUtils.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated exportUtils.js with rejection data columns')
