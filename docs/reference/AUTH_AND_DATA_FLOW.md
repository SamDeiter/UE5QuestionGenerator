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

---

## 📊 Data Usage & Privacy

### What Data We Collect

| Data Type             | Source              | Storage                  | Purpose                  |
| --------------------- | ------------------- | ------------------------ | ------------------------ |
| **Email**             | Google OAuth        | Firestore                | User identification      |
| **Display Name**      | Google Profile      | Firestore                | Attribution on questions |
| **Firebase UID**      | Firebase Auth       | Firestore                | Link questions to user   |
| **Question Content**  | User-generated + AI | Firestore + localStorage | Core app functionality   |
| **API Usage Metrics** | Cloud Functions     | Firestore                | Rate limiting, analytics |

### How We Use Your Data

```mermaid
flowchart LR
    subgraph Collect ["📥 Data Collection"]
        A[Google Sign-In] --> B[Email + Name]
        C[Question Generation] --> D[Content + Metadata]
        E[API Calls] --> F[Token Usage]
    end

    subgraph Use ["⚙️ Data Usage"]
        B --> G[Link questions to you]
        B --> H[Display creator attribution]
        D --> I[Store in your question bank]
        D --> J[Export to Google Sheets]
        F --> K[Enforce rate limits]
    end

    subgraph NotUsed ["🚫 NOT Used For"]
        L[❌ Advertising]
        M[❌ Selling to third parties]
        N[❌ Training AI models]
        O[❌ Marketing emails]
    end
```

### Data Sharing

| Recipient             | What Data              | Why                               |
| --------------------- | ---------------------- | --------------------------------- |
| **Google Firebase**   | Auth tokens, questions | Database hosting                  |
| **Google Gemini API** | Question prompts       | AI generation                     |
| **Google Sheets**     | Exported questions     | User-initiated export             |
| **Other Users**       | Questions you create   | Collaborative review (if enabled) |

### Data Retention

| Data                    | Retention Period      | How to Delete                      |
| ----------------------- | --------------------- | ---------------------------------- |
| **localStorage**        | Until browser cleared | Settings → Clear Local Data        |
| **Firestore Questions** | Indefinitely          | Delete individual or Factory Reset |
| **Firebase Auth**       | Until account deleted | Google Account settings            |

### Your Rights

- ✅ **Access** - Export all your questions anytime
- ✅ **Delete** - Remove questions or entire account
- ✅ **Portability** - Export to CSV, JSON, or Google Sheets
- ✅ **Opt-out** - Use without Google Sign-In (limited features)

### Security Measures

| Measure                   | Implementation             |
| ------------------------- | -------------------------- |
| **Encryption at Rest**    | AES-256 for localStorage   |
| **Encryption in Transit** | HTTPS/TLS for all requests |
| **Access Control**        | Firestore security rules   |
| **XSS Prevention**        | DOMPurify sanitization     |
| **Authentication**        | OAuth 2.0 via Google       |
