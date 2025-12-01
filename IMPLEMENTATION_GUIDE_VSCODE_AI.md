# VS Code AI 구현 가이드: 상점 & 팀 만들기

이 문서는 VS Code AI (Copilot, Cursor 등)에게 전달하여 기능을 구현하기 위한 상세 명세입니다.

---

## 📁 프로젝트 구조 (중요)

```
src/
├── App.tsx                    # 메인 라우팅
├── contexts/
│   ├── AuthContext.tsx        # 인증 (selectedClass, studentCode 등)
│   └── GameContext.tsx        # 게임/팀 상태 관리
├── services/
│   ├── sheets.ts              # Sheets API (기본)
│   └── sheetsApi.ts           # Sheets API (확장) ⭐ 주요 사용
├── pages/
│   ├── Shop.tsx               # 상점 페이지 (학생용)
│   ├── GameTeamManager.tsx    # 팀 관리 (교사용)
│   └── TeacherDashboard.tsx   # 교사 대시보드
├── types/
│   ├── shop.ts                # 상점 아이템 타입
│   └── game.ts                # 게임/팀 타입
└── components/ui/             # shadcn/ui 컴포넌트
```

---

## 1️⃣ 상점 페이지 (Shop.tsx) - 학생용

### 현재 상태
- ✅ 기본 UI 구현됨
- ✅ 아이템 목록 표시
- ✅ 구매 기능 작동
- ❌ 프로필 적용 UI 없음
- ❌ 내가 보유한 아이템 필터 없음

### 개선 필요사항

#### 1.1 프로필 미리보기 추가
```tsx
// Shop.tsx 상단에 프로필 미리보기 카드 추가
// 현재 장착한 아이템으로 프로필이 어떻게 보이는지 실시간 표시

interface ProfilePreview {
  emoji: string;        // 현재 장착 이모지
  border: string;       // 현재 테두리 스타일
  nameEffect: string;   // 이름 효과
  background: string;   // 배경
  titleColor: string;   // 칭호 색상
}

// 미리보기 컴포넌트
function ProfilePreviewCard({ student, previewItem }: {
  student: SheetStudent;
  previewItem?: { category: ItemCategory; value: string };
}) {
  // 현재 장착 상태 + 미리보기 아이템 합성
  const preview = {
    emoji: previewItem?.category === 'emoji' ? previewItem.value : student.emojiCode,
    border: previewItem?.category === 'border' ? previewItem.value : student.borderCode,
    // ... 나머지
  };

  return (
    <Card className="bg-gradient-to-br from-purple-100 to-pink-100">
      {/* 프로필 카드 미리보기 렌더링 */}
    </Card>
  );
}
```

#### 1.2 아이템 장착 기능
```tsx
// 구매한 아이템을 프로필에 적용하는 버튼 추가
// sheetsApi.ts의 saveProfile 함수 사용

import { saveProfile, ProfileData } from '../services/sheetsApi';

const handleEquipItem = async (item: SheetShopItem) => {
  if (!student || !selectedClass) return;

  // 카테고리별로 적절한 필드 설정
  const profileData: ProfileData = {};

  switch (item.category) {
    case 'emoji':
      profileData.emojiCode = item.code;
      break;
    case 'border':
      profileData.borderCode = item.code;
      break;
    case 'nameEffect':
      profileData.nameEffectCode = item.code;
      break;
    case 'background':
      profileData.backgroundCode = item.code;
      break;
    case 'titleColor':
      profileData.titleColorCode = item.code;
      break;
  }

  const success = await saveProfile(selectedClass, student.code, profileData);
  if (success) {
    // 학생 정보 다시 로드
    const updated = await getStudent(student.code, selectedClass);
    setStudent(updated);
    toast.success('아이템을 장착했습니다!');
  }
};
```

#### 1.3 필터 탭 추가
```tsx
// "전체" | "보유" | "미보유" 필터
const [filter, setFilter] = useState<'all' | 'owned' | 'notOwned'>('all');

const filteredItems = categoryItems.filter(item => {
  const owned = student?.ownedItems.includes(item.code);
  if (filter === 'owned') return owned;
  if (filter === 'notOwned') return !owned;
  return true;
});
```

