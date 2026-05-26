# Firebase Cloud Functions - Deployment Guide

## Overview

These Cloud Functions provide secure, server-side API key management for the UE5 Question Generator. Instead of exposing the Gemini API key in the client, all API calls are routed through these authenticated functions.

## Functions

### 1. `generateQuestions`

- **Purpose**: Securely calls Gemini API for question generation
- **Authentication**: Required (Firebase Auth)
- **Rate Limit**: 10 requests/minute per user
- **Parameters**:
  - `systemPrompt` (string): System instruction for AI
  - `userPrompt` (string): User's generation request
  - `temperature` (number, optional): 0.0-1.0, default 0.2
  - `model` (string, optional): Gemini model name

### 2. `generateCritique`

- **Purpose**: Securely calls Gemini API for question critique
- **Authentication**: Required (Firebase Auth)
- **Rate Limit**: 20 requests/minute per user
- **Model Fallback**: Automatically tries multiple models in order
  (see `functions/ai/generateCritique.js` for the live list). Currently:
  1. `gemini-2.5-flash-lite` (highest quota — 1000 RPD on the free tier)
  2. `gemini-2.5-flash` (balanced default)
  3. `gemini-2.5-pro` (highest capability, slower)

  The 2.5 series shuts down 2026-10-16
  (<https://ai.google.dev/gemini-api/docs/deprecations>).
  Recommended replacements when the time comes: `gemini-3.1-flash-lite`,
  `gemini-3.5-flash`, `gemini-3.1-pro-preview`.
- **Parameters**:
  - `question` (string): Question text
  - `options` (object): Answer options {A, B, C, D}
  - `correct` (string): Correct answer letter
  - `modeLabel` (string, optional): 'Strict' or 'Wild'
  - `model` (string, optional): Override default model (still uses fallback if unavailable)

## Setup Instructions

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure API Key

Set your Gemini API key in Firebase config:

```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY_HERE"
```

### 3. Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:generateQuestions
firebase deploy --only functions:generateCritique
```

### 4. Test Locally (Optional)

```bash
# Start emulator
npm run serve

# The functions will be available at:
# http://localhost:5001/YOUR_PROJECT_ID/us-central1/generateQuestions
# http://localhost:5001/YOUR_PROJECT_ID/us-central1/generateCritique
```

## Security Features

### ✅ Authentication

- All functions require Firebase Authentication
- Unauthenticated requests are rejected with `unauthenticated` error

### ✅ Rate Limiting

- Per-user rate limits prevent abuse
- Limits stored in Firestore `apiUsage` collection
- Generation: 10 requests/minute
- Critique: 20 requests/minute

### ✅ Input Validation

- All parameters are validated before API calls
- Invalid requests return `invalid-argument` error

### ✅ API Key Protection

- Gemini API key stored server-side only
- Never exposed to client
- Accessed via Firebase config

## Firestore Collections

### `apiUsage`

Tracks API usage for rate limiting and analytics:

```javascript
{
  userId: string,
  model: string,
  type: 'generation' | 'critique',
  tokensUsed: object,
  timestamp: Timestamp
}
```

## Client Integration

Update your client code to call these functions instead of direct API:

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

// Generate questions
const generateQuestions = httpsCallable(functions, 'generateQuestions');
const result = await generateQuestions({
  systemPrompt: '...',
  userPrompt: '...',
  temperature: 0.2
});

// Generate critique
const generateCritique = httpsCallable(functions, 'generateCritique');
const critiqueResult = await generateCritique({
  question: '...',
  options: { A: '...', B: '...', C: '...', D: '...' },
  correct: 'A'
});
```

## Monitoring

### View Logs

```bash
# Real-time logs
firebase functions:log

# Specific function logs
firebase functions:log --only generateQuestions
```

### Check Usage

Query the `apiUsage` collection in Firestore to see:

- Total API calls per user
- Token usage
- Rate limit violations

## Cost Optimization

### Rate Limits

Adjust rate limits in `index.js`:

```javascript
const RATE_LIMITS = {
    generation: 10,  // Increase/decrease as needed
    critique: 20
};
```

### Caching (Future Enhancement)

Consider caching common requests to reduce API calls:

- Cache critique results for identical questions
- Cache generation results for common prompts

## Troubleshooting

### Error: "Gemini API key not configured"

Run: `firebase functions:config:set gemini.api_key="YOUR_KEY"`

### Error: "Rate limit exceeded"

User has made too many requests. Wait 1 minute or increase rate limits.

### Error: "unauthenticated"

Ensure user is signed in with Firebase Auth before calling functions.

## Next Steps

1. ✅ Deploy functions to Firebase
2. ✅ Update client to use Cloud Functions
3. ✅ Remove client-side API key
4. ✅ Test authentication flow
5. ✅ Monitor usage and adjust rate limits
6. 🔄 Consider adding response caching
7. 🔄 Add API key rotation mechanism

## Security Best Practices

- ✅ Never commit API keys to git
- ✅ Use Firebase config for secrets
- ✅ Implement rate limiting
- ✅ Validate all inputs
- ✅ Log all API usage
- 🔄 Rotate API keys regularly
- 🔄 Monitor for unusual usage patterns
