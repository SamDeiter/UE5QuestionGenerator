# UE5 Question Generator - Reviewer Onboarding Guide

## 1. Introduction

Welcome to the UE5 Question Generator! This AI-powered tool helps create and review high-quality Unreal Engine 5 assessment questions. As a reviewer, you play a critical role in ensuring our question bank is accurate, clear, and instructionally sound.

### Your Role

- **Verify accuracy**: Ensure questions reflect current UE5 best practices
- **Improve quality**: Identify unclear wording or ambiguous answers
- **Ensure fairness**: Confirm difficulty levels match question complexity
- **Maintain standards**: Accept excellent questions, reject poor ones

---

## 2. System Requirements

- **Browser**: Chrome or Edge (latest version recommended)
- **Account**: Google account for authentication
- **Internet**: Stable connection required (cloud-based tool)
- **Screen**: Minimum 1280x720 resolution recommended

---

## 3. Signing Up With Your Invite Link

### Step-by-Step

1. **Check your email** for the invite link (format: `https://samdeiter.github.io/UE5QuestionGenerator/?invite=XXXXX&email=your.email@example.com`)
2. **Click the link** (opens in browser)
3. **Verify** your email is pre-filled correctly
4. **Click "Sign in with Google"**
5. **Select** your Google account
6. **Grant permissions** when prompted
7. **Redirected** to the main application

### What You'll See

- Your name in the top-right corner with an **indigo "REVIEWER"** badge
- Navigation tabs: **Review**, **Database**, **Analytics**
- No access to Create, Test, Prompt Lab, or Admin tabs

---

## 4. Understanding Your Permissions

### What Reviewers CAN Do ✅

- **Review Mode**: View, critique, accept, and reject questions
- **Database View**: Browse all questions, view details, kick back to review
- **Analytics**: View metrics, quality scores, and generation trends
- **Translations**: Switch between existing translations to review different languages

### What Reviewers CANNOT Do ❌

- **Create Mode**: Cannot generate new questions (tab hidden)
- **Admin Panel**: Cannot manage users or create invites (tab hidden)
- **Translation Generation**: Cannot create new translations (buttons disabled)
- **Test Mode**: Cannot create or export tests (tab hidden)

---

## 5. Navigating the Application

### Review Mode (Your Primary Workspace)

**Purpose**: Verify question quality and accuracy

**Layout**:

- **Discipline filter** (top toolbar) - Select topic area
- **Question card** (center) - Displays current question
- **Navigation buttons** (bottom) - Prev/Next to move between questions
- **Action buttons** (bottom) - Critique, Edit, Accept, Reject

**Key Features**:

- Filter by status: Pending, Accepted, Rejected, All
- Search questions by text
- Filter by tags (e.g., "Blueprints", "Lighting", "Materials")
- Sort by newest, oldest, language, discipline, difficulty

### Database View

**Purpose**: Browse all accepted questions

**Features**:

- View all questions in the database
- Search and filter capabilities
- View detailed question metadata
- Edit questions or kick back to review for re-evaluation

### Analytics

**Purpose**: Track quality metrics and generation trends

**Tabs**:

- **Disciplines**: Question counts by topic area
- **Quality Scores**: AI score distributions (Excellent/Good/Needs Work)
- **Costs**: Token usage and API cost tracking
- **Trends**: Generation activity over time

---

## 6. How To Review Questions

### Step 1: Select Discipline

Use the **Discipline** dropdown in the toolbar to filter questions by topic:

- Worldbuilding
- Game Dev
- Look Dev
- Tech Art
- VFX
- Animation
- Programming

**Tip**: Focus on one discipline at a time for consistency.

### Step 2: Read Question Carefully

Review each element:

- **Question text**: Check for clarity and accuracy
- **Answer options**: Verify correct answer is marked with ✓
- **Difficulty**: Confirm it matches question complexity (Beginner/Intermediate/Advanced/Expert)
- **Source URL**: Verify it links to official UE5 documentation

### Step 3: Use AI Critique

Click the **Critique** button to get AI analysis:

**AI Score Interpretation**:

- **75-100**: Excellent, ready to accept
- **50-74**: Good, minor improvements possible
- **Below 50**: Needs significant improvement

The AI provides:

- Current quality score
- Improved score estimate
- Suggested rewrite
- Specific improvement recommendations

### Step 4: Make Your Decision

#### Accept (Green Button)

Use when question is:

- Accurate and factually correct
- Clear and unambiguous
- Well-written with good answer options
- Appropriate difficulty level

**Effect**: Question moves to "Accepted" status and is ready for export.

#### Reject (Red Button)

Use when question has issues. **Must select reason**:

