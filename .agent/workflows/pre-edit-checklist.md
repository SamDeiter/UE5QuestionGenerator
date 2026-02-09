---
description: Pre-edit checklist to consult before making any code changes
---

# Pre-Edit Checklist

**CRITICAL: Consult this checklist BEFORE making any file edits, code generation, or refactoring.**

## Step 1: Review Project Context

Before making ANY edits to project files, you MUST:

1. **Check ANCHOR_MANIFEST.md** (if it exists)
   - Verify the file you're editing is documented
   - Understand its role in the project architecture
   - Check for any known issues related to this file

2. **Check AGENTS.md** (if it exists in the root)
   - Verify if there are specific agent rules for this type of work
   - Follow any persona-specific directives

3. **Check Conversation History**
   - Review recent conversation summaries for context about this file
   - Look for any custom tools or utilities built in previous sessions

## Step 2: Apply Relevant Standards

Based on the file type, ensure you're following project-specific rules in `.agent/rules/`.

## Step 3: Proceed with Edit

Only after completing Steps 1 and 2, proceed with the file modification.

---

**This workflow exists because failing to check context has caused contradictions and errors in the past. Following this checklist prevents:**
- Telling users incorrect information about built-in vs. custom tools
- Violating existing architectural patterns
- Missing important project-specific rules
