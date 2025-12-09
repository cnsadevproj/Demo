# VS Code AI 구현 가이드: 상점 & 팀 만들기

---

## 프로젝트 기본 

### 기술 스택
- React 18 + TypeScript + Vite
- Tailwind CSS
- shadcn/ui (Radix UI 기반)
- Google Apps Script + Google Sheets (백엔드)

### 폴더 구조
```
src/
├── App.tsx                    # 메인 앱 (라우팅)
├── contexts/
│   ├── AuthContext.tsx        # 인증 상태 (로그인, 학급 선택)
│   └── GameContext.tsx        # 게임/팀 상태 관리
├── services/
│   ├── sheets.ts              # Sheets API 기본
│   └── sheetsApi.ts           # Sheets API 확장 (주로 사용)
├── pages/
│   ├── Shop.tsx               # 상점 페이지
│   ├── GameTeamManager.tsx    # 팀 관리 페이지
│   └── TeacherDashboard.tsx   # 교사 대시보드
├── types/
│   ├── shop.ts                # 상점 타입 정의
│   └── game.ts                # 게임/팀 타입 정의
└── components/ui/             # shadcn/ui 컴포넌트들
```

---

## 1. 상점 페이지 (Shop.tsx)

### 현재 상태
- 아이템 목록 표시됨
- 구매 기능 작동함
- 카테고리별 탭 있음

### 추가 구현 필요한 것들

#### 1-1. 프로필 미리보기 카드
구매한 아이템을 적용하면 어떻게 보이는지 미리보기 표시

```tsx
// 상점 페이지 맨 위에 프로필 미리보기 카드 추가
// 현재 장착된 아이템 + 선택한 아이템 미리보기

function 프로필미리보기({ 학생정보, 미리보기아이템 }) {
  return (
    <Card>
      <CardContent>
        {/* 이모지 표시 */}
        <span className="text-4xl">{현재이모지}</span>

        {/* 이름 + 효과 */}
        <span className={이름효과클래스}>{학생정보.name}</span>

        {/* 칭호 + 색상 */}
        <Badge className={칭호색상클래스}>{학생정보.title}</Badge>

        {/* 테두리, 배경 적용 */}
      </CardContent>
    </Card>
  );
}
```

#### 1-2. 아이템 장착 기능
구매한 아이템을 프로필에 적용하는 버튼

```tsx
// sheetsApi.ts에 있는 saveProfile 함수 사용

import { saveProfile } from '../services/sheetsApi';

const 아이템장착 = async (아이템) => {
  // 카테고리에 따라 저장할 필드 결정
  const 프로필데이터 = {};

  if (아이템.category === 'emoji') {
    프로필데이터.emojiCode = 아이템.code;
  } else if (아이템.category === 'border') {
    프로필데이터.borderCode = 아이템.code;
  }
  // ... 나머지 카테고리도 동일

  const 성공 = await saveProfile(학급명, 학생코드, 프로필데이터);

  if (성공) {
    // 학생 정보 다시 불러오기
    // 성공 메시지 표시
  }
};
```

#### 1-3. 필터 기능
"전체", "보유중", "미보유" 필터 탭

```tsx
const [필터, set필터] = useState('전체'); // '전체' | '보유' | '미보유'

const 필터된아이템 = 카테고리아이템.filter(아이템 => {
  const 보유중 = 학생.ownedItems.includes(아이템.code);

  if (필터 === '보유') return 보유중;
  if (필터 === '미보유') return !보유중;
  return true; // 전체
});
```

#### 1-4. 상태 뱃지 표시
각 아이템 카드에 상태 표시

- **장착중** (파란색): 현재 프로필에 적용된 아이템
- **보유중** (초록색): 구매했지만 장착 안한 아이템
- **구매가능** (보라색): 쿠키 충분히 있음
- **쿠키 부족** (회색): 쿠키 부족

### 사용하는 API

```typescript
// src/services/sheetsApi.ts

// 상점 아이템 목록 가져오기
getShopItems(): Promise<SheetShopItem[]>

// 학생 정보 가져오기 (보유 아이템 목록 포함)
getStudent(학생코드, 학급명): Promise<SheetStudent>

// 아이템 구매
purchaseItem(학급명, 학생코드, 아이템코드): Promise<{ success, message }>

// 프로필 저장 (아이템 장착)
saveProfile(학급명, 학생코드, 프로필데이터): Promise<boolean>
```

### 데이터 타입

