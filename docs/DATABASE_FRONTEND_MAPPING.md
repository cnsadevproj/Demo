# Database to Frontend Mapping

This document maps Firestore database collections to their frontend representations and usage.

---

## Collection Structure Overview

```
teachers/{teacherId}/
├── classes/{classId}/
│   ├── grass/{date}
│   ├── teams/{teamId}
│   ├── cookieShopItems/{itemId}
│   ├── cookieShopRequests/{requestId}
│   ├── battles/{battleId}
│   └── wordclouds/{sessionId}/responses/{studentCode}
├── students/{studentCode}
├── shop/{itemId}
├── wishes/{wishId}
├── classGroups/{groupId}
└── itemSuggestions/{id}

games/{gameId}/
├── players/{studentCode}
├── teams/{teamId}
├── studentInfo/{studentCode}
└── history/{docId}
```

---

## Detailed Collection Mappings

### 1. Teachers Collection

**Path:** `teachers/{teacherId}`

| Field | Type | Frontend Usage |
|-------|------|----------------|
| `email` | string | TeacherDashboard settings |
| `name` | string | Header display, welcome message |
| `schoolName` | string | Profile display |
| `dahandinApiKey` | string | Cookie sync API calls |
| `createdAt` | timestamp | Account creation date |

**Frontend Components:**
- `TeacherDashboard.tsx` - Teacher profile display
- `AuthContext.tsx` - Authentication state

---

### 2. Students Collection

**Path:** `teachers/{teacherId}/students/{studentCode}`

| Field | Type | Frontend Usage |
|-------|------|----------------|
| `code` | string | Login, identification |
| `name` | string | Display name, profile |
| `classId` | string | Class assignment |
| `cookie` | number | Currency display, games |
| `jelly` | number | Shop currency |
| `previousCookie` | number | Grass calculation |
| `borderStyle` | string | Profile card border |
| `nameEffect` | string | Name animation effect |
| `titleColor` | string | Title text color |
| `backgroundPattern` | string | Card background |
| `animationEffect` | string | Card animation |
| `profileEmoji` | string | Profile decoration |
| `photoUrl` | string | Profile picture |

**Frontend Components:**
- `StudentDashboardNew.tsx` - Main student dashboard
- `StudentProfileCard.tsx` - Profile display component
- `StudentProfile.tsx` - Profile editing
- `Shop.tsx` - Currency display, purchases
- `StudentGrass.tsx` - Learning progress

**Style Types Location:** `src/types/student.ts`
- `BORDER_STYLES`
- `NAME_EFFECTS`
- `TITLE_COLORS`
- `BACKGROUND_PATTERNS`
- `ANIMATION_EFFECTS`
- `PROFILE_EMOJIS`

---

### 3. Classes Collection

**Path:** `teachers/{teacherId}/classes/{classId}`

| Field | Type | Frontend Usage |
|-------|------|----------------|
| `name` | string | Class selector dropdown |
| `teacherId` | string | Parent reference |
| `createdAt` | timestamp | Sorting |

**Frontend Components:**
- `TeacherDashboard.tsx` - Class list, selector
- `AuthContext.tsx` - selectedClass state

---

### 4. Grass Collection (Learning Progress)

**Path:** `teachers/{teacherId}/classes/{classId}/grass/{date}`

| Field | Type | Frontend Usage |
|-------|------|----------------|
| `date` | string | Calendar date (YYYY-MM-DD) |
| `students` | map | Student progress per day |
| `students.{code}.cookieChange` | number | Daily cookie change |

**Frontend Components:**
- `GrassCalendar.tsx` - GitHub-style activity grid
- `StudentGrass.tsx` - Student grass view
- `TeacherDashboard.tsx` - Class overview

**Filtering Logic:**
```typescript
// Only show weekdays (Mon-Fri)
dayOfWeek >= 1 && dayOfWeek <= 5
// Don't show future dates
date <= today
```

---

### 5. Teams Collection

**Path:** `teachers/{teacherId}/classes/{classId}/teams/{teamId}`

| Field | Type | Frontend Usage |
|-------|------|----------------|
| `name` | string | Team display name |
| `color` | string | Team color (hex) |
| `emoji` | string | Team icon |
| `members` | array | Student codes |

**Frontend Components:**
- `GameTeamManager.tsx` - Team management
- `CookieBattleTeacher.tsx` - Battle setup

---

### 6. Cookie Shop Items

**Path:** `teachers/{teacherId}/classes/{classId}/cookieShopItems/{itemId}`
**OR:** `teachers/{teacherId}/cookieShopItems/{itemId}`

| Field | Type | Frontend Usage |
|-------|------|----------------|
| `name` | string | Item display name |
| `price` | number | Cookie cost |
| `description` | string | Item description |
| `stock` | number | Available quantity |
| `category` | string | Item category |

**Frontend Components:**
- `Shop.tsx` - Student shop view
- `TeacherDashboard.tsx` - Shop management

---

### 7. Cookie Shop Requests

**Path:** `teachers/{teacherId}/classes/{classId}/cookieShopRequests/{requestId}`

| Field | Type | Frontend Usage |
|-------|------|----------------|
| `studentCode` | string | Requester identification |
| `studentName` | string | Display name |
| `itemId` | string | Purchased item |
| `itemName` | string | Item display |
| `price` | number | Transaction amount |
| `status` | string | pending/approved/rejected |
| `createdAt` | timestamp | Request time |

**Frontend Components:**
- `Shop.tsx` - Student purchase history
- `TeacherDashboard.tsx` - Request approval