#### 1.4 아이템 상태 표시 개선
```tsx
// 각 아이템 카드에 상태 뱃지 추가
{owned && equipped && (
  <Badge className="bg-blue-500">장착중</Badge>
)}
{owned && !equipped && (
  <Badge className="bg-green-500">보유중</Badge>
)}
{!owned && canBuy && (
  <Badge className="bg-purple-500">구매가능</Badge>
)}
{!owned && !canBuy && (
  <Badge variant="outline">쿠키 부족</Badge>
)}
```

### API 엔드포인트 (이미 구현됨)

```typescript
// src/services/sheetsApi.ts

// 상점 아이템 조회
getShopItems(): Promise<SheetShopItem[]>

// 학생 정보 조회 (보유 아이템 포함)
getStudent(code: string, className: string): Promise<SheetStudent | null>

// 아이템 구매
purchaseItem(className: string, code: string, itemCode: string): Promise<{
  success: boolean;
  message?: string;
  itemCode?: string;
  price?: number;
}>

// 프로필 저장 (아이템 장착)
saveProfile(className: string, code: string, profileData: ProfileData): Promise<boolean>
```

### 타입 정의

```typescript
// src/services/sheetsApi.ts
interface SheetStudent {
  number: number;
  name: string;
  code: string;
  cookie: number;           // 현재 쿠키
  usedCookie: number;       // 사용한 쿠키
  totalCookie: number;      // 총 누적 쿠키
  // 프로필
  emojiCode: string;        // 예: "emoji_01"
  title: string;            // 커스텀 칭호 (5자)
  titleColorCode: string;   // 예: "title_05"
  borderCode: string;       // 예: "border_02"
  nameEffectCode: string;   // 예: "name_01"
  backgroundCode: string;   // 예: "bg_03"
  ownedItems: string[];     // 보유 아이템 코드 배열
}

interface SheetShopItem {
  code: string;       // "emoji_01"
  category: string;   // "emoji" | "border" | "nameEffect" | "background" | "titleColor"
  name: string;       // "😎 쿨한"
  price: number;      // 5
  value: string;      // "😎" (실제 값)
  description: string;
}
```

---

## 2️⃣ 팀 만들기 (GameTeamManager.tsx) - 교사용

### 현재 상태
- ✅ 팀 생성/삭제 기능
- ✅ 자동 팀 배정 (랜덤)
- ✅ 팀원 추가/제거
- ❌ Google Sheets 저장 없음 (localStorage만)
- ❌ 쿠키 변화량 계산 없음

### 개선 필요사항

#### 2.1 Sheets 연동 추가
```tsx
// GameTeamManager.tsx

import { saveTeams, getTeams, SheetTeam } from '../services/sheetsApi';

// 팀 저장 버튼 추가
const handleSaveToSheets = async () => {
  if (!selectedClass) {
    toast.error('학급을 선택해주세요');
    return;
  }

  // GameTeam → SheetTeam 변환
  const sheetsTeams: SheetTeam[] = teams.map(team => ({
    teamId: team.id,
    teamName: team.name,
    flag: team.flag,
    members: team.memberCodes,
    teamCookie: team.totalCookies,
  }));

  const success = await saveTeams(selectedClass, sheetsTeams);
  if (success) {
    toast.success('팀 정보가 저장되었습니다!');
  } else {
    toast.error('저장에 실패했습니다');
  }
};

// 페이지 로드 시 Sheets에서 팀 불러오기
useEffect(() => {
  const loadTeams = async () => {
    if (!selectedClass) return;

    const sheetsTeams = await getTeams(selectedClass);
    if (sheetsTeams.length > 0) {
      // SheetTeam → GameTeam 변환
      const loadedTeams: GameTeam[] = sheetsTeams.map(st => ({
        id: st.teamId,
        name: st.teamName,
        flag: st.flag,
        memberCodes: st.members,
        memberNames: [], // 학생 목록에서 이름 조회 필요
        baseCookies: 0,
        bonusCookies: st.teamCookie,
        totalCookies: st.teamCookie,
      }));
      // GameContext에 세팅
    }
  };
  loadTeams();
}, [selectedClass]);
```