```typescript
// 학생 정보
interface SheetStudent {
  number: number;        // 번호
  name: string;          // 이름
  code: string;          // 학생코드
  cookie: number;        // 현재 쿠키
  usedCookie: number;    // 사용한 쿠키
  totalCookie: number;   // 총 누적 쿠키

  // 프로필 관련
  emojiCode: string;       // 장착된 이모지 코드
  title: string;           // 칭호 (5글자)
  titleColorCode: string;  // 칭호 색상 코드
  borderCode: string;      // 테두리 코드
  nameEffectCode: string;  // 이름 효과 코드
  backgroundCode: string;  // 배경 코드
  ownedItems: string[];    // 보유한 아이템 코드 목록
}

// 상점 아이템
interface SheetShopItem {
  code: string;       // "emoji_01"
  category: string;   // "emoji", "border", "nameEffect", "background", "titleColor"
  name: string;       // "😎 쿨한"
  price: number;      // 5
  value: string;      // "😎"
  description: string;
}
```

---

## 2. 팀 만들기 (GameTeamManager.tsx)

### 현재 상태
- 팀 생성/삭제 가능
- 자동 랜덤 배정 가능
- 팀원 추가/제거 가능
- **문제**: localStorage에만 저장됨 (Google Sheets 연동 안됨)
- **문제**: 쿠키 변화량 계산 안됨

### 추가 구현 필요한 것들

#### 2-1. Google Sheets에서 팀 불러오기

```tsx
import { getTeams } from '../services/sheetsApi';

// 페이지 로드할 때 실행
useEffect(() => {
  const 팀불러오기 = async () => {
    if (!선택된학급) return;

    const 시트팀목록 = await getTeams(선택된학급);

    if (시트팀목록.length > 0) {
      // 불러온 팀 데이터를 GameContext에 설정
      시트팀목록.forEach(팀 => {
        // SheetTeam → GameTeam 변환 후 저장
      });
    }
  };

  팀불러오기();
}, [선택된학급]);
```

#### 2-2. Google Sheets에 팀 저장하기

```tsx
import { saveTeams } from '../services/sheetsApi';

const 팀저장하기 = async () => {
  if (!선택된학급) {
    alert('학급을 먼저 선택해주세요');
    return;
  }

  // GameTeam → SheetTeam 형식으로 변환
  const 저장할팀목록 = teams.map(팀 => ({
    teamId: 팀.id,
    teamName: 팀.name,
    flag: 팀.flag,
    members: 팀.memberCodes,
    teamCookie: 팀.totalCookies,
  }));

  const 성공 = await saveTeams(선택된학급, 저장할팀목록);

  if (성공) {
    alert('팀 정보가 저장되었습니다!');
  } else {
    alert('저장에 실패했습니다');
  }
};
```

#### 2-3. 쿠키 변화량 계산

**핵심 개념**: 팀의 자원 = 팀원들의 쿠키 변화량 합계

```tsx
import { getClassStudents } from '../services/sheetsApi';

// 쿠키 변화량 = 현재쿠키 - 이전쿠키
const 팀쿠키계산 = (팀, 학생목록) => {
  let 총변화량 = 0;

  for (const 멤버코드 of 팀.memberCodes) {
    const 학생 = 학생목록.find(s => s.code === 멤버코드);
    if (학생) {
      const 변화량 = 학생.cookie - 학생.previousCookie;
      총변화량 += 변화량;
    }
  }

  return 총변화량;
};

// 팀 쿠키 새로고침 버튼
const 팀쿠키새로고침 = async () => {
  const 학생목록 = await getClassStudents(선택된학급);

  teams.forEach(팀 => {
    const 기본쿠키 = 팀쿠키계산(팀, 학생목록);
    updateTeam(팀.id, { baseCookies: 기본쿠키 });
  });

  alert('팀 쿠키가 업데이트되었습니다!');
};
```

#### 2-4. 팀당 인원 설정

```tsx
const [팀당인원, set팀당인원] = useState(4);

// UI
<div className="flex items-center gap-4">
  <label>팀당 인원:</label>
  <select
    value={팀당인원}
    onChange={(e) => set팀당인원(Number(e.target.value))}
  >
    <option value={3}>3명</option>
    <option value={4}>4명 (권장)</option>
    <option value={5}>5명</option>
  </select>

  <Button onClick={자동배정}>
    🔀 자동 배정
  </Button>
</div>
```

#### 2-5. 팀 카드 UI

```tsx
// 각 팀 표시
<Card>
  <CardHeader>
    <div className="flex items-center gap-2">
      <span className="text-3xl">{팀.flag}</span>
      <CardTitle>{팀.name}</CardTitle>
      <Badge>{팀.memberCodes.length}명</Badge>
      <Badge variant="outline">🍪 {팀.totalCookies}</Badge>
    </div>
  </CardHeader>

  <CardContent>
    {/* 팀원 목록 */}
    <div className="flex flex-wrap gap-2">
      {팀.memberCodes.map((코드, idx) => (
        <Badge key={코드} className="flex items-center gap-1">
          {팀.memberNames[idx]}

          {/* 쿠키 변화량 표시 */}
          <span className="text-green-600">+{변화량}</span>

          {/* 제거 버튼 */}
          <button onClick={() => 팀원제거(팀.id, 코드)}>✕</button>
        </Badge>
      ))}
    </div>
  </CardContent>

  <CardFooter>
    <Button onClick={() => 팀원추가(팀.id)}>팀원 추가</Button>
    <Button onClick={() => 팀수정(팀.id)}>수정</Button>
    <Button variant="destructive" onClick={() => 팀삭제(팀.id)}>삭제</Button>
  </CardFooter>
</Card>
```

