# 다했니? (Dahandin) - 프로젝트 문서

## 1. 프로젝트 개요

### 1.1 프로젝트 소개
**다했니?**는 한국 교육용 게이미피케이션 시스템으로, 학생들의 학습 루틴을 게임화하여 동기부여를 제공합니다. "다했니?"는 한국어로 "Did you finish?" 또는 "All done?"을 의미합니다.

### 1.2 핵심 기능
- **쿠키 시스템**: 학습 완료 시 보상으로 쿠키 획득
- **잔디 시스템**: GitHub 잔디처럼 일일 학습 현황 시각화
- **소원의 돌**: 학생들이 소원을 작성하고 교사가 선정하면 보상 제공
- **팀 배틀**: 팀 간 쿠키 배틀 게임
- **상점 시스템**: 쿠키로 이모지, 테두리, 배경 등 커스터마이징 아이템 구매
- **프로필 커스터마이징**: 구매한 아이템으로 프로필 꾸미기

### 1.3 기술 스택
| 분류 | 기술 |
|------|------|
| **Frontend** | React 18 + TypeScript + Vite |
| **스타일링** | Tailwind CSS |
| **UI 컴포넌트** | Radix UI (shadcn/ui) |
| **차트** | Recharts |
| **알림** | Sonner |
| **Backend** | Google Apps Script (Web App) |
| **데이터베이스** | Google Sheets |
| **외부 API** | 다했니 API (api.dahandin.com) |

---

## 2. 시스템 아키텍처

