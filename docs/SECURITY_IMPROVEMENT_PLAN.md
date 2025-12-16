# Security & Performance Improvement Plan

> **Document Version:** 1.0
> **Created:** 2024-12-16
> **Status:** Planning

---

## Executive Summary

This document outlines security vulnerabilities identified in the Dahandin gamification system and provides an implementation plan to address them while **maintaining the exact same user experience for students**.

### Key Principle
- **Student Experience: NO CHANGE** - Students will continue to login with just their code (imported from Dahandin xlsx)
- **Teacher Experience: NO CHANGE** - Teachers continue using Firebase Auth login
- **Security: IMPROVED** - Backend authentication prevents data manipulation

---

## Current Issues

### Priority 1: Firestore Rules - Open Write Access (Critical)

**Problem:**
Anyone can modify any student's data, game results, wishes, and shop requests.

**Affected Paths:**
| Path | Current Rule | Risk |
|------|--------------|------|
| `teachers/{id}/students/{code}` | `allow write: if true` | Anyone can change cookies/jelly |
| `teachers/{id}/wishes/{id}` | `allow write: if true` | Fake wishes creation |
| `teachers/{id}/cookieShopRequests/{id}` | `allow write: if true` | Fraudulent purchase requests |
| `games/{id}/**` | `allow write: if true` | Game result manipulation |

**Attack Example:**
```
Student B opens browser developer tools
→ Finds Student A's document path
→ Changes { cookie: 100 } to { cookie: 0 }
→ Success (no authentication required)
```

### Priority 2: Student Authentication Weakness (High)

**Problem:**
Students are not authenticated via Firebase Auth. The system only checks if a code exists in localStorage.

**Current Flow:**
```
Student enters code → Check if code exists in Firestore → Save to localStorage → Done
```

**Risk:**
No way to verify "who" is making Firestore writes. Rules cannot distinguish between students.

---

## Solution Overview

### Architecture Change

```
BEFORE (Current):
┌──────────┐    Direct Write    ┌──────────────┐
│ Student  │ ─────────────────→ │  Firestore   │
│ Browser  │   (No Auth)        │  (if true)   │
└──────────┘                    └──────────────┘

AFTER (Proposed):
┌──────────┐   1. Code    ┌─────────────────┐   2. Validate   ┌──────────────┐
│ Student  │ ───────────→ │ Cloud Function  │ ─────────────→  │  Firestore   │
│ Browser  │              │ (loginStudent)  │                 │  (lookup)    │
└──────────┘              └─────────────────┘                 └──────────────┘
      │                           │
      │    4. Auto Login          │ 3. Custom Token
      │ ←─────────────────────────┘    (contains studentCode)
      │
      ▼
┌──────────────┐   Write with Token   ┌──────────────┐
│   Firebase   │ ──────────────────→  │  Firestore   │
│     Auth     │                      │  (validate)  │
└──────────────┘                      └──────────────┘
```

### Student Experience Comparison

| Step | Before (Current) | After (Proposed) |
|------|------------------|------------------|
| 1 | Enter student code | Enter student code |
| 2 | Click login | Click login |
| 3 | See dashboard | See dashboard |
| 4 | Use features normally | Use features normally |

**Result: Identical experience for students**

---

## Implementation Plan

### Phase 1: Cloud Function Setup (Day 1-2)

#### Task 1.1: Create loginStudent Cloud Function

**File:** `functions/src/index.ts`

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const loginStudent = functions
  .region('asia-northeast3')  // Seoul region for lower latency
  .https.onCall(async (data, context) => {
    const { code } = data;

    if (!code || typeof code !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        '학생 코드가 필요합니다.'
      );
    }

    // Find student by code using collectionGroup query
    const studentsQuery = await admin.firestore()
      .collectionGroup('students')
      .where('code', '==', code)
      .limit(1)
      .get();

    if (studentsQuery.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        '학생 코드를 찾을 수 없습니다.'
      );
    }

    const studentDoc = studentsQuery.docs[0];
    const studentData = studentDoc.data();
    const pathParts = studentDoc.ref.path.split('/');
    const teacherId = pathParts[1]; // teachers/{teacherId}/students/{code}

    // Get teacher info
    const teacherDoc = await admin.firestore()
      .collection('teachers')
      .doc(teacherId)
      .get();

    if (!teacherDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        '교사 정보를 찾을 수 없습니다.'
      );
    }

    // Create custom token with student info in claims
    const customToken = await admin.auth().createCustomToken(code, {
      studentCode: code,
      teacherId: teacherId,
      classId: studentData.classId,
      role: 'student'
    });

    return {
      token: customToken,
      student: studentData,
      teacherId: teacherId,
      teacher: teacherDoc.data()
    };
  });
