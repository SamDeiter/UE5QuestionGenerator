# 🛠️ Tech Stack & Constraints

## Core Technologies

### Frontend Framework

- **React 18.2**
  - Functional components only (NO class components)
  - Hooks-based state management
  - React.memo for performance optimization
  - Strict mode enabled

### Build Tool & Dev Server

- **Vite 5.x**
  - Fast HMR (Hot Module Replacement)
  - ES modules
  - **NO `require()`** - Use ES6 `import` only
  - Environment variables via `import.meta.env`

### Styling

- **Tailwind CSS 3.x**
  - Utility-first approach
  - **NO dynamic class names** (e.g., `bg-${color}-500` breaks purging)
  - Custom design tokens in `tailwind.config.js`
  - Dark theme optimized (slate color palette)

### Backend as a Service

- **Firebase 9.x (Modular SDK)**
  - Firestore (NoSQL database)
  - Firebase Authentication
  - Firebase Cloud Functions (2nd gen)
  - **NO namespaced API** - Use modular imports only:
    ```js
    ✅ import { getFirestore, collection } from 'firebase/firestore';
    ❌ import firebase from 'firebase/app'; // Old SDK
    ```

### AI Integration

- **Google Gemini API**
  - Accessed via Firebase Cloud Functions (secure)
  - Direct client-side fallback for development
  - Models: `gemini-1.5-flash`, `gemini-1.5-pro`

### Third-Party Integrations

- **Google Sheets API v4**
  - OAuth 2.0 authentication
  - Used for bulk import/export

### Testing

- **Vitest** - Unit testing framework
- **React Testing Library** - Component testing
- **NO Enzyme** (deprecated)

## State Management Architecture

### Custom Hooks Pattern

We use **custom hooks** for all state management - NO Redux, Zustand, or Context API for app state.

**Core Hooks:**

- `useQuestionManager` - Question CRUD operations
- `useGeneration` - AI question generation logic
- `useFiltering` - Filter & search state
- `useAuth` - Authentication state
- `useAppConfig` - App configuration
- `useNavigation` - Mode switching
- `useModalState` - Modal visibility

## Security & Data

- **Encryption**: `crypto-js` for localStorage encryption
- **Authentication**: Firebase Auth (Google Sign-In)
- **API Key Protection**: Cloud Functions proxy all Gemini API calls
- **Rate Limiting**: Client-side quota enforcement

## Development Tools

- **ESLint** - Linting (React rules enabled)
- **Git** - Version control
- **GitHub** - Remote repository
- **Windows 11** - Development environment

## Code Constraints & Rules

### Do NOT Use

❌ Class components  
❌ `require()` imports (use ES6 `import`)  
❌ Redux, MobX, Zustand  
❌ Context API for app state  
❌ Inline `style={{}}` (use Tailwind)  
❌ Dynamic Tailwind class names  
❌ Firebase namespaced SDK  
❌ `fetch()` or `axios` for Firebase data (use Firebase SDK)

### ALWAYS Use

✅ Functional components  
✅ Custom hooks for state  
✅ ES6 import/export  
✅ Tailwind utility classes  
✅ Firebase modular SDK  
✅ `getSecureItem` / `setSecureItem` for localStorage  
✅ Error boundaries for critical components

## File Structure Patterns

```
src/
├── components/        # React components (UI)
├── hooks/            # Custom hooks (logic/state)
├── services/         # External API integrations
├── utils/            # Pure helper functions
└── App.jsx           # Root component
```

## Performance Optimizations

- React.memo for expensive renders
- useMemo for computed values
- useCallback for event handlers
- Code splitting (Vite automatic)
- Firestore query limits
- Token-based context pruning for AI prompts

## Line Endings

- **ALWAYS LF** (Unix style)
- Configured in `.gitattributes`
- Never commit CRLF line endings

## Browser Targets

- Modern browsers only (ES2020+)
- Chrome, Edge, Firefox, Safari (latest 2 versions)
- NO IE11 support