### 2.1 전체 구조
```
┌─────────────────────────────────────────────────────────────────┐
│                        사용자 (브라우저)                           │
│  ┌──────────────────┐           ┌──────────────────┐            │
│  │   교사 모드        │           │   학생 모드        │            │
│  │  - 학급 관리       │           │  - 대시보드        │            │
│  │  - 학생 목록       │           │  - 소원의 돌       │            │
│  │  - 소원 관리       │           │  - 상점           │            │
│  │  - 쿠키 배틀       │           │  - 프로필         │            │
│  └────────┬─────────┘           └────────┬─────────┘            │
└───────────┼─────────────────────────────┼───────────────────────┘
            │                             │
            │         React App           │
            │    (sheets.ts, sheetsApi.ts)│
            └──────────────┬──────────────┘
                           │
                           │ HTTP (fetch)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Google Apps Script (Code.gs)                     │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   doGet()   │  │  doPost()   │  │ 유틸리티     │              │
│  │  - ping     │  │  - addWish  │  │ - callApi() │              │
│  │  - getClass │  │  - likeWish │  │ - getOrCreate│             │
│  │  - getStudent│ │  - saveTeams│  │   Sheet()   │              │
│  │  - getWishes│  │  - purchase │  │             │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          │                ▼                │
          │    ┌───────────────────────┐    │
          │    │   다했니 API           │    │
          │    │ api.dahandin.com      │    │
          │    │ - 학급 목록            │    │
          │    │ - 학생 쿠키 정보       │    │
          │    └───────────────────────┘    │
          │                                 │
          └────────────────┬────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Google Sheets (데이터베이스)                  │
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ 설정    │ │ 학급목록 │ │  상점   │ │1-1_학생 │ │1-1_팀  │   │
│  │         │ │         │ │         │ │         │ │         │   │
│  │ API키   │ │ 학급명   │ │ 아이템  │ │ 학생정보│ │ 팀정보  │   │
│  └─────────┘ │ 학생수   │ │ 가격    │ │ 쿠키    │ │ 멤버    │   │
│              │ 활성화   │ └─────────┘ │ 프로필  │ └─────────┘   │
│              └─────────┘             └─────────┘                │
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                           │
│  │1-1_잔디 │ │1-1_소원 │ │1-1_전투 │   (학급별 시트)            │
│  │         │ │         │ │         │                            │
│  │ 날짜별  │ │ 소원내용│ │ 배틀기록│                            │
│  │ 쿠키변화│ │ 좋아요  │ │ 결과    │                            │
│  └─────────┘ └─────────┘ └─────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름
1. **교사 로그인**: Sheets URL 입력 → 연결 테스트 → 학급 목록 로드
2. **학생 로그인**: 학생코드 입력 → 모든 학급 검색 → 학급/학생 정보 로드
3. **쿠키 동기화**: Apps Script가 다했니 API 호출 → 쿠키 정보 → Sheets에 저장

---

## 3. Google Sheets 구조

### 3.1 공용 시트

#### 설정 (Settings)
| 열 | 내용 |
|----|------|
| A1 | API키 (헤더) |
| A2 | 실제 API 키 값 |

#### 학급목록 (Class List)
| 열 | A | B | C | D |
|----|---|---|---|---|
| 헤더 | 학급명 | 학생수 | 마지막 업데이트 | 활성화 |
| 예시 | 1-1 | 25 | 2024-11-28 | 1 |

- **활성화**: 1=활성, 0=비활성 (비활성 학급은 학생 로그인 불가)
- **중요**: `1-8` 같은 학급명이 날짜로 변환되는 것 방지를 위해 `getDisplayValues()` 사용

#### 상점 (Shop)
| 열 | A | B | C | D | E | F |
|----|---|---|---|---|---|---|
| 헤더 | 코드 | 카테고리 | 이름 | 가격 | 값 | 설명 |
| 예시 | emoji_01 | emoji | 😎 쿨한 | 5 | 😎 | |

카테고리:
- `emoji`: 프로필 이모지
- `border`: 프로필 테두리
- `nameEffect`: 이름 효과
- `background`: 배경
- `titleColor`: 칭호 색상

### 3.2 학급별 시트

각 학급(예: `1-1`)마다 5개의 시트가 생성됩니다:

#### {학급}_학생
| 열 | 컬럼명 | 설명 |
|----|--------|------|
| A | 번호 | 출석번호 |
| B | 이름 | 학생 이름 |
| C | 학생코드 | 다했니 고유 코드 |
| D | 쿠키 | 현재 쿠키 |
| E | 사용쿠키 | 상점에서 사용한 쿠키 |
| F | 총쿠키 | 누적 쿠키 |
| G | 초코칩 | 초코칩 (다른 재화) |
| H | 이전쿠키 | 전투 기준점 |
| I | 이모지코드 | 프로필 이모지 |
| J | 칭호 | 커스텀 칭호 (5자 제한) |
| K | 칭호색상코드 | 칭호 색상 |
| L | 테두리코드 | 프로필 테두리 |
| M | 이름효과코드 | 이름 효과 |
| N | 배경코드 | 프로필 배경 |
| O | 구매목록 | 쉼표로 구분된 아이템 코드 |
| P | 마지막업데이트 | 최종 동기화 시간 |

#### {학급}_팀
| 열 | A | B | C | D | E |
|----|---|---|---|---|---|
| 헤더 | 팀ID | 팀명 | 플래그 | 멤버(학생코드) | 팀쿠키 |
| 예시 | team_1 | 드래곤팀 | 🐉 | ABC123,DEF456 | 150 |

#### {학급}_잔디 (열 기반 구조)
| 열 | A | B | C | D | ... |
|----|---|---|---|---|-----|
| 헤더 | 학생코드 | 이름 | 2024-11-28 | 2024-11-28(2) | ... |
| 데이터 | ABC123 | 홍길동 | 5 | 3 | ... |

- 날짜별 쿠키 변화량 기록
- 같은 날 여러 번 새로고침 시 `(2)`, `(3)` 형태로 열 추가
- 진한 잔디 = 여러 번 활동

#### {학급}_소원
| 열 | A | B | C | D | E | F | G | H |
|----|---|---|---|---|---|---|---|---|
| 헤더 | ID | 학생코드 | 학생이름 | 내용 | 작성일시 | 좋아요 | 선정여부 | 보상쿠키 |
| 예시 | wish_123 | ABC123 | 홍길동 | 체험학습 가고 싶어요 | 2024-11-28 | DEF456,GHI789 | TRUE | 50 |

#### {학급}_전투
| 열 | A | B | C | D | E | F | G | H | I |
|----|---|---|---|---|---|---|---|---|---|
| 헤더 | 전투ID | 날짜 | 팀ID | 공격대상 | 공격배팅 | 방어배팅 | 승패 | 쿠키변동 | 라운드증가량 |

---

## 4. 프로젝트 구조

### 4.1 디렉토리 구조
```
Demo/
├── apps-script/
│   └── Code.gs              # Google Apps Script 백엔드
├── src/
│   ├── App.tsx              # 메인 앱 (라우팅, 모드 전환)
│   ├── main.tsx             # 엔트리 포인트
│   ├── components/
│   │   ├── ui/              # shadcn/ui 컴포넌트
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ... (50+ 컴포넌트)
│   │   ├── GrassCalendar.tsx    # 잔디 캘린더
│   │   ├── StudentProfileCard.tsx
│   │   ├── StudentRankingTable.tsx
│   │   └── ...
│   ├── contexts/
│   │   ├── AuthContext.tsx      # 인증 상태 관리
│   │   ├── GameContext.tsx      # 게임 상태 관리
│   │   └── StudentContext.tsx   # 학생 상태 관리
│   ├── pages/
│   │   ├── Login.tsx            # 로그인 페이지
│   │   ├── TeacherDashboard.tsx # 교사 대시보드
│   │   ├── StudentDashboardNew.tsx # 학생 대시보드
│   │   ├── Shop.tsx             # 상점
│   │   ├── WishingStone.tsx     # 소원의 돌
│   │   ├── BattleGame.tsx       # 쿠키 배틀
│   │   ├── GameTeamManager.tsx  # 팀 관리
│   │   └── ... (20+ 페이지)
│   ├── services/
│   │   ├── api.ts               # 다했니 API 클라이언트
│   │   ├── sheets.ts            # Sheets API (기본)
│   │   └── sheetsApi.ts         # Sheets API (확장)
│   ├── types/
│   │   ├── index.ts             # 공통 타입
│   │   ├── student.ts           # 학생 타입
│   │   ├── game.ts              # 게임 타입
│   │   └── shop.ts              # 상점 타입
│   └── utils/
│       ├── csv.ts               # CSV 처리
│       └── mockData.ts          # 데모용 목업 데이터
├── public/
├── package.json
├── vite.config.ts
└── index.html
```

### 4.2 주요 파일 설명

#### `src/App.tsx`
- 앱의 루트 컴포넌트
- 역할(교사/학생)에 따른 페이지 라우팅
- `TeacherSidebarMenu`: 교사용 고정 사이드바 메뉴
- `TeacherMode`: 교사 모드 페이지 전환
- `DemoMode`: 데모 모드 (목업 데이터로 UI 테스트)

#### `src/contexts/AuthContext.tsx`
- 인증 상태 전역 관리
- localStorage에 세션 저장
- 교사/학생 로그인 처리
- 학급 선택 및 학생 데이터 관리

#### `src/services/sheets.ts`
- Google Sheets API 기본 호출
- `saveStudentsToSheets()`: CSV 업로드 시 학생 저장 (CORS 해결: `text/plain`)
- `getAllClassesFromList()`: 학급 목록 조회

#### `src/services/sheetsApi.ts`
- Google Sheets API 확장 기능
- 소원, 잔디, 전투, 상점, 프로필 API
- 5분 캐시 기능 포함

#### `apps-script/Code.gs`
- Google Apps Script 백엔드
- `doGet()`: GET 요청 처리 (조회)
- `doPost()`: POST 요청 처리 (생성/수정)
- 다했니 API 연동 (`callApi()`)

---

## 5. API 엔드포인트

### 5.1 GET 엔드포인트 (doGet)

| Action | 설명 | 파라미터 |
|--------|------|----------|
| `ping` | 연결 테스트 | - |
| `getClassList` | 시트가 있는 학급 목록 | - |
| `getAllClassList` | 학급목록 시트의 모든 학급 | - |
| `setClassActivation` | 학급 활성화 설정 | `className`, `active` |
| `importClassrooms` | 다했니 API에서 학급 가져오기 | - |
| `createActivatedSheets` | 활성화된 학급 시트 생성 | - |
| `findStudent` | 학생 코드로 학급 검색 | `code` |
| `getStudent` | 학생 정보 조회 | `className`, `code` |
| `getClassStudents` | 학급 전체 학생 | `className` |
| `getTeams` | 팀 목록 | `className` |
| `getGrass` | 잔디 데이터 | `className`, `code` |
| `checkTodayGrass` | 오늘 잔디 여부 | `className`, `code` |
| `getWishes` | 소원 목록 | `className` |
| `getWishStreak` | 소원 연속 기록 | `className`, `code` |
| `getBattles` | 전투 기록 | `className` |
| `getShopItems` | 상점 아이템 | - |

### 5.2 POST 엔드포인트 (doPost)

| Action | 설명 | 파라미터 | Body |
|--------|------|----------|------|
| `addWish` | 소원 추가 | `className`, `code`, `name`, `content` | - |
| `likeWish` | 소원 좋아요 | `className`, `wishId`, `code` | - |
| `unlikeWish` | 좋아요 취소 | `className`, `wishId`, `code` | - |
| `grantWish` | 소원 선정 | `className`, `wishId`, `reward` | - |
| `deleteWish` | 소원 삭제 | `className`, `wishId` | - |
| `saveProfile` | 프로필 저장 | `className`, `code` | `{emojiCode, title, ...}` |
| `purchaseItem` | 아이템 구매 | `className`, `code`, `itemCode` | - |
| `saveTeams` | 팀 저장 | `className` | `{teams: [...]}` |
| `saveStudents` | 학생 목록 저장 | `className` | `{students: [...]}` |
| `saveBattleResult` | 전투 결과 저장 | `className` | `{results: [...]}` |
| `refreshCookies` | 쿠키 새로고침 | `className` | - |

---

## 6. 주요 기능 구현

### 6.1 로그인 흐름

#### 교사 로그인
```
1. Sheets URL 입력 (Google Apps Script 배포 URL)
2. ping 호출로 연결 테스트
3. getClassList로 학급 목록 로드
4. localStorage에 세션 저장
5. TeacherDashboard 표시
```

#### 학생 로그인
```
1. 학생 코드 입력 (예: ABC123XYZ)
2. findStudent 호출 → 모든 학급 검색
3. 학급명 + 학생 정보 반환
4. 해당 학급의 학생 데이터 로드
5. StudentDashboard 표시
```

### 6.2 CSV 업로드 (학생 등록)

**파일 형식**: `학생목록_템플릿_{학급명}.csv`
```csv
번호,이름,학생코드
1,홍길동,ABC123XYZ
2,김철수,DEF456UVW
```

**처리 과정**:
1. 웹에서 CSV 파일 선택
2. `parseCsvFile()` → 학생 배열로 변환
3. `saveStudentsToSheets()` POST 호출 (Content-Type: text/plain)
4. Apps Script의 `saveStudents()` → 시트에 저장

### 6.3 잔디 시스템 (열 기반)

**새로고침 흐름**:
1. 교사가 "쿠키 새로고침" 클릭
2. `refreshCookies()` POST 호출
3. Apps Script:
   - 다했니 API에서 현재 쿠키 조회
   - 쿠키 변화량 = 현재쿠키 - 이전쿠키
   - 잔디 시트에 새 열 추가 (날짜)
   - 각 학생의 변화량 기록
   - 이전쿠키 = 현재쿠키로 업데이트

**같은 날 여러 번 새로고침**:
- 첫 번째: `2024-11-28`
- 두 번째: `2024-11-28(2)`
- 세 번째: `2024-11-28(3)`

### 6.4 소원의 돌

**학생 기능**:
- 하루 1개 소원 작성 (50자 제한)
- 다른 학생 소원에 좋아요
- 연속 작성 streak 기록

**교사 기능**:
- 소원 목록 조회
- 소원 선정 → 보상 쿠키 지급
- 소원 삭제

### 6.5 상점 시스템

**아이템 카테고리**:
- 이모지: 프로필 대표 이모지
- 테두리: 프로필 카드 테두리 효과
- 이름효과: 이름에 그라데이션/글로우 효과
- 배경: 프로필 카드 배경 패턴
- 칭호색상: 칭호 텍스트 색상

**구매 로직**:
1. 총쿠키로 가격 확인
2. 구매 시 사용쿠키 증가 (총쿠키 - 사용쿠키 = 사용가능쿠키)
3. 구매목록에 아이템 코드 추가
4. 프로필에 적용 가능

---

## 7. 알려진 이슈 및 해결책

### 7.1 CORS 에러
**문제**: Google Apps Script에 POST 요청 시 CORS 에러
**해결**: `Content-Type: text/plain;charset=utf-8` 사용

```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain;charset=utf-8',
  },
  body: JSON.stringify(data),
});
```

### 7.2 날짜 형식 변환 문제
**문제**: `1-8` 학급명이 `Jan 08`로 변환됨
**해결**:
- 읽기: `getDisplayValues()` 사용 (값을 문자열로)
- 쓰기: `setNumberFormat('@')` 사용 (텍스트 형식 강제)

```javascript
// 읽기
const data = sheet.getRange(2, 1, lastRow - 1, 4).getDisplayValues();