```

#### Task 1.2: Add Firestore Index for collectionGroup Query

**File:** `firestore.indexes.json`

```json
{
  "indexes": [],
  "fieldOverrides": [
    {
      "collectionGroup": "students",
      "fieldPath": "code",
      "indexes": [
        { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" }
      ]
    }
  ]
}
```

#### Task 1.3: Deploy Cloud Function

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

---

### Phase 2: Frontend Auth Integration (Day 2-3)

#### Task 2.1: Update AuthContext.tsx

**Changes to `src/contexts/AuthContext.tsx`:**

```typescript
// Add imports
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';

// Initialize functions
const functions = getFunctions(app, 'asia-northeast3');

// Modify loginAsStudent function
const loginAsStudent = async (code: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Call Cloud Function to validate and get token
    const loginFn = httpsCallable(functions, 'loginStudent');
    const result = await loginFn({ code });
    const { token, student, teacherId, teacher } = result.data as {
      token: string;
      student: Student;
      teacherId: string;
      teacher: Teacher;
    };

    // Sign in with custom token (happens in background)
    await signInWithCustomToken(auth, token);

    // Update state (same as before)
    setStudent(student);
    setStudentTeacherId(teacherId);
    setStudentTeacher(teacher);
    setRole('student');

    // Save to localStorage (same as before)
    localStorage.setItem(STORAGE_KEYS.ROLE, 'student');
    localStorage.setItem(STORAGE_KEYS.STUDENT_CODE, code);
    localStorage.setItem(STORAGE_KEYS.STUDENT_TEACHER_ID, teacherId);

    return { success: true, message: '로그인 성공!' };
  } catch (error: any) {
    console.error('Student login error:', error);

    let message = '로그인에 실패했습니다.';
    if (error.code === 'functions/not-found') {
      message = '학생 코드를 찾을 수 없습니다.';
    }

    return { success: false, message };
  }
};
```

#### Task 2.2: Update Session Restoration

**Modify the useEffect in AuthContext.tsx:**

```typescript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // Check if this is a teacher or student
      const tokenResult = await firebaseUser.getIdTokenResult();

      if (tokenResult.claims.role === 'student') {
        // Student session - restore from token claims
        const studentCode = tokenResult.claims.studentCode as string;
        const teacherId = tokenResult.claims.teacherId as string;

        // Fetch fresh student data
        const studentData = await getStudent(teacherId, studentCode);
        const teacherData = await getTeacher(teacherId);

        if (studentData && teacherData) {
          setStudent(studentData);
          setStudentTeacherId(teacherId);
          setStudentTeacher(teacherData);
          setRole('student');
        }
      } else {
        // Teacher session (existing logic)
        const teacherData = await getTeacher(firebaseUser.uid);
        if (teacherData) {
          setTeacher(teacherData);
          setRole('teacher');
          // ... rest of teacher logic
        }
      }
    } else {
      // Not logged in
      setRole(null);
      clearStudentSession();
    }

    setIsLoading(false);
  });

  return () => unsubscribe();
}, []);
```

---

### Phase 3: Firestore Rules Update (Day 3-4)

#### Task 3.1: Update firestore.rules

**File:** `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is the student
    function isStudent(studentCode) {
      return request.auth != null
             && request.auth.token.role == 'student'
             && request.auth.token.studentCode == studentCode;
    }

    // Helper function to check if user is the teacher
    function isTeacher(teacherId) {
      return request.auth != null
             && request.auth.uid == teacherId;
    }

    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // ========================================
    // Teacher Data
    // ========================================
    match /teachers/{teacherId} {
      allow read: if true;
      allow write: if isTeacher(teacherId);

      // Classes
      match /classes/{classId} {
        allow read: if true;
        allow write: if isTeacher(teacherId);

        // Grass data
        match /grass/{date} {
          allow read: if true;
          allow write: if isTeacher(teacherId);
        }

        // Teams
        match /teams/{teamId} {
          allow read: if true;
          allow write: if isTeacher(teacherId);
        }

        // Cookie Shop Items
        match /cookieShopItems/{itemId} {
          allow read: if true;
          allow write: if isTeacher(teacherId);
        }

        // Cookie Shop Requests - Students can create, Teacher can update
        match /cookieShopRequests/{requestId} {
          allow read: if true;
          allow create: if isAuthenticated()
                        && request.resource.data.studentCode == request.auth.token.studentCode;
          allow update, delete: if isTeacher(teacherId);
        }

        // Battles
        match /battles/{battleId} {
          allow read: if true;
          allow write: if isTeacher(teacherId);
        }

        // Word Cloud Sessions
        match /wordclouds/{sessionId} {
          allow read: if true;
          allow write: if isTeacher(teacherId);

          // Word Cloud Responses - Students can write their own
          match /responses/{studentCode} {
            allow read: if true;
            allow write: if isStudent(studentCode);
          }
        }
      }

      // Student Data - Students can update their own profile
      match /students/{studentCode} {
        allow read: if true;
        allow create: if isTeacher(teacherId);
        allow update: if isTeacher(teacherId) || isStudent(studentCode);
        allow delete: if isTeacher(teacherId);
      }

      // Shop Items
      match /shop/{itemId} {
        allow read: if true;
        allow write: if isTeacher(teacherId);
      }

      // Teams (Legacy)
      match /teams/{teamId} {
        allow read: if true;
        allow write: if isTeacher(teacherId);
      }

      // Wishes - Students can create/update their own
      match /wishes/{wishId} {
        allow read: if true;
        allow create: if isAuthenticated()
                      && request.resource.data.studentCode == request.auth.token.studentCode;
        allow update: if isAuthenticated()
                      && (resource.data.studentCode == request.auth.token.studentCode
                          || isTeacher(teacherId));
        allow delete: if isTeacher(teacherId);
      }

      // Item Suggestions - Students can create
      match /itemSuggestions/{suggestionId} {
        allow read: if true;
        allow create: if isAuthenticated();
        allow update, delete: if isTeacher(teacherId);
      }

      // Class Groups
      match /classGroups/{groupId} {
        allow read: if true;
        allow write: if isTeacher(teacherId);
      }
    }

    // ========================================
    // Game Data
    // ========================================
    match /games/{gameId} {
      allow read: if true;
      // Teachers can create/manage games, authenticated users can update
      allow create: if request.auth != null && request.auth.token.role != 'student';
      allow update: if isAuthenticated();
      allow delete: if request.auth != null && request.auth.token.role != 'student';

      // Players - Students can only write their own player data
      match /players/{playerCode} {
        allow read: if true;
        allow write: if isStudent(playerCode) || (request.auth != null && request.auth.token.role != 'student');
      }

      // Rounds - Only teachers can write
      match /rounds/{roundId} {
        allow read: if true;
        allow write: if request.auth != null && request.auth.token.role != 'student';
      }

      // Teams - Authenticated users can participate
      match /teams/{teamId} {
        allow read: if true;
        allow write: if isAuthenticated();
      }

      // Student Info
      match /studentInfo/{studentCode} {
        allow read: if true;
        allow write: if isStudent(studentCode) || (request.auth != null && request.auth.token.role != 'student');
      }

      // Word Chain History
      match /history/{docId} {
        allow read: if true;
        allow write: if isAuthenticated();
      }
    }

    // ========================================
    // Legacy Shop (Public)
    // ========================================
    match /shop/{itemId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role != 'student';
    }

    // ========================================
    // System Logs
    // ========================================
    match /system/{document=**} {
      allow read: if request.auth != null && request.auth.token.role != 'student';
      allow write: if false;
    }
  }
}
```

#### Task 3.2: Deploy Rules

```bash
firebase deploy --only firestore:rules
```

---

### Phase 4: Testing (Day 4-5)

#### Test Checklist

**Student Login:**
- [ ] Login with valid code works
- [ ] Login with invalid code shows error
- [ ] Session persists after page refresh
- [ ] Logout works correctly

**Student Features:**
- [ ] View dashboard
- [ ] Update profile (emoji, title, etc.)
- [ ] Create wish
- [ ] Like/unlike wishes
- [ ] Purchase from shop
- [ ] Join games (all types)
- [ ] Submit game actions
- [ ] Submit word cloud response

**Security Tests:**
- [ ] Cannot modify other student's profile
- [ ] Cannot create wish with different studentCode
- [ ] Cannot manipulate game results directly
- [ ] Browser devtools cannot bypass rules

**Teacher Features:**
- [ ] All existing features work unchanged

---

### Phase 5: Performance Optimization (Day 5-6)

#### Task 5.1: Optimize findStudentByCode

**Current Issue:**
The function iterates through all teachers to find a student (N+1 query problem).

**Solution:**
Already solved by Cloud Function using `collectionGroup` query.

#### Task 5.2: Consolidate onSnapshot Listeners

**File:** `src/pages/StudentDashboardNew.tsx`

**Current:** 6 separate listeners for different game types
**Proposed:** Single listener with client-side filtering

```typescript
// Before: 6 separate useEffects with onSnapshot
// After: 1 consolidated useEffect