#### 2.2 쿠키 변화량 계산
```tsx
// 팀원들의 쿠키 변화량 합산하여 팀 쿠키로 설정

import { getClassStudents, SheetStudent } from '../services/sheetsApi';

const calculateTeamCookies = (
  team: GameTeam,
  students: SheetStudent[]
): number => {
  let totalChange = 0;

  for (const memberCode of team.memberCodes) {
    const student = students.find(s => s.code === memberCode);
    if (student) {
      // 쿠키 변화량 = 현재쿠키 - 이전쿠키
      const change = student.cookie - student.previousCookie;
      totalChange += change;
    }
  }

  return totalChange;
};

// 팀 쿠키 새로고침 버튼
const handleRefreshTeamCookies = async () => {
  if (!selectedClass) return;

  const students = await getClassStudents(selectedClass);

  teams.forEach(team => {
    const baseCookies = calculateTeamCookies(team, students);
    updateTeam(team.id, { baseCookies });
  });

  toast.success('팀 쿠키가 업데이트되었습니다!');
};
```

#### 2.3 팀 구성 UI 개선
```tsx
// 드래그 앤 드롭으로 팀원 이동 (선택사항)
// 또는 간단하게 select로 팀원 추가/제거

// 미배정 학생 영역
<Card className="bg-gray-50">
  <CardHeader>
    <CardTitle>미배정 학생 ({unassignedStudents.length}명)</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex flex-wrap gap-2">
      {unassignedStudents.map(student => (
        <Badge
          key={student.code}
          variant="outline"
          className="cursor-pointer hover:bg-blue-100"
          onClick={() => setSelectedForAssign(student)}
        >
          {student.name}
        </Badge>
      ))}
    </div>
  </CardContent>
</Card>

// 각 팀 카드
<Card>
  <CardHeader>
    <div className="flex items-center gap-2">
      <span className="text-2xl">{team.flag}</span>
      <CardTitle>{team.name}</CardTitle>
      <Badge>{team.memberCodes.length}명</Badge>
      <Badge variant="outline">🍪 {team.totalCookies}</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <div className="flex flex-wrap gap-2">
      {team.memberCodes.map((code, idx) => (
        <Badge key={code} className="flex items-center gap-1">
          {team.memberNames[idx]}
          <button onClick={() => removeMember(team.id, code)}>
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() => setAddMemberTo(team.id)}
      >
        <Plus className="w-4 h-4" /> 추가
      </Button>
    </div>
  </CardContent>
</Card>
```

#### 2.4 자동 팀 배정 옵션
```tsx
// 팀당 인원 설정
const [membersPerTeam, setMembersPerTeam] = useState(4);

// 자동 배정 옵션
<div className="flex items-center gap-4 mb-4">
  <label>팀당 인원:</label>
  <select
    value={membersPerTeam}
    onChange={(e) => setMembersPerTeam(Number(e.target.value))}
    className="border rounded px-2 py-1"
  >
    <option value={3}>3명</option>
    <option value={4}>4명 (권장)</option>
    <option value={5}>5명</option>
  </select>
  <Button onClick={handleAutoAssign}>
    <Shuffle className="w-4 h-4 mr-2" />
    자동 배정
  </Button>
</div>
```

### API 엔드포인트 (구현 필요)

```typescript
// src/services/sheetsApi.ts

// 팀 정보 조회
getTeams(className: string): Promise<SheetTeam[]>

// 팀 정보 저장
saveTeams(className: string, teams: SheetTeam[]): Promise<boolean>

// 타입
interface SheetTeam {
  teamId: string;
  teamName: string;
  flag: string;
  members: string[];     // 학생 코드 배열
  teamCookie: number;
}
```

### Google Sheets 구조 ({학급}_팀)

| 열 | A | B | C | D | E |
|----|---|---|---|---|---|
| 헤더 | 팀ID | 팀명 | 플래그 | 멤버(학생코드) | 팀쿠키 |
| 예시 | team_1732000000 | 불꽃 드래곤 | 🐉 | ABC123,DEF456,GHI789 | 150 |

---

## 3️⃣ 공통 컴포넌트

### 3.1 StudentBadge 컴포넌트
```tsx
// src/components/StudentBadge.tsx

interface StudentBadgeProps {
  name: string;
  code: string;
  cookie?: number;
  cookieChange?: number;
  onClick?: () => void;
  onRemove?: () => void;
  showCookieChange?: boolean;
}

export function StudentBadge({
  name,
  code,
  cookie,
  cookieChange,
  onClick,
  onRemove,
  showCookieChange = false,
}: StudentBadgeProps) {
  return (
    <Badge
      className="flex items-center gap-1 cursor-pointer"
      onClick={onClick}
    >
      <span>{name}</span>
      {showCookieChange && cookieChange !== undefined && (
        <span className={cookieChange >= 0 ? 'text-green-600' : 'text-red-600'}>
          {cookieChange >= 0 ? '+' : ''}{cookieChange}
        </span>
      )}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="hover:text-red-500"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </Badge>
  );
}
```

