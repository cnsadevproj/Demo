import { Step } from 'react-joyride';
import { Student, Team, Wish } from '../services/firestoreApi';
import { Timestamp } from 'firebase/firestore';

// Extended step type with tab navigation and action info
export interface TutorialStep extends Step {
  data?: {
    tab?: string; // Tab to navigate to before showing this step
    action?: 'import-classes' | 'select-first-class' | 'click-candy-shop' | 'click-cookie-shop' | 'register-default-items' | 'click-team-status' | 'click-team-manage'; // Action to perform
    preAction?: 'click-candy-shop' | 'click-cookie-shop' | 'click-team-manage' | 'click-team-status'; // Action to perform BEFORE showing this step
  };
}

// 튜토리얼용 더미 잔디 데이터 생성 함수
function generateTutorialGrassData(): Array<{ date: string; studentCode: string; cookieChange: number; count: number }> {
  const grassData: Array<{ date: string; studentCode: string; cookieChange: number; count: number }> = [];
  const today = new Date();

  // 과거 10일간의 평일만 찾기
  const weekdays: string[] = [];
  let checkDate = new Date(today);
  while (weekdays.length < 10) {
    const dayOfWeek = checkDate.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // 월~금
      const dateStr = checkDate.toISOString().split('T')[0];
      weekdays.push(dateStr);
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // 학생별 잔디 패턴 - 대부분 1개, 20% 정도 2개 (최대 2개)
  // [cookieChange, count] 형태로 직접 지정 - cookieChange도 1~4 범위로 작게
  const patterns: Record<string, Array<[number, number]>> = {
    'DEMO001': [[2, 1], [3, 2], [1, 1], [0, 0], [2, 1], [1, 1], [4, 2], [1, 1], [2, 1], [1, 1]], // 홍길동
    'DEMO002': [[2, 1], [0, 0], [3, 2], [0, 0], [1, 1], [0, 0], [2, 1], [0, 0], [1, 1], [0, 0]],  // 김철수 - 격일
    'DEMO003': [[3, 2], [2, 1], [1, 1], [2, 1], [3, 1], [2, 2], [1, 1], [4, 1], [2, 2], [3, 1]], // 이영희
    'DEMO004': [[1, 1], [0, 0], [0, 0], [2, 2], [0, 0], [0, 0], [1, 1], [0, 0], [0, 0], [1, 1]], // 박민준 - 가끔
    'DEMO005': [[2, 1], [1, 2], [2, 1], [1, 1], [2, 1], [1, 1], [3, 1], [2, 2], [1, 1], [2, 1]], // 정수아
  };

  Object.entries(patterns).forEach(([studentCode, dayData]) => {
    weekdays.forEach((date, index) => {
      const [cookieChange, count] = dayData[index];
      if (count > 0) {
        grassData.push({
          date,
          studentCode,
          cookieChange,
          count,
        });
      }
    });
  });

  return grassData;
}

// 튜토리얼용 더미 잔디 데이터
export const TUTORIAL_DUMMY_GRASS = generateTutorialGrassData();

// 튜토리얼용 더미 학생 데이터 (학생이 없을 때 표시) - 다양한 프로필 꾸미기 적용
export const TUTORIAL_DUMMY_STUDENTS: Student[] = [
  {
    code: 'DEMO001',
    number: 1,
    name: '홍길동',
    classId: 'demo-class',
    teacherId: 'demo-teacher',
    cookie: 150,
    jelly: 45,
    lastSyncedCookie: 150,
    usedCookie: 30,
    totalCookie: 180,
    chocoChips: 0,
    previousCookie: 140,
    initialCookie: 100,
    profile: {
      emojiCode: '😎',
      title: '열공중',
      titleColorCode: '4', // 파랑
      nameEffectCode: 'glow-blue',
      backgroundCode: 'waves',
      buttonBorderCode: 'neon-blue',
      buttonFillCode: 'gradient-ocean',
      animationCode: 'float',
    },
    ownedItems: ['glow-blue', 'waves', 'neon-blue', 'gradient-ocean', 'float'],
  },
  {
    code: 'DEMO002',
    number: 2,
    name: '김철수',
    classId: 'demo-class',
    teacherId: 'demo-teacher',
    cookie: 120,
    jelly: 30,
    lastSyncedCookie: 120,
    usedCookie: 20,
    totalCookie: 140,
    chocoChips: 0,
    previousCookie: 110,
    initialCookie: 80,
    profile: {
      emojiCode: '🚀',
      title: '도전자',
      titleColorCode: '0', // 빨강
      nameEffectCode: 'gradient-fire',
      backgroundCode: 'stars',
      buttonBorderCode: 'gradient-fire',
      buttonFillCode: 'gradient-fire',
      animationCode: 'pulse',
    },
    ownedItems: ['gradient-fire', 'stars', 'pulse'],
  },
  {
    code: 'DEMO003',
    number: 3,
    name: '이영희',
    classId: 'demo-class',
    teacherId: 'demo-teacher',
    cookie: 200,
    jelly: 60,
    lastSyncedCookie: 200,
    usedCookie: 50,
    totalCookie: 250,
    chocoChips: 0,
    previousCookie: 180,
    initialCookie: 120,
    profile: {
      emojiCode: '👑',
      title: '스타',
      titleColorCode: '8', // 골드
      nameEffectCode: 'gradient-rainbow',
      backgroundCode: 'gradient-vivid',
      buttonBorderCode: 'gradient-rainbow',
      buttonFillCode: 'gradient-gold',
      animationCode: 'sparkle',
    },
    ownedItems: ['gradient-rainbow', 'gradient-vivid', 'gradient-gold', 'sparkle'],
  },
  {
    code: 'DEMO004',
    number: 4,
    name: '박민준',
    classId: 'demo-class',
    teacherId: 'demo-teacher',
    cookie: 95,
    jelly: 15,
    lastSyncedCookie: 95,
    usedCookie: 10,
    totalCookie: 105,
    chocoChips: 0,
    previousCookie: 85,
    initialCookie: 60,
    profile: {
      emojiCode: '🎮',
      title: '게이머',
      titleColorCode: '5', // 보라
      nameEffectCode: 'glow-pink',
      backgroundCode: 'dots',
      buttonBorderCode: 'neon-pink',
      buttonFillCode: 'none',
      animationCode: 'bounce',
    },
    ownedItems: ['glow-pink', 'dots', 'neon-pink', 'bounce'],
  },
  {
    code: 'DEMO005',
    number: 5,
    name: '정수아',
    classId: 'demo-class',
    teacherId: 'demo-teacher',
    cookie: 175,
    jelly: 55,
    lastSyncedCookie: 175,
    usedCookie: 40,
    totalCookie: 215,
    chocoChips: 0,
    previousCookie: 160,
    initialCookie: 90,
    profile: {
      emojiCode: '🌸',
      title: '노력왕',
      titleColorCode: '6', // 핑크
      nameEffectCode: 'glow-gold',
      backgroundCode: 'hearts',
      buttonBorderCode: 'sparkle',
      buttonFillCode: 'gradient-aurora',
      animationCode: 'wave',
    },
    ownedItems: ['glow-gold', 'hearts', 'sparkle', 'gradient-aurora', 'wave'],
  },
];

// 튜토리얼용 더미 팀 데이터
export const TUTORIAL_DUMMY_TEAMS: Team[] = [
  {
    teamId: 'demo-team-1',
    teamName: '🔥 불꽃팀',
    flag: '🔥',
    members: ['DEMO001', 'DEMO002'],
    teamCookie: 270,
  },
  {
    teamId: 'demo-team-2',
    teamName: '⭐ 스타팀',
    flag: '⭐',
    members: ['DEMO003', 'DEMO004', 'DEMO005'],
    teamCookie: 470,
  },
];

// 튜토리얼용 더미 소원 데이터
export const TUTORIAL_DUMMY_WISHES: Wish[] = [
  {
    id: 'demo-wish-1',
    studentCode: 'DEMO003',
    studentName: '이영희',
    content: '다음 주 금요일에 영화 보러 가고 싶어요! 🎬',
    createdAt: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)), // 2일 전
    likes: ['DEMO001', 'DEMO002', 'DEMO004', 'DEMO005'],
    isGranted: true,
    grantedReward: 0,
    grantedMessage: '영화관 티켓 2장 준비했어요! 친구랑 같이 가세요~ 🍿',
    grantedAt: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)), // 1일 전
    classId: 'demo-class',
  },
  {
    id: 'demo-wish-2',
    studentCode: 'DEMO001',
    studentName: '홍길동',
    content: '교실에서 간식 파티 하고 싶어요! 🍰🍫',
    createdAt: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)), // 3일 전
    likes: ['DEMO002', 'DEMO003'],
    isGranted: false,
    grantedReward: 0,
    classId: 'demo-class',
  },
  {
    id: 'demo-wish-3',
    studentCode: 'DEMO005',
    studentName: '정수아',
    content: '자리 바꾸기 해주세요! 창가 자리로요~ 🪟',
    createdAt: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)), // 1일 전
    likes: ['DEMO001'],
    isGranted: false,
    grantedReward: 0,
    classId: 'demo-class',
  },
  {
    id: 'demo-wish-4',
    studentCode: 'DEMO002',
    studentName: '김철수',
    content: '체육 시간에 축구하고 싶어요! ⚽',
    createdAt: Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)), // 4일 전
    likes: ['DEMO001', 'DEMO004', 'DEMO005'],
    isGranted: false,
    grantedReward: 0,
    classId: 'demo-class',
  },
];