useEffect(() => {
  if (!student || !studentTeacherId) return;

  const gamesRef = collection(db, 'games');
  const unsubscribe = onSnapshot(gamesRef, (snapshot) => {
    const activeGames: Record<string, any> = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.teacherId === studentTeacherId &&
          data.classId === student.classId &&
          data.status !== 'finished') {
        activeGames[data.gameType] = { id: doc.id, ...data };
      }
    });

    setBaseballGame(activeGames['baseball'] || null);
    setMinorityGame(activeGames['minority'] || null);
    setWordChainGame(activeGames['wordChain'] || null);
    setBulletDodgeGame(activeGames['bulletDodge'] || null);
    setRpsGame(activeGames['rps'] || null);
    setCookieBattleGame(activeGames['cookieBattle'] || null);
  });

  return () => unsubscribe();
}, [student, studentTeacherId]);
```

#### Task 5.3: Fix Package.json Wildcards

**File:** `package.json`

```json
{
  "dependencies": {
    "clsx": "^2.1.0",        // was "*"
    "tailwind-merge": "^2.2.0"  // was "*"
  }
}
```

---

## Rollback Plan

If issues occur after deployment:

### Quick Rollback (Rules Only)
```bash
# Revert to permissive rules temporarily
firebase deploy --only firestore:rules
```

### Full Rollback
```bash
# Revert frontend changes
git checkout main -- src/contexts/AuthContext.tsx