### 3.2 TeamCard 컴포넌트
```tsx
// src/components/TeamCard.tsx

interface TeamCardProps {
  team: GameTeam;
  students: SheetStudent[];
  onEdit?: () => void;
  onDelete?: () => void;
  onAddMember?: () => void;
  onRemoveMember?: (code: string) => void;
}

export function TeamCard({
  team,
  students,
  onEdit,
  onDelete,
  onAddMember,
  onRemoveMember,
}: TeamCardProps) {
  // 팀원들의 쿠키 변화량 계산
  const memberDetails = team.memberCodes.map(code => {
    const student = students.find(s => s.code === code);
    return {
      code,
      name: student?.name || code,
      cookieChange: student ? student.cookie - student.previousCookie : 0,
    };
  });

  const totalCookieChange = memberDetails.reduce((sum, m) => sum + m.cookieChange, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{team.flag}</span>
            <div>
              <CardTitle>{team.name}</CardTitle>
              <CardDescription>{team.memberCodes.length}명</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-600">
              🍪 {team.totalCookies + totalCookieChange}
            </div>
            <div className="text-sm text-gray-500">
              기본 {team.baseCookies} + 보너스 {team.bonusCookies} + 변화량 {totalCookieChange}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {memberDetails.map(member => (
            <StudentBadge
              key={member.code}
              name={member.name}
              code={member.code}
              cookieChange={member.cookieChange}
              showCookieChange={true}
              onRemove={onRemoveMember ? () => onRemoveMember(member.code) : undefined}
            />
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {onAddMember && (
          <Button size="sm" variant="outline" onClick={onAddMember}>
            <UserPlus className="w-4 h-4 mr-1" /> 팀원 추가
          </Button>
        )}
        {onEdit && (
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit2 className="w-4 h-4 mr-1" /> 수정
          </Button>
        )}
        {onDelete && (
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-1" /> 삭제
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

---

## 4️⃣ 사용되는 UI 컴포넌트 (shadcn/ui)

```tsx
// 이미 설치됨 - import해서 사용
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';  // 토스트 알림

// 아이콘 (lucide-react)
import {
  Cookie, ShoppingBag, Check, Lock, Sparkles,
  Users, Plus, Trash2, Edit2, Shuffle, UserPlus, X,
  RefreshCw, Loader2, Save
} from 'lucide-react';
```

---

## 5️⃣ 주의사항 (CORS 등)

### POST 요청 시 CORS 해결
```typescript
// src/services/sheets.ts 참고
// Google Apps Script에 POST 요청 시 반드시 text/plain 사용

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain;charset=utf-8',  // ⚠️ 중요!
  },
  body: JSON.stringify(data),
});
```

### Context 사용법
```tsx
// 인증 컨텍스트
import { useAuth } from '../contexts/AuthContext';
const { selectedClass, studentCode, role } = useAuth();

// 게임 컨텍스트
import { useGame } from '../contexts/GameContext';
const { teams, createTeam, updateTeam, deleteTeam, clearTeams } = useGame();
```

---

## 6️⃣ 구현 순서 권장

### 상점 페이지 개선
1. ProfilePreviewCard 컴포넌트 생성
2. 아이템 장착 버튼 추가 (handleEquipItem)
3. 필터 탭 추가 (전체/보유/미보유)
4. 장착중 상태 표시

### 팀 만들기 개선
1. Sheets에서 팀 불러오기
2. Sheets에 팀 저장하기
3. 쿠키 변화량 계산 함수
4. 팀 쿠키 새로고침 버튼
5. 팀원 추가/제거 UI 개선

---

## 7️⃣ 테스트 방법

```bash
# 개발 서버 실행
npm run dev

# 테스트 순서
1. 교사로 로그인 (Sheets URL 입력)
2. 학급 선택
3. 팀 관리 → 자동 배정 → Sheets 저장
4. 학생으로 로그인 (학생 코드 입력)
5. 상점 → 아이템 구매 → 장착
```

---

*이 문서를 VS Code AI에게 전달하면 위 명세에 맞게 코드를 작성해줄 것입니다.*
