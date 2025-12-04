---
title: Enhance AI Critique & Rewrite System
status: proposed
description: >-
  Upgrade the AI critique system to automatically suggest rewrites, explain changes, and allow users to apply them. 
  Also explicitly address "Too Easy" questions in the critique criteria.
priority: high
assignee: Antigravity
dependencies: []
tags: ['ai', 'ux', 'critique']
---

# Goal
Empower users to improve question quality efficiently by having the AI not just critique, but proactively rewrite questions and explain the improvements, with a specific focus on catching "too easy" questions.

# Implementation Plan

## 1. Update Critique Service (`src/services/gemini.js`)
- [ ] Modify `generateCritique` prompt to request JSON output.
- [ ] Structure output to include: `score`, `critique`, `rewrite` (object), and `changes` (explanation).
- [ ] **User Request**: Explicitly add "Too Easy / Lacks Depth" as a major scoring criterion to catch trivial questions.

## 2. Update Critique Display (`src/components/CritiqueDisplay.jsx`)
- [ ] Update component to accept `suggestedRewrite` and `rewriteChanges` props.
- [ ] Display "Why it was changed" (the `changes` field).
- [ ] Show a "Proposed Rewrite" section (or a diff view if possible/simple).
- [ ] Add an "Apply Rewrite" button to instantly update the question.

## 3. Update Question Item (`src/components/QuestionItem.jsx`)
- [ ] Pass `suggestedRewrite` and `rewriteChanges` to `CritiqueDisplay`.
- [ ] Implement `handleApplyRewrite` function to merge the suggested rewrite into the question state.
- [ ] Ensure the "Apply" action updates the question text, options, correct answer, and clears the critique (or marks it resolved).

## 4. Verification
- [ ] Test generating a critique.
- [ ] Verify JSON parsing works.
- [ ] Verify "Too Easy" is caught in critiques of simple questions.
- [ ] Verify "Apply Rewrite" correctly updates the UI.