- **Inaccurate information**: Factually wrong or outdated
- **Too easy/hard**: Difficulty mismatch
- **Ambiguous wording**: Unclear or confusing
- **Poor answer options**: Distractors are too obvious or incorrect
- **Outdated**: Refers to old UE version or deprecated features

**Effect**: Question moves to "Rejected" status. Provide brief explanation in notes field to help improve future generation.

### Step 5: Apply Improvements (Optional)

If AI suggests good changes:

1. Click **"Apply Improvements"** in the critique modal
2. Review the rewritten version
3. Accept or reject the improved version

**Note**: You can also manually edit questions using the **Edit** button.

---

## 7. Keyboard Shortcuts

- **Arrow Right (→)**: Next question
- **Arrow Left (←)**: Previous question
- **Esc**: Close modals/tutorial
- **Space**: Expand question details

---

## 8. Translation Review

Questions may have multiple language versions. To review translations:

1. Look for the **language dropdown** on the question card
2. Select a language (e.g., Spanish, French, German)
3. Review the translated question and answers
4. Verify translation accuracy and cultural appropriateness
5. Accept or reject the translation

**Note**: You cannot generate new translations, only review existing ones.

---

## 9. Troubleshooting & FAQ

### Q: I can't see the "Create" tab

**A**: This is correct. Reviewers do not have access to question generation.

### Q: Translation buttons are grayed out

**A**: Reviewers cannot generate new translations, only view existing ones.

### Q: How many questions should I review?

**A**: Aim for quality over quantity. A thorough review of 20-30 questions per week is a good target.

### Q: What if I find a question with incorrect information?

**A**: Reject it and select "Inaccurate information" as the reason. Add specific details in the notes field (e.g., "Incorrect: Lumen is not available in UE4, only UE5").

### Q: Can I edit questions directly?

**A**: Yes, click the **Edit** button to modify question text, answers, or metadata.

### Q: How do I know if my reviews are saved?

**A**: All actions auto-save to the cloud. You'll see a green "CLOUD" status in the header footer. If you see "LOCAL" with a red dot, your connection may be interrupted.

### Q: What does "Kick Back to Review" mean?

**A**: In Database View, this sends an accepted question back to pending status for re-evaluation. Use this if you find an issue with a previously accepted question.

### Q: Can I review questions on mobile?

**A**: The application is optimized for desktop. Mobile browsers may work but are not officially supported.

---

## 10. Best Practices

### Quality Review Checklist

For each question, verify:

- [ ] Question is clear and unambiguous
- [ ] Correct answer is marked and accurate
- [ ] Distractors (wrong answers) are plausible but clearly incorrect
- [ ] Difficulty level matches question complexity
- [ ] Source URL is valid and relevant
- [ ] No typos or grammatical errors
- [ ] Question tests UE5 knowledge, not trivia

### When to Reject

Reject questions that:

- Contain factual errors
- Are too vague or ambiguous
- Have obvious or implausible answer options
- Test outdated information
- Are poorly written or confusing
- Have difficulty mismatches (e.g., Expert-level question marked as Beginner)

### When to Accept

Accept questions that:

- Are factually accurate
- Test important UE5 concepts
- Have clear, unambiguous wording
- Include plausible distractors
- Match their stated difficulty level
- Reference current UE5 documentation

---

## 11. Getting Help

### Technical Issues

- **Email**: [Your support email here]
- **Response time**: Within 24 hours

### Content Questions

- **Email**: [Content lead email here]
- **Best for**: Questions about UE5 accuracy, difficulty levels, or review standards

### Tutorial

- Click the **Tutorial** button (📚) in the header anytime
- Available for Review Mode, Database View, and Analytics
- Press **Esc** to exit tutorial

---

## 12. Review Workflow Summary

```
1. Select Discipline → 2. Read Question → 3. Use AI Critique → 4. Make Decision
                                                                    ↓
                                                    ┌───────────────┴───────────────┐
                                                    ↓                               ↓
                                                ACCEPT                          REJECT
                                                    ↓                               ↓
                                        Question → Database              Select Reason + Notes
```

---

**Last Updated**: December 17, 2025  
**Version**: 2.2.3  
**Application URL**: <https://samdeiter.github.io/UE5QuestionGenerator/>

---

## Quick Start Checklist

- [ ] Sign in with your invite link
- [ ] Verify "REVIEWER" badge appears in header
- [ ] Complete the Review Mode tutorial (5 minutes)
- [ ] Select a discipline to review
- [ ] Review your first 5 questions
- [ ] Use AI Critique on at least one question
- [ ] Accept or reject based on quality
- [ ] Ask questions if anything is unclear

**Welcome to the team! Your expertise will help us build a world-class UE5 assessment question bank.**
