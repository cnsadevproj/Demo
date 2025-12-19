import { Step } from 'react-joyride';

// Extended step type with tab navigation and action info
export interface TutorialStep extends Step {
  data?: {
    tab?: string; // Tab to navigate to before showing this step
    action?: 'import-classes' | 'select-first-class' | 'click-candy-shop' | 'click-cookie-shop' | 'register-default-items' | 'click-team-status' | 'click-team-manage'; // Action to perform
    preAction?: 'click-candy-shop' | 'click-cookie-shop' | 'click-team-manage' | 'click-team-status'; // Action to perform BEFORE showing this step
  };
}

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
    placement: 'center',
    title: '📋 학생 목록 테이블',
    content: '학생별로 번호, 이름, 뱃지, 쿠키, 캔디가 표시돼요. 학생 이름을 클릭하면 프로필과 상세 활동 내역을 보고, 🍭 캔디를 개별 지급할 수 있어요!',
    disableBeacon: true,
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
    placement: 'center',
    title: '📊 잔디 현황 보기',
    content: '모든 학생의 최근 10일간 쿠키 증가량을 한눈에 확인할 수 있어요. 평일 기준으로 집계되며, 어떤 학생이 열심히 활동하는지 바로 알 수 있어요!',
    disableBeacon: true,
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
    placement: 'center',
    title: '🔄 학생 교환 & 이동',
    content: '학생 이름을 클릭하면 선택되고, 다른 팀의 학생을 클릭하면 두 학생이 맞교환돼요! 각 팀의 [+] 버튼을 누르면 팀에 없는 학생을 추가하거나 팀 이름을 수정할 수 있어요.',
    disableBeacon: true,
    data: { tab: 'teams' },
  },
  {
    target: '[data-tutorial="team-status-tab"]',
    placement: 'bottom',
    title: '📊 팀 현황',
    content: '각 팀의 총 쿠키, 캔디, 멤버 수를 한눈에 비교할 수 있어요. 팀 대항전 점수판으로 활용하세요! 팀 현황을 확인해볼게요!',
    disableBeacon: true,
    data: { tab: 'teams', preAction: 'click-team-status' },
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
    content: '학생들이 작성한 소원(방명록)을 확인해요! 묶은 학급끼리 소원이 공유되며, 선생님이 메시지와 함께 소원을 선정하면 학생에게 알림이 가고 카드 스타일이 바뀌어요! ✨',
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