export const teacherTutorialSteps: TutorialStep[] = [
  // ============ WELCOME ============
  {
    target: 'body',
    placement: 'center',
    title: 'DaJanDi 선생님 가이드',
    content: 'DaJanDi(다잔디)에 오신 것을 환영해요! 학생들의 학습 동기를 높이는 교육용 게이미피케이션 시스템입니다. 주요 기능을 하나씩 안내해드릴게요.',
    disableBeacon: true,
  },

  // ============ TAB: CLASSES ============
  {
    target: '[data-tab="classes"]',
    placement: 'bottom',
    title: '📚 학급 탭',
    content: '학급을 관리하는 공간이에요. 다했니 앱에서 학급을 가져오고, 학급을 숨기거나 묶을 수 있어요.',
    disableBeacon: true,
    data: { tab: 'classes' },
  },
  {
    target: '[data-tutorial="import-classes"]',
    placement: 'bottom',
    title: '📥 학급 가져오기',
    content: '다했니 API에서 선생님의 학급 목록을 자동으로 불러와요. 처음 시작할 때 이 버튼을 눌러주세요!',
    disableBeacon: true,
    data: { tab: 'classes', action: 'import-classes' },
  },
  {
    target: '.class-selector',
    placement: 'bottom',
    title: '🎯 학급 선택',
    content: '가져온 학급 중 관리할 학급을 선택하세요. 선택한 학급의 학생들만 다른 탭에서 표시돼요.',
    disableBeacon: true,
    data: { action: 'select-first-class' },
  },
  {
    target: '[data-tutorial="hide-classes"]',
    placement: 'bottom',
    title: '🙈 학급 가리기',
    content: '지난 학기 학급 등 더 이상 사용하지 않는 학급을 숨길 수 있어요. 숨긴 학급은 목록에서 보이지 않아 관리가 훨씬 편해져요!',
    disableBeacon: true,
    data: { tab: 'classes' },
  },
  {
    target: '[data-tutorial="group-classes"]',
    placement: 'bottom',
    title: '🔗 학급 묶기',
    content: '여러 학급을 하나의 그룹으로 묶으면 묶인 학급끼리 소원(방명록)을 함께 볼 수 있어요! 합반 수업이나 동아리 활동에 유용해요.',
    disableBeacon: true,
    data: { tab: 'classes' },
  },

  // ============ TAB: STUDENTS ============
  {
    target: '[data-tab="students"]',
    placement: 'bottom',
    title: '👨‍🎓 학생 탭',
    content: '학생을 등록하고 관리하는 공간이에요. 쿠키 현황 확인, 캔디 지급, 학생 정보 관리가 모두 가능해요.',
    disableBeacon: true,
    data: { tab: 'students' },
  },
  {
    target: '[data-tutorial="student-code-upload"]',
    placement: 'top',
    title: '📱 학생코드 파일 업로드',
    content: '📱 다했니 앱 → 다했니 클래스룸 → 학생 관리 → 학생 코드 다운로드에서 받은 XLSX 파일을 여기에 업로드하면 학생이 자동으로 등록돼요!',
    disableBeacon: true,
    data: { tab: 'students' },
  },
  {
    target: '[data-tutorial="refresh-cookies"]',
    placement: 'bottom',
    title: '🍪 쿠키 새로고침',
    content: '다했니 앱에서 학생들이 활동하면 쿠키가 쌓여요. 이 버튼으로 최신 쿠키 정보를 가져올 수 있어요.',
    disableBeacon: true,
    data: { tab: 'students' },
  },
  {
    target: '[data-tutorial="bulk-candy"]',
    placement: 'bottom',
    title: '🎁 전체 캔디 지급',
    content: '여러 학생을 한 번에 선택해서 캔디를 지급하거나 차감할 수 있어요. 전체 칭찬이나 보상을 줄 때 유용해요!',
    disableBeacon: true,
    data: { tab: 'students' },
  },
  {
    target: '[data-tutorial="student-list"]',
    placement: 'top',
    title: '📋 학생 목록 테이블',
    content: '학생별로 번호, 이름, 뱃지, 쿠키, 캔디가 표시돼요. 학생 이름을 클릭하면 프로필과 상세 활동 내역을 보고, 🍭 캔디를 개별 지급할 수 있어요!',
    disableBeacon: true,
    scrollToFirstStep: true,
    data: { tab: 'students' },
  },

  // ============ TAB: GRASS ============
  {
    target: '[data-tab="grass"]',
    placement: 'bottom',
    title: '🌱 잔디 탭',
    content: '학생들의 활동 현황을 "잔디밭"으로 시각화한 탭이에요. 깃허브 잔디처럼 활동량이 많을수록 진한 녹색으로 표시돼요!',
    disableBeacon: true,
    data: { tab: 'grass' },
  },
  {
    target: '[data-tutorial="grass-overview"]',
    placement: 'top',
    title: '📊 잔디 현황 보기',
    content: '모든 학생의 최근 10일간 쿠키 증가량을 한눈에 확인할 수 있어요. 평일 기준으로 집계되며, 어떤 학생이 열심히 활동하는지 바로 알 수 있어요!',
    disableBeacon: true,
    scrollToFirstStep: true,
    data: { tab: 'grass' },
  },
  {
    target: '[data-tutorial="grass-navigation"]',
    placement: 'bottom',
    title: '⏪ 시간 이동',
    content: '◀▶ 버튼으로 과거 날짜로 이동할 수 있어요. 지난주, 지난달 활동량도 확인해보세요!',
    disableBeacon: true,
    data: { tab: 'grass' },
  },

  // ============ TAB: SHOP ============
  {
    target: '[data-tab="shop"]',
    placement: 'bottom',
    title: '🏪 상점 탭',
    content: '학생들이 보상을 구매할 수 있는 상점을 관리해요. 캔디 상점과 쿠키 상점 두 가지가 있어요!',
    disableBeacon: true,
    data: { tab: 'shop' },
  },
  {
    target: '[data-tutorial="shop-mode-toggle"]',
    placement: 'bottom',
    title: '🔄 상점 모드 전환',
    content: '캔디 상점과 쿠키 상점을 전환할 수 있어요. 각 상점의 특징을 알아볼게요!',
    disableBeacon: true,
    data: { tab: 'shop' },
  },
  {
    target: '[data-tutorial="candy-shop-tab"]',
    placement: 'bottom',
    title: '🍭 캔디 상점',
    content: '학생들이 캔디로 구매하는 프로필 꾸미기 아이템이에요. 이모지, 이름 효과, 칭호 색상, 애니메이션 등을 판매할 수 있어요. 캔디 상점 탭을 클릭하고 기본 상품을 등록해볼게요!',
    disableBeacon: true,
    data: { tab: 'shop', preAction: 'click-candy-shop', action: 'register-default-items' },
  },
  {
    target: '[data-tutorial="cookie-shop-tab"]',
    placement: 'bottom',
    title: '🍪 쿠키 상점',
    content: '쿠키로 실물 보상을 교환하는 상점이에요! 학생이 구매 신청을 하면 여기에 표시되고, 선생님이 승인하면 보상을 지급해요. 쿠키 상점을 확인해볼게요!',
    disableBeacon: true,
    data: { tab: 'shop', preAction: 'click-cookie-shop' },
  },

  // ============ TAB: TEAMS ============
  {
    target: '[data-tab="teams"]',
    placement: 'bottom',
    title: '👥 팀 탭',
    content: '학생들을 팀으로 나누어 관리할 수 있어요. 협동 학습이나 팀 대항전, 프로젝트 활동에 활용하세요!',
    disableBeacon: true,
    data: { tab: 'teams' },
  },
  {
    target: '[data-tutorial="team-manage-tab"]',
    placement: 'bottom',
    title: '👥 팀 관리',
    content: '팀을 생성하고 학생을 배치해요. 빠른 팀 생성(2~6팀)으로 자동 배치하거나, 수동으로 팀을 만들 수 있어요. 팀 관리 탭을 클릭해볼게요!',
    disableBeacon: true,
    data: { tab: 'teams', preAction: 'click-team-manage' },
  },
  {
    target: '[data-tutorial="team-swap-area"]',
    placement: 'top',
    title: '🔄 학생 맞교환',
    content: '흰색 버튼으로 표시된 학생 이름을 클릭하면 선택되고, 다른 팀의 학생을 클릭하면 두 학생이 맞교환돼요!',
    disableBeacon: true,
    data: { tab: 'teams' },
  },
  {
    target: '[data-tutorial="team-add-button"]',
    placement: 'top',
    title: '➕ 멤버 추가 & 팀 수정',
    content: '각 팀의 초록색 [+] 버튼을 누르면 팀에 없는 학생을 추가하거나, 팀 이름과 아이콘을 수정할 수 있어요!',
    disableBeacon: true,
    data: { tab: 'teams' },
  },
  {
    target: '[data-tutorial="team-status-tab"]',
    placement: 'bottom',
    title: '📊 팀 현황',
    content: '팀 현황 탭을 클릭하면 각 팀의 총 쿠키, 멤버 수, 최근 쿠키 획득량을 상세하게 비교할 수 있어요. 팀 대항전 점수판으로 활용하세요!',
    disableBeacon: true,
    data: { tab: 'teams' },
  },

  // ============ TAB: GAME CENTER ============
  {
    target: '[data-tab="gameCenter"]',
    placement: 'bottom',
    title: '🎮 게임센터 탭',
    content: '선생님이 게임을 오픈하면 학생들이 학생 대시보드의 게임센터 탭에서 참여할 수 있어요! 게임 종료 후 대시보드에서 학생 이름을 클릭해 캔디를 부여할 수 있어요. 더 많은 게임이 추가될 예정이에요! 🚀',
    disableBeacon: true,
    data: { tab: 'gameCenter' },
  },

  // ============ TAB: WISHES ============
  {
    target: '[data-tab="wishes"]',
    placement: 'bottom',
    title: '⭐ 소원 탭',
    content: '학생들이 작성한 소원(방명록)을 확인해요! 묶은 학급끼리 소원이 공유되며, 선생님이 메시지와 함께 소원을 선정하면 학생에게 알림이 가요!',
    disableBeacon: true,
    data: { tab: 'wishes' },
  },
  {
    target: '[data-tutorial="wishes-container"]',
    placement: 'top',
    title: '💫 소원 목록',
    content: '학생들의 소원이 카드 형태로 표시돼요. 무지개 테두리가 있는 카드는 이미 선정된 소원이에요! ✨ 선정 버튼을 누르면 메시지를 남기고 학생에게 알림을 보낼 수 있어요.',
    disableBeacon: true,
    data: { tab: 'wishes' },
  },

  // ============ TAB: FEATURES ============
  {
    target: '[data-tab="features"]',
    placement: 'bottom',
    title: '🔧 기능 탭',
    content: '워드클라우드 등 수업에 활용할 수 있는 특별한 도구들이 있어요. 학생들의 생각을 시각화해보세요!',
    disableBeacon: true,
    data: { tab: 'features' },
  },

  // ============ TAB: PROFILES ============
  {
    target: '[data-tab="profiles"]',
    placement: 'bottom',
    title: '👤 프로필 탭',
    content: '학생들의 프로필 커스터마이징 현황을 한눈에 볼 수 있어요. 누가 어떤 아이템을 사용하고 있는지 확인해보세요!',
    disableBeacon: true,
    data: { tab: 'profiles' },
  },

  // ============ TAB: SETTINGS ============
  {
    target: '[data-tab="settings"]',
    placement: 'bottom',
    title: '⚙️ 설정 탭',
    content: '계정 정보와 앱 설정을 관리해요. 튜토리얼이 끝났어요! 🎉 이제 DaJanDi를 마음껏 활용해보세요! 도움이 필요하면 상단의 ❓ 도움말 버튼을 눌러주세요.',
    disableBeacon: true,
    data: { tab: 'settings' },
  },
];
