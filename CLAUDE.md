# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"다했니?" is an educational gamification system combining team-based weekly missions with individual learning progress tracking (grass visualization).

- **Teacher**: Class management, student cookie sync, mini-games, shop management
- **Student**: Dashboard, grass tracking, shop purchases, profile customization, mini-games

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server (localhost:5173)
npm run build        # Production build (dist/)

# Firebase deployment
npx firebase deploy --only hosting           # Hosting only
npx firebase deploy --only firestore:rules   # Firestore rules only
npx firebase deploy                          # Full deploy
```

## Architecture

### Tech Stack
- React 18 + TypeScript + Vite
- Tailwind CSS v4 (defined in index.css)
- Radix UI primitives (`src/components/ui/`)
- Firebase (Auth, Firestore, Storage)
- Google Apps Script (Sheets sync)

### Directory Structure
```
src/
├── App.tsx              # Routing (query parameter based)
├── contexts/            # Global state management
│   ├── AuthContext.tsx    # Auth (teacher/student)
│   └── StudentContext.tsx # Student profile cache
├── services/
│   ├── firebase.ts        # Firebase initialization
│   └── firestoreApi.ts    # All Firestore CRUD functions
├── pages/               # Main page components
│   ├── TeacherDashboard.tsx  # Teacher dashboard (tab-based)
│   └── StudentDashboardNew.tsx # Student dashboard (tab-based)
├── games/               # Mini-games (student/teacher pairs)
├── components/
│   ├── ui/              # shadcn/ui style primitives
│   └── wordcloud/       # Word cloud components
├── types/               # Type and constant definitions
│   ├── student.ts         # Profile styles (BORDER_STYLES, NAME_EFFECTS, etc.)
│   ├── shop.ts            # Shop item definitions
│   └── game.ts            # Game-related types
└── utils/               # Utility functions
apps-script/             # Google Sheets integration scripts
```

### Firebase Structure
```
teachers/{teacherId}/
  ├── classes/{classId}
  │   ├── grass/{date}          # Daily grass data
  │   ├── teams/{teamId}        # Team data
  │   ├── cookieShopItems/{itemId}
  │   ├── cookieShopRequests/{requestId}
  │   ├── battles/{battleId}
  │   └── wordclouds/{sessionId}/responses/{studentCode}
  ├── students/{studentCode}    # Student data (accessible by students)
  ├── shop/{itemId}             # Shop items
  ├── wishes/{wishId}           # Wish/guestbook data
  ├── classGroups/{groupId}     # Class groups for wish sharing
  └── itemSuggestions/{id}      # Student item suggestions
games/{gameId}/
  ├── players/{studentCode}
  ├── teams/{teamId}
  ├── studentInfo/{studentCode}
  └── history/{docId}           # Word chain history
