# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Overview

**Dahandin ("다했니?")** - Educational gamification system for student learning motivation.

- **Core Concept**: Cookie "change amount" based games (not total balance) - ensures fairness
- **Teacher**: Class management, cookie sync, team battles, shop management
- **Student**: Dashboard, grass tracking, shop, profile customization, mini-games

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server (localhost:5173)
npm run build        # Production build (dist/)

# Firebase deployment
npx firebase deploy --only hosting           # Hosting only
npx firebase deploy --only firestore:rules   # Firestore rules
npx firebase deploy                          # Full deploy
```

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS v4 (index.css)
- Radix UI / shadcn/ui (`src/components/ui/`)
- Firebase (Auth, Firestore, Storage)
- External: Dahandin API (api.dahandin.com)

## Directory Structure

```
src/
├── App.tsx              # Query parameter routing
├── contexts/
│   ├── AuthContext.tsx    # Auth (teacher/student)
│   ├── GameContext.tsx    # Game/team state
│   └── StudentContext.tsx # Student profile cache
├── services/
│   ├── firebase.ts        # Firebase init
│   └── firestoreApi.ts    # Firestore CRUD
├── pages/               # Main pages (20+)
├── games/               # Mini-games (student/teacher pairs)
├── components/
│   ├── ui/              # shadcn/ui primitives
│   └── wordcloud/       # Word cloud components
├── types/
│   ├── student.ts       # Profile styles (BORDER_STYLES, NAME_EFFECTS, etc.)
│   ├── shop.ts          # Shop items
│   └── game.ts          # Game types
└── utils/               # Utilities
```

## Firebase Structure

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

## Routing

Query parameter based routing in `App.tsx`:
- `/` → Login or Dashboard
- `/?game=<type>` → Game (with gameId, studentCode, etc.)

Game types: `baseball`, `minority`, `bullet-dodge`, `rps`, `cookie-battle`, `word-chain`, `wordcloud` (each has `-teacher` version)

## Key Patterns

### Game Structure
Each game has paired components:
- `GameName.tsx` - Student version
- `GameNameTeacher.tsx` - Teacher control panel

### Real-time Sync
```typescript
const unsubscribe = onSnapshot(
  doc(db, 'games', gameId),
  (snapshot) => { /* handle */ }
);
return () => unsubscribe();
```

### Currency System
| Currency | Description |
|----------|-------------|
| `cookie` | External currency from Dahandin API |
| `jelly` | Internal currency for games/shop |
| `previousCookie` | For grass calculation (change tracking) |

### Profile System
Style constants in `src/types/student.ts`:
- `BORDER_STYLES`, `NAME_EFFECTS`, `TITLE_COLORS`
- `BACKGROUND_PATTERNS`, `ANIMATION_EFFECTS`, `PROFILE_EMOJIS`

### Auth Flow
- **Teacher**: Firebase Auth (email/password) → Firestore document
- **Student**: Code-based login → `findStudentByCode()` → localStorage

## Cookie Battle Game

### Core Concept
```
Team Resource = Σ(member cookie changes)
Cookie Change = Current Cookie - Previous Cookie
```
Fairness: Low-cookie students can win by effort (change-based, not balance-based)

### Battle Mechanics
```
Win Rate = Attack / (Attack + Defense) × 100
Limit: 10% min ~ 90% max
```

### Loss Modes
| Mode | Winner Gets | Loser Loses |
|------|-------------|-------------|
| Default | 30% of opponent bet | Full bet |
| Zero-sum | Full opponent bet | Full bet |
| Soft | 20% of opponent bet | 50% of bet |

### Defense Penalty
Unattacked team's defense cookies → 50% penalty

## Firebase Permissions

**Student-writable paths:**
- `teachers/{teacherId}/students/{studentCode}`
- `teachers/{teacherId}/wishes/{wishId}`
- `teachers/{teacherId}/cookieShopRequests/{requestId}`
- `games/{gameId}/**`

**Teacher-only paths:**
- `teachers/{teacherId}/classes/{classId}`
- `teachers/{teacherId}/shop/{itemId}`
- `teachers/{teacherId}/classGroups/{groupId}`

## Shared Components

| Component | Used In |
|-----------|---------|
| `StudentProfileCard` | StudentDashboardNew, StudentGrass, DemoStudent |
| `GrassCalendar` | StudentGrass, StudentDashboard, TeacherDashboard |
| `ProfilePhotoUpload` | StudentDashboardNew, profile settings |

## UI Patterns

| Pattern | Solution |
|---------|----------|
| Modal overflow | `max-h-[70vh]` + `overflow-y-auto` |
| Team buttons (Teacher) | `w-32 h-32` (130×130px) |
| Team buttons (Student) | `w-24 h-24` (100×100px) |
| Grass date filtering | `dayOfWeek >= 1 && dayOfWeek <= 5` |
| Future date prevention | `date <= today` |

## Common Issues

| Issue | Solution |
|-------|----------|
| Permission denied (student) | Check `firestore.rules` |
| Modal overflow on mobile | Use `max-h-[70vh]` + `overflow-y-auto` |
| Style not applying | Check type definitions in `types/student.ts` |
| Game not syncing | Verify `onSnapshot` listener |
| Grass showing weekends | Add weekday filter |

## Development

### Branch Policy
- Main branch protected → PR workflow
- Feature branches: `feat/<name>`, `fix/<name>`

### Style Rules
- Korean UI text
- Tailwind classes (check `index.css`)
- Custom animations in `src/types/student.ts`

### Game Dev Checklist
- [ ] Develop teacher/student versions together
- [ ] Use Firestore `onSnapshot`
- [ ] Store state in `games/{gameId}`
- [ ] Handle player join/leave
- [ ] Test with multiple players

## Deployment

- Firebase project: `dahatni-dbe19`
- Hosting: https://dahatni-dbe19.web.app
- Build first: `npm run build && npx firebase deploy --only hosting`

## Testing

- [ ] Teacher dashboard
- [ ] Student dashboard
- [ ] Game flow (both roles)
- [ ] Mobile responsiveness
- [ ] Firebase permissions