# Disable Cloud Function
firebase functions:delete loginStudent

# Deploy old rules
firebase deploy --only firestore:rules
```

---

## Timeline Summary

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| 1 | Cloud Function Setup | 1-2 days | None |
| 2 | Frontend Auth Integration | 1-2 days | Phase 1 |
| 3 | Firestore Rules Update | 1 day | Phase 2 |
| 4 | Testing | 1-2 days | Phase 3 |
| 5 | Performance Optimization | 1 day | Phase 4 |

**Total Estimated Time: 5-8 days**

---

## Success Criteria

1. **Security**
   - [ ] Students cannot modify other students' data
   - [ ] Game results cannot be manipulated via browser devtools
   - [ ] All writes are authenticated

2. **User Experience**
   - [ ] Student login flow unchanged (code only)
   - [ ] All existing features work correctly
   - [ ] No noticeable performance degradation

3. **Performance**
   - [ ] Login time < 2 seconds
   - [ ] Dashboard load time unchanged
   - [ ] Reduced Firestore reads from listener consolidation

---

## Appendix: Files to Modify

| File | Change Type | Priority |
|------|-------------|----------|
| `functions/src/index.ts` | New function | P1 |
| `firestore.indexes.json` | New index | P1 |
| `firestore.rules` | Major update | P1 |
| `src/contexts/AuthContext.tsx` | Modify login | P1 |
| `src/services/firebase.ts` | Add functions init | P2 |
| `src/pages/StudentDashboardNew.tsx` | Optimize listeners | P3 |
| `package.json` | Fix versions | P3 |

---

## Questions for Stakeholder

1. Is there a staging/test environment to test changes before production?
2. Should we notify users about a maintenance window?
3. Are there any other features that write to Firestore not covered in this plan?
