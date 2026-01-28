# AuthManager API Documentation

The `AuthManager` is a singleton service that provides centralized authentication lifecycle management for the UE5 Question Generator application.

## Overview

The AuthManager solves several critical problems:

1. **Centralized Token Monitoring**: Uses `onIdTokenChanged` instead of `onAuthStateChanged` to detect token revocations and custom claim changes
2. **Cleanup Coordination**: Provides a "cleanup bus" for components to register cleanup callbacks that run on logout
3. **Race Condition Prevention**: Prevents stale auth state from persisting during rapid sign-in/sign-out sequences
4. **Disabled User Detection**: Automatically signs out users whose accounts have been disabled

## Installation

The AuthManager is automatically initialized in `src/main.jsx`:

```javascript
import { authManager } from './services/AuthManager';

// Initialize before React renders
authManager.init();
```

## API Reference

### `authManager.init()`

Initializes the AuthManager with an `onIdTokenChanged` listener.

```javascript
import { authManager } from '../services/AuthManager';

// Called once at app startup
authManager.init();
```

**Note**: This is idempotent - calling it multiple times has no effect.

---

### `authManager.onAuthChange(callback)`

Subscribe to authentication state changes.

**Parameters:**

- `callback: (user: User | null) => void` - Called when auth state changes

**Returns:** `() => void` - Unsubscribe function

**Example:**

```javascript
import { authManager } from '../services/AuthManager';

// Subscribe
const unsubscribe = authManager.onAuthChange((user) => {
  if (user) {
    console.log('User signed in:', user.uid);
  } else {
    console.log('User signed out');
  }
});

// Later: unsubscribe
unsubscribe();
```

---

### `authManager.registerCleanup(callback)`

Register a cleanup callback that runs when the user logs out or switches accounts.

**Parameters:**

- `callback: () => void` - Cleanup function (unsubscribe listeners, clear caches, etc.)

**Returns:** `() => void` - Unregister function

**Example:**

```javascript
import { authManager } from '../services/AuthManager';

// In a component or service
const unregister = authManager.registerCleanup(() => {
  // Clean up Firestore listeners
  unsubscribeFromQuestions();
  
  // Clear local caches
  questionCache.clear();
});

// Later: unregister if component unmounts before logout
unregister();
```

---

### `authManager.getUser()`

Get the current authenticated user (synchronous).

**Returns:** `User | null`

**Example:**

```javascript
const user = authManager.getUser();
if (user) {
  console.log('Current user:', user.email);
}
```

---

### `authManager.isAuthenticated()`

Check if a user is currently authenticated (synchronous).

**Returns:** `boolean`

**Example:**

```javascript
if (authManager.isAuthenticated()) {
  // Show authenticated UI
}
```

---

### `authManager.getClaims()` (async)

Get the current user's token claims (role, permissions, etc.).

**Returns:** `Promise<Object | null>` - Token claims or null if not authenticated

**Example:**

```javascript
const claims = await authManager.getClaims();
if (claims?.role === 'admin') {
  // Show admin features
}
if (claims?.disabled) {
  // Handle disabled user
}
```

---

### `authManager.getLastKnownRole()`

Get the last known user role (synchronous, cached from last token check).

**Returns:** `string | undefined`

**Example:**

```javascript
const role = authManager.getLastKnownRole();
console.log('Last known role:', role); // 'admin', 'reviewer', etc.
```

---

### `authManager.refreshClaims()` (async)

Force refresh the user's token and get updated claims. Call this after operations that might change claims (e.g., invite consumption, role changes).

**Returns:** `Promise<Object | null>` - New claims or null on error

**Example:**

```javascript
// After consuming an invite
await consumeInvite(inviteCode);

// Refresh claims to get the new role
const newClaims = await authManager.refreshClaims();
console.log('New role:', newClaims?.role);
```

---

### `authManager.signOut()` (async)

Sign out the current user and run all cleanup callbacks.

**Example:**

```javascript
await authManager.signOut();
// All registered cleanup callbacks have now run
```

---

### `authManager.destroy()`

Clean up the AuthManager (unsubscribe from Firebase, clear all listeners). Call on app unmount if needed.

**Example:**

```javascript
// On app cleanup
authManager.destroy();
```

## Integration Patterns

### Pattern 1: Cleanup Hook

Use the `useAuthCleanup` hook to register cleanup callbacks in React components:

```javascript
import { useAuthCleanup } from '../hooks/useAuthCleanup';

function MyComponent() {
  const [data, setData] = useState([]);
  
  // This cleanup runs on logout
  useAuthCleanup(() => {
    setData([]);
    // Unsubscribe from any listeners
  });
  
  // ... component logic
}
```

### Pattern 2: Service Integration

Register cleanup for services that maintain Firestore subscriptions:

```javascript
// In App.jsx
import { authManager } from './services/AuthManager';
import { resetAgents } from './agents';

useEffect(() => {
  // Register agent cleanup
  const unregister = authManager.registerCleanup(() => {
    resetAgents();
  });
  
  return unregister;
}, []);
```

### Pattern 3: Claims-Based UI

React to role changes with claims:

```javascript
const [isAdmin, setIsAdmin] = useState(false);

useEffect(() => {
  async function checkRole() {
    const claims = await authManager.getClaims();
    setIsAdmin(claims?.role === 'admin');
  }
  
  const unsubscribe = authManager.onAuthChange(() => {
    checkRole();
  });
  
  return unsubscribe;
}, []);
```

## Error Handling

The AuthManager handles several error cases automatically:

| Error | Action |
|-------|--------|
| `auth/user-disabled` | Signs out user, runs cleanup |
| `auth/id-token-revoked` | Signs out user, runs cleanup |
| Disabled claim (`claims.disabled === true`) | Signs out user, runs cleanup |

## Testing

Use the `authHarness` for testing auth edge cases:

```javascript
import { createAuthHarness } from '../testUtils/authHarness';

const harness = createAuthHarness();

// Simulate offline mode
harness.goOffline();

// Simulate network failure
harness.simulateNetworkFailure();

// Create mock user
const mockUser = harness.createMockUser('reviewer');
```

## Best Practices

1. **Always register cleanup**: Any component with Firestore listeners should register cleanup
2. **Use `refreshClaims()` after role changes**: After invite consumption or admin actions
3. **Check `isAuthenticated()` before auth-required operations**
4. **Handle the cleanup callback idempotently**: It may be called multiple times

## Related Files

- `src/services/AuthManager.js` - Main implementation
- `src/hooks/useAuthCleanup.js` - React hook for cleanup registration
- `src/hooks/useAuth.js` - Main auth state hook
- `src/testUtils/authHarness.js` - Testing utilities
- `src/services/__tests__/AuthManager.test.js` - Unit tests
