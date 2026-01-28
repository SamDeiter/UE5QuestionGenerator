# Firebase Emulator & Security Testing Guide

## Quick Start: Running Tests

```bash
cd functions

# Install test dependencies (first time only)
npm install --save-dev mocha chai

# Run all tests
npm test
```

## Test Structure

```
functions/
├── test/
│   ├── epicEmployeeAccess.test.js  # Domain recognition tests
│   ├── invite.test.js              # Invite system tests
│   └── security.test.js            # Access control & privilege escalation tests
```

## Emulator Setup

### Prerequisites

```bash
# Install Firebase CLI globally (if not already)
npm install -g firebase-tools

# Login to Firebase
firebase login
```

### Start Emulators

```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only functions,firestore,auth

# Start with import/export of data
firebase emulators:start --import=./emulator-data --export-on-exit
```

### Emulator UI

Once running, access the emulator UI at:

- **Emulator Dashboard**: <http://localhost:4000>
- **Firestore**: <http://localhost:8080>
- **Auth**: <http://localhost:9099>
- **Functions**: <http://localhost:5001>

## Running Security Tests

### Unit Tests (No Emulator Required)

```bash
cd functions
npm test
```

These tests verify:

- ✅ Epic employee domain recognition
- ✅ Privilege escalation prevention
- ✅ Access control for admin/reviewer roles
- ✅ Custom claims validation
- ✅ Tool access boundaries

### Integration Tests (Emulator Required)

```bash
# Terminal 1: Start emulators
firebase emulators:start

# Terminal 2: Run integration tests
cd functions
npm run test:integration
```

## Security Test Coverage

### 1. Unauthenticated Access Tests

Verifies that all protected functions reject unauthenticated requests.

### 2. Privilege Escalation Prevention

Tests that:

- Spoofed admin tokens are rejected
- Non-Epic email + admin role = DENIED
- Epic email required for admin access

### 3. Tool Access Control

Verifies:

- Reviewers can only access granted tools
- Admins can access all tools
- Unknown tools are denied

### 4. Role Boundary Enforcement

Ensures admin-only functions are protected:

- `createInvite`
- `revokeInvite`
- `changeUserRole`
- `revokeUserAccess`
- `listRegisteredUsers`

## Firestore Rules Testing

### Local Rules Testing

```bash
# Run rules tests with emulator
firebase emulators:exec --only firestore "npm run test:rules"
```

### Rules Test Patterns

```javascript
// Example: Test that reviewer cannot create questions
const testCases = [
  { desc: "Reviewer cannot create", shouldFail: true },
  { desc: "Reviewer can update own", shouldPass: true },
  { desc: "Admin can do anything", shouldPass: true },
];
```

## Troubleshooting

### Emulator Won't Start

```bash
# Check if ports are in use
netstat -ano | findstr :8080
netstat -ano | findstr :9099

# Kill process on port
taskkill /PID <pid> /F
```

### Tests Fail in CI

Ensure `firebase.json` has emulator configuration:

```json
{
  "emulators": {
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "auth": { "port": 9099 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run Security Tests
  run: |
    cd functions
    npm ci
    npm test
```