### 사용하는 API

```typescript
// src/services/sheetsApi.ts

// 팀 목록 가져오기
getTeams(학급명): Promise<SheetTeam[]>

// 팀 저장하기
saveTeams(학급명, 팀목록): Promise<boolean>

// 학생 목록 가져오기 (쿠키 변화량 계산용)
getClassStudents(학급명): Promise<SheetStudent[]>
```

### 데이터 타입

```typescript
// Sheets에 저장되는 팀 형식
interface SheetTeam {
  teamId: string;      // "team_1732000000_abc123"
  teamName: string;    // "불꽃 드래곤"
  flag: string;        // "🐉"
  members: string[];   // ["ABC123", "DEF456", "GHI789"]
  teamCookie: number;  // 150
}

// 앱에서 사용하는 팀 형식
interface GameTeam {
  id: string;
  name: string;
  flag: string;
  memberCodes: string[];   // 학생 코드 배열
  memberNames: string[];   // 학생 이름 배열
  baseCookies: number;     // 쿠키 변화량 합계
  bonusCookies: number;    // 보너스 쿠키 (성찰왕 등)
  totalCookies: number;    // baseCookies + bonusCookies
}
```

### Google Sheets 시트 구조 ({학급}_팀)

| A열 | B열 | C열 | D열 | E열 |
|-----|-----|-----|-----|-----|
| 팀ID | 팀명 | 플래그 | 멤버(학생코드) | 팀쿠키 |
| team_123 | 불꽃 드래곤 | 🐉 | ABC123,DEF456,GHI789 | 150 |

---

## 3. 주의사항

### CORS 에러 해결 (매우 중요!)

Google Apps Script에 POST 요청할 때 반드시 `text/plain` 사용:

```typescript
// ❌ 이렇게 하면 CORS 에러
headers: { 'Content-Type': 'application/json' }

// ✅ 이렇게 해야 함
headers: { 'Content-Type': 'text/plain;charset=utf-8' }
```

### Context 사용법

```tsx
// 인증 정보
import { useAuth } from '../contexts/AuthContext';
const { selectedClass, studentCode, role } = useAuth();

// 게임/팀 정보
import { useGame } from '../contexts/GameContext';
const { teams, createTeam, updateTeam, deleteTeam, clearTeams } = useGame();
```

### 토스트 알림

```tsx
import { toast } from 'sonner';

toast.success('성공했습니다!');
toast.error('실패했습니다.');
```

---

## 4. 구현 순서 (권장)

### 상점 페이지
1. 프로필 미리보기 컴포넌트 만들기
2. 아이템 장착 버튼 추가
3. 필터 탭 추가 (전체/보유/미보유)
4. 상태 뱃지 추가 (장착중/보유중 등)

### 팀 만들기
1. Sheets에서 기존 팀 불러오기
2. Sheets에 팀 저장 버튼 추가
3. 쿠키 변화량 계산 함수 만들기
4. 팀 쿠키 새로고침 버튼 추가
5. 팀원 추가/제거 UI 개선

---

## 5. 테스트 방법

```bash
# 1. 개발 서버 실행
npm run dev

# 2. 테스트 순서
1. 교사로 로그인 (Sheets URL 입력)
2. 학급 선택
3. 팀 관리 → 자동 배정 → Sheets 저장
4. 학생으로 로그인 (학생 코드 입력)
5. 상점 → 아이템 구매 → 장착 테스트
```

---

## 6. 이미 있는 코드 참고

### 상점 관련
- `src/pages/Shop.tsx` - 현재 상점 페이지
- `src/types/shop.ts` - 상점 아이템 타입 및 기본 아이템 목록
- `src/services/sheetsApi.ts` - API 호출 함수들

### 팀 관련
- `src/pages/GameTeamManager.tsx` - 현재 팀 관리 페이지
- `src/contexts/GameContext.tsx` - 팀 상태 관리
- `src/types/game.ts` - 팀 타입 정의

### UI 컴포넌트
- `src/components/ui/` - Button, Card, Badge, Select 등
- lucide-react 아이콘 사용

---

*이 문서를 VS Code AI에 붙여넣기 하고 작업을 요청하세요.*