// 쓰기
sheet.getRange(2, 1, data.length, 1).setNumberFormat('@');
```

### 7.3 배포 후 변경사항 미적용
**문제**: Code.gs 수정 후에도 이전 버전 동작
**해결**: Google Apps Script에서 **새 배포** 필요
1. 배포 > 배포 관리
2. 새 배포 만들기 (또는 버전 편집)
3. 배포 URL 재사용 가능

---

## 8. GitHub 구조

### 8.1 브랜치
- `main`: 안정 버전
- `claude/analyze-project-*`: 개발 브랜치

### 8.2 최근 커밋 히스토리
```
89408d2 fix: Resolve CORS error, date formatting, and improve UI
12cc054 refactor: Improve menu UI and remove localStorage dependency
67e4d51 feat: Improve teacher dashboard UI and add Sheets save functionality
d99e404 feat: Add web-based classroom import with separated workflow
19822d3 feat: Update grass sheet to column-based structure
9f97956 feat: Add cookie refresh and enhanced team management
b010ce9 feat: Add shop system with item purchasing
```

---

## 9. 개발 가이드

### 9.1 로컬 개발 환경 설정
```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# 빌드
npm run build
```

### 9.2 Google Apps Script 배포
1. [Google Apps Script](https://script.google.com) 접속
2. 새 프로젝트 생성
3. `apps-script/Code.gs` 내용 복사
4. 배포 > 새 배포 > 웹 앱
5. 액세스: "모든 사용자"
6. 배포 URL을 앱에서 사용

### 9.3 개발 시 주의사항
- **CORS**: POST 요청은 반드시 `text/plain` Content-Type 사용
- **날짜**: 학급명 등 문자열이 날짜로 변환되지 않도록 주의
- **캐시**: 개발 중 localStorage 캐시 클리어 필요할 수 있음
- **테스트**: 데모 모드로 UI 테스트 가능

---

## 10. 다음 개발 과제

### 10.1 미완성 기능
- [ ] 쿠키 배틀 게임 전체 플로우 완성
- [ ] 팀 자동 배정 알고리즘
- [ ] 주간/월간 리포트 생성
- [ ] 알림 시스템

### 10.2 개선 필요 사항
- [ ] 에러 핸들링 강화
- [ ] 로딩 상태 UI 개선
- [ ] 모바일 반응형 최적화
- [ ] 성능 최적화 (데이터 캐싱)

---

## 11. 연락처 및 리소스

- **Figma 디자인**: [링크](https://www.figma.com/design/QHk3h8wwn9PXRVQu8CA6GA)
- **다했니 API**: `https://api.dahandin.com/openapi/v1`
- **GitHub Issues**: 버그 리포트 및 기능 요청

---

*최종 업데이트: 2024-12-01*