**Security Rule (NEW):**
```
allow create: if isStudentOf(teacherId) &&
  request.resource.data.studentCode == getStudentCode()
```

---

### 8. Wishes Collection

**Path:** `teachers/{teacherId}/wishes/{wishId}`

| Field | Type | Frontend Usage |
|-------|------|----------------|
| `studentCode` | string | Author identification |
| `studentName` | string | Display name |
| `content` | string | Wish text |
| `status` | string | pending/approved/denied |
| `createdAt` | timestamp | Submission time |

**Frontend Components:**
- `WishingStone.tsx` - Student wish submission
- `TeacherDashboard.tsx` - Wish management

**Security Rule (NEW):**
```
allow create: if isStudentOf(teacherId) &&
  request.resource.data.studentCode == getStudentCode()
```

---

### 9. Games Collection

**Path:** `games/{gameId}`

| Field | Type | Frontend Usage |
|-------|------|----------------|
| `type` | string | Game type identifier |
| `teacherId` | string | Creator |
| `status` | string | waiting/playing/finished |
| `settings` | map | Game configuration |
| `createdAt` | timestamp | Creation time |

**Game Types:**
- `baseball` - Baseball game
- `minority` - Minority game
- `bullet-dodge` - Bullet dodge game
- `rps` - Rock-paper-scissors
- `cookie-battle` - Team cookie battle
- `word-chain` - Word chain game
- `wordcloud` - Word cloud activity

**Frontend Components:**
- Each game has paired components:
  - `{GameName}.tsx` - Student version
  - `{GameName}Teacher.tsx` - Teacher control panel

---

### 10. Game Players

**Path:** `games/{gameId}/players/{studentCode}`

| Field | Type | Frontend Usage |
|-------|------|----------------|
| `code` | string | Player identification |
| `name` | string | Display name |
| `score` | number | Game score |
| `status` | string | Player state |
| `teamId` | string | Team assignment |

**Security Rule (NEW):**
```
allow write: if isAuthenticated() && (
  request.auth.token.role != 'student' ||
  request.auth.token.studentCode == playerId
)
```

---

### 11. Game Teams (Cookie Battle)

**Path:** `games/{gameId}/teams/{teamId}`

| Field | Type | Frontend Usage |
|-------|------|----------------|
| `name` | string | Team name |
| `members` | array | Team members |
| `attack` | number | Attack allocation |
| `defense` | number | Defense allocation |
| `totalCookies` | number | Team resources |

**Frontend Components:**
- `CookieBattle.tsx` - Student betting UI
- `CookieBattleTeacher.tsx` - Battle management

---

### 12. Word Chain History

**Path:** `games/{gameId}/history/{docId}`

| Field | Type | Frontend Usage |
|-------|------|----------------|
| `word` | string | Submitted word |
| `playerCode` | string | Submitter |
| `playerName` | string | Display name |
| `timestamp` | timestamp | Submission time |

**Frontend Components:**
- `WordChain.tsx` - Word display
- `WordChainTeacher.tsx` - Game management

---

### 13. Wordcloud Responses

**Path:** `teachers/{teacherId}/classes/{classId}/wordclouds/{sessionId}/responses/{studentCode}`

| Field | Type | Frontend Usage |
|-------|------|----------------|
| `word` | string | Student's word |
| `studentCode` | string | Submitter |
| `studentName` | string | Display name |
| `timestamp` | timestamp | Submission time |

**Frontend Components:**
- `Wordcloud.tsx` - Student submission
- `WordcloudTeacher.tsx` - Word visualization

**Security Rule (NEW):**
```
allow write: if isTeacher(teacherId) ||
  (isStudentOf(teacherId) && getStudentCode() == studentCode)
```

---

## Authentication Data Flow

### Custom Token Claims

When a student logs in, the Custom Token contains:

```typescript
{
  studentCode: string,  // Student's unique code
  teacherId: string,    // Teacher's Firebase UID
  classId: string,      // Student's class ID
  role: 'student'       // Role identifier
}
```

### Token → UI Mapping

| Token Claim | AuthContext State | Component Usage |
|-------------|-------------------|-----------------|
| `studentCode` | `student.code` | Profile, games |
| `teacherId` | `studentTeacherId` | Firestore queries |
| `classId` | `student.classId` | Class-specific data |
| `role` | `role` | UI routing |

### State Propagation

```
Cloud Function → Custom Token → signInWithCustomToken
       ↓
onAuthStateChanged → getIdTokenResult().claims
       ↓
AuthContext state (student, studentTeacherId, role)
       ↓
useAuth() hook → Components
```

---

## Query Patterns

### Teacher Reading Class Students
```typescript
collection(db, 'teachers', teacherId, 'students')
```

### Student Reading Own Data
```typescript
doc(db, 'teachers', studentTeacherId, 'students', studentCode)
```

### Real-time Game Updates
```typescript
onSnapshot(doc(db, 'games', gameId), callback)
```

### Grass Calendar Data
```typescript
collection(db, 'teachers', teacherId, 'classes', classId, 'grass')
  .where('date', '>=', startDate)
  .where('date', '<=', endDate)
```

---

## Performance Considerations

### N+1 Query Prevention
- Use batch reads for multiple students
- Cache teacher data in AuthContext
- Use collectionGroup for cross-teacher searches

### Real-time Listener Management
- Unsubscribe on component unmount
- Use selective field listening when possible
- Limit listener depth (avoid nested listeners)

### Index Requirements
- `students` collectionGroup on `code` field (ADDED)
- Date range queries on `grass` collection
- Compound indexes for filtered queries
