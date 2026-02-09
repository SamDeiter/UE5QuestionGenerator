---
title: Enhance AI Critique & Rewrite System
status: completed
description: >-
  Upgrade the AI critique system to automatically suggest rewrites, explain changes, and allow users to apply them. 
  Also explicitly address "Too Easy" questions in the critique criteria.
priority: high
assignee: Antigravity
dependencies: []
tags: ['ai', 'ux', 'critique']
completed_date: 2025-12-10
---

# Goal
Empower users to improve question quality efficiently by having the AI not just critique, but proactively rewrite questions and explain the improvements, with a specific focus on catching "too easy" questions.

# Implementation Plan

## 1. Update Critique Service (`src/services/gemini.js`)
- [x] Modify `generateCritique` prompt to request JSON output.
- [x] Structure output to include: `score`, `critique`, `rewrite` (object), and `changes` (explanation).
- [x] **User Request**: Explicitly add "Too Easy / Lacks Depth" as a major scoring criterion to catch trivial questions.

## 2. Update Critique Display (`src/components/CritiqueDisplay.jsx`)
- [x] Update component to accept `suggestedRewrite` and `rewriteChanges` props.
- [x] Display "Why it was changed" (the `changes` field).
- [x] Show a "Proposed Rewrite" section with word-level diff view.
- [x] Add an "Apply Rewrite" button to instantly update the question.

## 3. Update Question Item (`src/components/QuestionItem.jsx`)
- [x] Pass `suggestedRewrite` and `rewriteChanges` to `CritiqueDisplay`.
- [x] Implement `handleApplyRewrite` function to merge the suggested rewrite into the question state.
- [x] Ensure the "Apply" action updates the question text, options, correct answer, and clears the critique (or marks it resolved).

## 4. Verification
- [x] Test generating a critique.
- [x] Verify JSON parsing works.
- [x] Verify "Too Easy" is caught in critiques of simple questions (deducts 20 points).
- [x] Verify "Apply Rewrite" correctly updates the UI.