```

### Routing
Query parameter routing in `App.tsx`:
- `/` → Login or Dashboard
- `/?game=<type>` → Game (with gameId, studentCode, etc.)

Game types: `baseball`, `minority`, `bullet-dodge`, `rps`, `cookie-battle`, `word-chain`, `wordcloud` (each has `-teacher` version)

## Key Patterns

### Game Structure
Each game has paired components:
- `GameName.tsx` - Student version (opens in new window)
- `GameNameTeacher.tsx` - Teacher control panel

Game URL example:
```
/?game=cookie-battle&gameId=xxx&studentCode=xxx&studentName=xxx
/?game=cookie-battle-teacher&gameId=xxx
```

### Real-time Sync Pattern
Games use Firestore `onSnapshot` for real-time updates:
```typescript
const unsubscribe = onSnapshot(
  doc(db, 'games', gameId),
  (snapshot) => { /* handle update */ }
);
return () => unsubscribe();
```

### Currency System
- **cookie**: External currency (synced from 다했니 API via Google Sheets)
- **jelly**: Internal currency for games/shop purchases
- **previousCookie**: Stored for grass calculation (cookie difference tracking)

### Profile System
Style constants in `src/types/student.ts`:
- `BORDER_STYLES`: Border styles (none, solid, gradient-*, neon-*, pulse, sparkle)
- `NAME_EFFECTS`: Name effects (gradient-*, glow-*, shadow)
- `TITLE_COLORS`: Title background colors (10 options)
- `BACKGROUND_PATTERNS`: Card backgrounds (dots, stripes, waves, etc.)
- `ANIMATION_EFFECTS`: Animations (pulse, spin, bounce, shake, etc.)
- `PROFILE_EMOJIS`: Emoji options for profiles

### Auth Flow
- **Teacher**: Firebase Auth (email/password) → Firestore teacher document
- **Student**: Code-based login → finds student via `findStudentByCode()` → stores in localStorage

## Development Guidelines

### Branch Policy
- Main branch is protected → PR workflow required
- Create feature branches from main: `feat/<feature-name>`, `fix/<bug-name>`

### Pre-Work Workflow (IMPORTANT)
Before making any changes, Claude Code should:
1. **Check current branch**: `git branch --show-current`
2. **Find previous working branch**: `git branch -a --sort=-committerdate` (most recent first)
3. **Checkout the previous branch** (or create new if needed)
4. **Fetch and check main for new commits**: `git fetch origin && git log HEAD..origin/main --oneline`
5. **If new commits exist on main**:
   - Summarize what changed
   - Sync current branch: `git merge origin/main`
6. **Then proceed with modifications**
7. **Commit and push to the working branch**

### Firebase Permissions (IMPORTANT)
**Permission errors occur frequently.** When adding features, check `firestore.rules`:

1. **Student-accessible paths** (allow write: true):
   - `teachers/{teacherId}/students/{studentCode}`
   - `teachers/{teacherId}/wishes/{wishId}`
   - `teachers/{teacherId}/cookieShopRequests/{requestId}`
   - `games/{gameId}/**` (most sub-collections)

2. **Teacher-only paths** (request.auth.uid == teacherId):
   - `teachers/{teacherId}/classes/{classId}`
   - `teachers/{teacherId}/shop/{itemId}`
   - `teachers/{teacherId}/classGroups/{groupId}`

3. **Common permission issues**:
   - Student trying to read other students' data
   - Student writing to game data without proper rules
   - Missing `request.auth != null` check

4. **Before deploying new features**: `npx firebase deploy --only firestore:rules`

### Shared Components (Update ALL usages when modifying)

| Component | Used In |
|-----------|---------|
| `StudentProfileCard` | StudentDashboardNew, StudentGrass, DemoStudent, ProfilePreview |
| `GrassCalendar` | StudentGrass, StudentDashboard, DemoStudent, TeacherDashboard |
| `ReflectionGrass` | Grass-related pages, reflection king feature |
| `ProfilePhotoUpload` | StudentDashboardNew, profile settings |
| `FeedbackModal` | TeacherDashboard, StudentDashboardNew |

### UI Patterns (From Git History)

| Pattern | Solution |
|---------|----------|
| Modal overflow | `max-h-[70vh]` + `overflow-y-auto` |
| Team buttons (Teacher) | Fixed `130×130px` or `w-32 h-32` |
| Team buttons (Student) | Fixed `100×100px` or `w-24 h-24` |
| Grass date filtering | `dayOfWeek >= 1 && dayOfWeek <= 5` (weekdays only) |
| Future date prevention | `date <= today` check |

### Style Rules
- Maintain Korean UI text
- Use Tailwind classes (check `index.css` for custom utilities)
- Custom animations defined in `src/types/student.ts`

### Game Development Checklist
- [ ] Develop teacher/student versions together
- [ ] Use Firestore real-time subscriptions (`onSnapshot`)
- [ ] Store game state in `games/{gameId}` document
- [ ] Handle player join/leave gracefully
- [ ] Test with multiple simultaneous players

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Permission denied (student) | Check `firestore.rules` for student access path |
| Permission denied (teacher) | Verify `teacherId` matches in Firestore query |
| Modal overflow on mobile | Use `max-h-[70vh]` with `overflow-y-auto` |
| Style not applying | Check if CSS class exists in type definitions |
| Game not syncing | Verify `onSnapshot` listener setup and cleanup |
| Grass showing weekends | Add `dayOfWeek >= 1 && dayOfWeek <= 5` filter |
| Future dates in grass | Add `date <= today` validation |
| Profile styles not rendering | Verify style constant exists in `types/student.ts` |

## Deployment

- Firebase project: `dahatni-dbe19`
- Hosting: https://dahatni-dbe19.web.app
- Always build before deploy: `npm run build && npx firebase deploy --only hosting`

## Testing Checklist

Before committing:
- [ ] Teacher dashboard functionality
- [ ] Student dashboard functionality
- [ ] Game flow (both teacher and student)
- [ ] Mobile responsiveness
- [ ] Firebase permissions (test as both roles)
