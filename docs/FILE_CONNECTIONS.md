# File Connections and Dependencies

This document maps the relationships between modified files and their dependencies throughout the codebase.

---

## Modified Files Overview

| File | Change | Impact Level |
|------|--------|--------------|
| `functions/src/index.ts` | Added loginStudent function | High |
| `firestore.indexes.json` | Added collectionGroup index | Low |
| `src/services/firebase.ts` | Added functions export | Medium |
| `src/contexts/AuthContext.tsx` | Rewrote student auth | High |
| `firestore.rules` | Added security validation | High |
| `package.json` | Fixed wildcards | Low |

---

## 1. functions/src/index.ts

### Dependencies (Imports)
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
```

### Exports
```typescript
export const loginStudent    // NEW: Student authentication
export const scheduledCookieRefresh
export const manualCookieRefresh
export const scheduledCookieShopEmail
export const manualCookieShopEmail
export const onFeedbackCreated
```

### Connected Files
| File | Connection Type | Description |
|------|-----------------|-------------|
| `AuthContext.tsx` | Consumer | Calls `loginStudent` via httpsCallable |
| `firebase.json` | Configuration | Functions deployment settings |
| `firestore.indexes.json` | Dependency | Uses collectionGroup query |

### Impact Analysis
- **Breaking Changes:** None - new function only
- **Backward Compatible:** Yes
- **Requires Deployment:** Yes

---

## 2. firestore.indexes.json

### New Index Added
```json
{
  "collectionGroup": "students",
  "fieldPath": "code",
  "indexes": [
    { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" }
  ]
}
```

### Connected Files
| File | Connection Type | Description |
|------|-----------------|-------------|
| `functions/src/index.ts` | Consumer | loginStudent uses collectionGroup query |
| `firebase.json` | Reference | Points to this file |

### Impact Analysis
- **Breaking Changes:** None - new index only
- **Backward Compatible:** Yes
- **Requires Deployment:** Yes (before functions deployment)

---

## 3. src/services/firebase.ts

### Previous State
```typescript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
```

### Current State
```typescript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";  // NEW

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-northeast3');  // NEW
```

### Connected Files (Consumers)
| File | Import | Usage |
|------|--------|-------|
| `AuthContext.tsx` | `auth, functions` | Authentication, Cloud Function calls |
| `firestoreApi.ts` | `db` | All Firestore operations |
| Multiple pages | `db, auth, storage` | Various features |

### Impact Analysis
- **Breaking Changes:** None - additive only
- **Backward Compatible:** Yes
- **Requires Deployment:** No (bundled with frontend)

---

## 4. src/contexts/AuthContext.tsx

### Import Changes
```typescript
// REMOVED
import { findStudentByCode } from '../services/firestoreApi';

// ADDED
import { signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { getStudent } from '../services/firestoreApi';
import { functions } from '../services/firebase';
```

### Interface Changes
```typescript
// NEW
interface LoginStudentResponse {
  success: boolean;
  token?: string;
  student?: Student;
  teacherId?: string;
  teacher?: Teacher;
  message?: string;
}
```

### Function Changes

#### loginAsStudent (REWRITTEN)
**Before:**
```typescript
const loginAsStudent = async (code: string) => {
  const result = await findStudentByCode(code);
  if (!result) return { success: false, message: '...' };
  setStudent(result.student);
  // ... localStorage updates
};
```

**After:**
```typescript
const loginAsStudent = async (code: string) => {
  const loginStudentFn = httpsCallable(functions, 'loginStudent');
  const result = await loginStudentFn({ code });
  await signInWithCustomToken(auth, result.data.token);
  // State set by onAuthStateChanged
};
```

#### onAuthStateChanged (REWRITTEN)
**Before:**
```typescript
if (firebaseUser) {
  // Assume teacher
  setRole('teacher');
} else {
  // Check localStorage for student
  if (savedRole === 'student') {
    const result = await findStudentByCode(savedStudentCode);
  }
}
```

**After:**
```typescript
if (firebaseUser) {
  const tokenResult = await firebaseUser.getIdTokenResult();
  if (tokenResult.claims.role === 'student') {
    // Student Custom Token login
    const studentData = await getStudent(teacherId, studentCode);
  } else {
    // Teacher login
  }
} else {
  // Logged out - clear all state
}
```

#### logout (MODIFIED)
**Before:**
```typescript
const logout = async () => {
  if (role === 'teacher') {
    await signOut(auth);
  } else {
    clearStudentSession();  // Just clears localStorage
  }
};
```

**After:**
```typescript
const logout = async () => {
  await signOut(auth);  // Always sign out Firebase Auth
  // Clear all state
  // Clear all localStorage
};
```

### Connected Files (Consumers)

| File | Import | Functions Used |
|------|--------|----------------|
| `App.tsx` | `AuthProvider, useAuth` | `role, isAuthenticated, isLoading, logout` |
| `Login.tsx` | `useAuth` | `loginAsStudent, loginAsTeacher, registerAsTeacher` |
| `TeacherDashboard.tsx` | `useAuth` | `user, teacher, classes, selectedClass, selectClass, refreshClasses, updateTeacherEmail` |
| `StudentDashboardNew.tsx` | `useAuth` | `student, studentTeacherId, studentTeacher` |
| `GameTeamManager.tsx` | `useAuth` | `selectedClass, role, student, user, studentTeacherId` |
| `BattleGame.tsx` | `useAuth` | `user, selectedClass` |
| `StudentProfile.tsx` | `useAuth` | `student, studentTeacherId` |
| `Shop.tsx` | `useAuth` | `student, studentTeacherId, user` |
| `WishingStone.tsx` | `useAuth` | `student, studentTeacherId` |
| `StudentGrass.tsx` | `useAuth` | `student, studentTeacherId` |
| `CookieBattle.tsx` | `useAuth` | `student, studentTeacherId` |
| `WordChain.tsx` | `useAuth` | `student` |

### Impact Analysis
- **Breaking Changes:** None for consumers (same interface)
- **Internal Changes:** Authentication mechanism completely changed
- **Backward Compatible:** Yes (same exports, same state shape)
- **Requires Deployment:** Yes (bundled with frontend)

---

## 5. firestore.rules

### Helper Functions Added
```
isAuthenticated()
isTeacher(teacherId)
isStudent()
isStudentOf(teacherId)
getStudentCode()
isOwnStudentData(teacherId, studentCode)
```

### Rule Changes Summary

| Path | Before | After |
|------|--------|-------|
| `teachers/{teacherId}` | `allow read: if true` | `allow read: if isTeacher(teacherId) \|\| isStudentOf(teacherId)` |
| `.../students/{studentCode}` | `allow write: if true` | `allow write: if isOwnStudentData(teacherId, studentCode)` |
| `.../wishes/{wishId}` | `allow write: if true` | `allow create: if studentCode matches token` |
| `.../cookieShopRequests/{id}` | `allow write: if true` | `allow create: if studentCode matches token` |
| `games/{gameId}` | `allow write: if true` | `allow write: if isAuthenticated()` |
| `.../players/{playerId}` | `allow write: if true` | `allow write: if playerId matches studentCode` |

### Connected Files
| File | Affected Operations |
|------|---------------------|
| All files using Firestore | Read/write permissions |

### Impact Analysis
- **Breaking Changes:** Unauthenticated access blocked
- **Backward Compatible:** No - requires authentication
- **Requires Deployment:** Yes (before frontend deployment)

---

## 6. package.json

### Changes
```json
// Before
"clsx": "*",
"tailwind-merge": "*",

// After
"clsx": "^2.1.1",
"tailwind-merge": "^2.5.5",
```

### Impact Analysis
- **Breaking Changes:** None
- **Backward Compatible:** Yes
- **Requires Action:** `npm install` to update lock file

---

## Dependency Graph

```
                    ┌─────────────────────┐
                    │  functions/index.ts │
                    │   (loginStudent)    │
                    └──────────┬──────────┘
                               │
                               │ httpsCallable
                               ▼
┌────────────────┐    ┌─────────────────────┐    ┌──────────────────┐
│ firebase.ts    │◄───│  AuthContext.tsx    │───►│  Login.tsx       │
│ (functions)    │    │  (signInWithCustom) │    │  (loginAsStudent)│
└────────────────┘    └──────────┬──────────┘    └──────────────────┘
                               │
                               │ useAuth()
                               ▼
                    ┌─────────────────────┐
                    │   All Consumer      │
                    │   Components        │
                    │   (20+ pages)       │
                    └─────────────────────┘

┌──────────────────┐    ┌─────────────────────┐
│ firestore.rules  │◄───│  firestore.indexes  │
│ (validation)     │    │  (collectionGroup)  │
└──────────────────┘    └─────────────────────┘
```

---

## Deployment Order

**CRITICAL:** Deploy in this order to avoid breaking changes

1. **firestore.indexes.json** - Required for Cloud Function
   ```bash
   npx firebase deploy --only firestore:indexes
   ```
   Wait for index to build (check Firebase Console)

2. **functions/src/index.ts** - loginStudent function
   ```bash
   npx firebase deploy --only functions
   ```

3. **firestore.rules** - Security rules
   ```bash
   npx firebase deploy --only firestore:rules
   ```

4. **Frontend** (firebase.ts, AuthContext.tsx, package.json)
   ```bash
   npm install
   npm run build
   npx firebase deploy --only hosting
   ```

---

## Rollback Plan

If issues occur after deployment:

### Step 1: Revert Rules (Allow Access)
```bash
git checkout HEAD~1 -- firestore.rules
npx firebase deploy --only firestore:rules
```

### Step 2: Keep Functions (No Harm)
Cloud Function can stay - it won't be called if frontend reverts

### Step 3: Revert Frontend
```bash
git checkout HEAD~1 -- src/contexts/AuthContext.tsx
git checkout HEAD~1 -- src/services/firebase.ts
npm run build
npx firebase deploy --only hosting
```

---

## Testing Checklist

Before deployment, verify:

- [ ] `npm run build` succeeds
- [ ] `cd functions && npm run build` succeeds
- [ ] Student login works in dev environment
- [ ] Teacher login works in dev environment
- [ ] Student can view their data
- [ ] Student can create wishes
- [ ] Student can create shop requests
- [ ] Games work for both roles
- [ ] Logout works for both roles
