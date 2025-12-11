# Auth & Data Flow Architecture

This document shows how authentication and data flows through the UE5 Question Generator.

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant App as React App
    participant Auth as useAuth.js
    participant FBAuth as Firebase Auth
    participant Google as Google OAuth

    U->>App: Click "Sign In"
    App->>Auth: signInWithGoogle()
    Auth->>FBAuth: signInWithPopup(googleProvider)
    FBAuth->>Google: OAuth Flow
    Google-->>FBAuth: Access Token + User Info
    FBAuth-->>Auth: user object (uid, email, displayName)
    Auth-->>App: { user, authLoading: false }
    App->>App: Enable secure features
```

## Data Flow: Question Lifecycle

```mermaid
flowchart TB
    subgraph Client ["📱 React Client"]
        A[User Clicks Generate] --> B[useGeneration.js]
        B --> C{Authenticated?}
        C -->|Yes| D[geminiSecure.js]
        C -->|No| E[gemini.js Direct API]
    end

    subgraph CloudFunctions ["☁️ Firebase Cloud Functions"]
        D --> F[generateQuestions]
        F --> G[Rate Limiter Check]
        G --> H[Gemini API Call]
        H --> I[Parse Response]
        I --> J[Return Questions]
    end

    subgraph DataStorage ["💾 Data Storage"]
        J --> K[useQuestionManager.js]
        K --> L[localStorage\nAES Encrypted]
        K --> M[Firestore\nquestions collection]
        M --> N[Security Rules]
    end

    N -->|creatorId == uid| O[✅ Allow]
    N -->|creatorId != uid| P[❌ Deny Write]
```

## Firestore Data Model

```mermaid
erDiagram
    QUESTIONS {
        string uniqueId PK "Document ID"
        string creatorId "Firebase UID - Protected"
        string creatorEmail "User email - Protected"
        string creatorName "Display name"
        string question "Question text"
        object options "A, B, C, D answers"
        string correct "Correct answer letter"
        string status "pending|accepted|rejected"
        int critiqueScore "0-100 AI score"
        string critique "AI feedback text"
        boolean humanVerified "Manual approval"
        string humanVerifiedBy "Reviewer name"
        timestamp dateAdded "Creation time"
        timestamp firestoreUpdatedAt "Last sync"
    }

    USER_SETTINGS {
        string userId PK "Firebase UID"
        array customTags "User-defined tags"
        object preferences "UI preferences"
    }

    API_USAGE {
        string docId PK "Auto-generated"
        string userId "Firebase UID"
        int tokensUsed "API token count"
        timestamp timestamp "Request time"
    }
```

## Security Rules Summary

```mermaid
flowchart LR
    subgraph Rules ["🔒 Firestore Rules"]
        R1[READ] --> |isAuthenticated| A1[✅ Allow]
        R2[CREATE] --> |creatorId == self| A2[✅ Allow]
        R3[UPDATE] --> |isAuthenticated| A3[✅ Allow*]
        R4[DELETE] --> |isOwner| A4[✅ Allow]
    end

    A3 --> Note["*TODO: Protect creatorId field"]
```

## Protected vs Editable Fields

| Category             | Fields                                | Who Can Edit           |
| -------------------- | ------------------------------------- | ---------------------- |
| **🔒 Protected**     | `creatorId`, `uniqueId`, `dateAdded`  | Nobody (immutable)     |
| **👤 Owner Only**    | `creatorEmail`, `creatorName`         | Document owner         |
| **👥 Collaborative** | `status`, `critique`, `humanVerified` | Any authenticated user |
| **📝 Content**       | `question`, `options`, `correct`      | Any authenticated user |
