---
description: Monitor token usage and warn user when approaching limits
---

# Token Usage Monitoring Workflow

## Purpose

Proactively monitor conversation token usage and warn the user when approaching limits to prevent context loss or degraded performance.

## When to Use

- Check token usage at the start of every conversation
- Monitor throughout long conversations
- Alert user at specific thresholds

## Token Thresholds

### 🟢 Safe Zone (0-75%)

- **Range**: 0 - 150,000 tokens
- **Action**: Continue normally
- **Message**: None needed

### 🟡 Warning Zone (75-90%)

- **Range**: 150,000 - 180,000 tokens
- **Action**: Inform user, suggest wrapping up current task
- **Message**:

  ```
  ⚠️ Token Usage Alert: We're at X% of the conversation limit. 
  Consider finishing this task and starting a new conversation soon 
  to maintain optimal performance.
  ```

### 🔴 Critical Zone (90-95%)

- **Range**: 180,000 - 190,000 tokens
- **Action**: Strongly recommend finishing current task
- **Message**:

  ```
  🔴 Token Usage Critical: We're at X% of the limit. 
  Please let me finish this current task, then we should start 
  a fresh conversation to avoid context issues.
  ```

### 🛑 Emergency Zone (95-100%)

- **Range**: 190,000 - 200,000 tokens
- **Action**: Complete only essential work, create handoff document
- **Message**:

  ```
  🛑 Token Limit Nearly Reached: We're at X% capacity. 
  I'm creating a handoff document now. Please start a new 
  conversation for the next task.
  ```

## Implementation Steps

### 1. Check Token Usage

Look for system warnings in the format:

```
Token usage: X/200000; Y remaining
```

### 2. Calculate Percentage

```
percentage = (X / 200000) * 100
```

### 3. Determine Zone

- If percentage >= 95%: Emergency Zone
- If percentage >= 90%: Critical Zone  
- If percentage >= 75%: Warning Zone
- Otherwise: Safe Zone

### 4. Take Action

Based on zone, provide appropriate user notification and adjust behavior:

**Warning Zone (75%)**:

- Mention token usage casually
- Suggest wrapping up after current task
- Continue working normally

**Critical Zone (90%)**:

- Explicitly warn user
- Recommend starting new conversation after current task
- Avoid starting new complex tasks

**Emergency Zone (95%)**:

- Stop taking on new work
- Create session_handoff.md if not already created
- Complete only essential cleanup
- Strongly recommend new conversation

## Handoff Document Creation

When reaching Critical or Emergency zones, automatically create:

**File**: `C:\Users\Sam Deiter\.gemini\antigravity\brain\[CONVERSATION_ID]\session_handoff.md`

**Contents**:

- Current state summary
- Work completed this session
- Outstanding tasks
- Quick start commands for next agent
- Token usage status
- Key file references

## Example Usage

### At Conversation Start

```
Token usage: 5000/200000 (2.5%) - Safe to proceed
```

**Action**: No message needed, continue normally

### Mid-Conversation Check

```
Token usage: 155000/200000 (77.5%) - Warning Zone
```

**Action**:

```
⚠️ Heads up: We're at 77% of the conversation token limit. 
After we finish this current task, you might want to start 
a fresh conversation to keep things running smoothly.
```

### Approaching Limit

```
Token usage: 185000/200000 (92.5%) - Critical Zone
```

**Action**:

```
🔴 Token usage is at 92%. I recommend we finish this task 
and start a new conversation. I'll create a handoff document 
to make the transition seamless.
```

## Notes

- Token counts include both user messages and agent responses
- System messages and tool outputs also consume tokens
- Longer conversations with many tool calls accumulate tokens faster
- Starting fresh conversations improves response quality and speed
- Always create handoff documents when recommending new conversations
