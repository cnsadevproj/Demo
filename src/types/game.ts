// 쿠키 배틀 게임 타입 정의

// 게임용 팀
export interface GameTeam {
  id: string;
  name: string;
  flag: string;              // 팀 이모지
  memberCodes: string[];     // 학생 코드 목록
  memberNames: string[];     // 학생 이름 목록
  baseCookies: number;       // 기본 쿠키 (다했니 증가량 합산)
  bonusCookies: number;      // 보너스 쿠키 (교사 부여 + 성찰왕)
  totalCookies: number;      // 총 쿠키 (base + bonus)
}

// 배틀 설정 (각 팀의 배팅)
export interface BattleBet {
  teamId: string;
  attackTargetId: string | null;  // null이면 공격 안함
  attackBet: number;
  defenseBet: number;
}

// 개별 배틀 결과
export interface BattleResult {
  attackerId: string;
  defenderId: string;
  attackerBet: number;
  defenderBet: number;
  winProbability: number;    // 공격 승률 (20%~80%)
  diceRoll: number;          // 주사위 결과 (1~100)
  attackerWon: boolean;
  cookieTransfer: number;    // 이동된 쿠키량
}

// 라운드 결과
export interface RoundResult {
  roundNumber: number;
  battles: BattleResult[];
  unusedDefense: {           // 공격 안 받은 팀의 방어 페널티
    teamId: string;
    defenseBet: number;
    penalty: number;         // 50% 페널티
  }[];
}

// 최종 정산
export interface GameSettlement {
  teamId: string;
  teamName: string;
  startCookies: number;      // 게임 시작 쿠키
  totalWins: number;
  totalLosses: number;
  cookiesWon: number;        // 승리로 얻은 쿠키
  cookiesLost: number;       // 패배로 잃은 쿠키
  defensePenalty: number;    // 방어 페널티로 잃은 쿠키
  finalCookies: number;      // 최종 쿠키
  rank: number;
}

// 게임 세션
export interface GameSession {
  id: string;
  classId: string;
  className: string;
  createdAt: string;
  status: 'setup' | 'betting' | 'battle' | 'settlement' | 'finished';
  teams: GameTeam[];
  currentRound: number;
  totalRounds: number;
  rounds: RoundResult[];
  settlements: GameSettlement[];
}

// 성찰왕 기록
export interface ReflectionKing {
  id: string;
  date: string;              // YYYY-MM-DD
  studentCode: string;
  studentName: string;
  teamId?: string;           // 소속 팀 (게임 중일 때)
  bonusCookies: number;      // 부여된 보너스 쿠키
  note?: string;             // 메모
}

// 성찰 기록 (학생별)
export interface ReflectionRecord {
  studentCode: string;
  studentName: string;
  kingCount: number;         // 성찰왕 횟수
  penaltyCount: number;      // 미성찰 페널티 횟수
  totalBonus: number;        // 총 보너스 쿠키
  totalPenalty: number;      // 총 페널티 쿠키
  lastKingDate?: string;     // 마지막 성찰왕 날짜
  neverReflected: boolean;   // 한번도 성찰 안함 여부
}

// 미성찰 페널티 기록
export interface ReflectionPenalty {
  id: string;
  date: string;
  studentCode: string;
  studentName: string;
  teamId?: string;
  penaltyCookies: number;    // 차감된 쿠키
  reason: string;            // "미성찰", "성찰 0회" 등
}

// 손실 메커니즘 타입 (3가지 추천)
export type LossMechanism =
  | 'standard'      // 기본: 승자 30% 획득, 패자 전액 손실
  | 'zero_sum'      // 제로섬: 배팅 쿠키가 그대로 이동
  | 'gentle';       // 부드러운: 승자 20% 획득, 패자 50% 손실

// 손실 메커니즘 설명
export const LOSS_MECHANISM_INFO: Record<LossMechanism, { name: string; description: string; emoji: string }> = {
  standard: {
    name: '기본 (추천)',
    description: '승자: 상대 배팅의 30% 획득 | 패자: 배팅 전액 손실',
    emoji: '⚔️',
  },
  zero_sum: {
    name: '제로섬 (스릴)',
    description: '승자: 상대 배팅 전액 획득 | 패자: 배팅 전액 손실',
    emoji: '💀',
  },
  gentle: {
    name: '부드러운 (초보)',
    description: '승자: 상대 배팅의 20% 획득 | 패자: 배팅의 50% 손실',
    emoji: '🌸',
  },
};

// 게임 설정
export interface GameSettings {
  minWinProbability: number;     // 최소 승률 (기본 10%)
  maxWinProbability: number;     // 최대 승률 (기본 90%)
  winnerTakePercent: number;     // 승자 획득 비율 (기본 30%)
  loserLosePercent: number;      // 패자 손실 비율 (기본 100%)
  unusedDefensePenalty: number;  // 미사용 방어 페널티 (기본 50%)
  defaultBonusCookies: number;   // 성찰왕 기본 보너스 (기본 100)
  lossMechanism: LossMechanism;  // 손실 메커니즘
}

// 기본 게임 설정
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  minWinProbability: 10,
  maxWinProbability: 90,
  winnerTakePercent: 30,
  loserLosePercent: 100,
  unusedDefensePenalty: 50,
  defaultBonusCookies: 100,
  lossMechanism: 'standard',
};

// 손실 메커니즘별 설정 적용
export function getLossMechanismSettings(mechanism: LossMechanism): Partial<GameSettings> {
  switch (mechanism) {
    case 'standard':
      return { winnerTakePercent: 30, loserLosePercent: 100 };
    case 'zero_sum':
      return { winnerTakePercent: 100, loserLosePercent: 100 };
    case 'gentle':
      return { winnerTakePercent: 20, loserLosePercent: 50 };
    default:
      return {};
  }
}

// 배틀 나레이션 텍스트 생성
export interface BattleNarration {
  intro: string;      // 전투 시작
  attack: string;     // 공격 장면
  result: string;     // 결과
}

// 공격 시작 나레이션 (다양하고 재미있게)
const ATTACK_INTROS = [
  (attacker: string, defender: string) => `${attacker}이(가) ${defender}을(를) 향해 느닷없이 돌진합니다!`,
  (attacker: string, defender: string) => `${attacker}이(가) 몰래 숨어있다가 ${defender}을(를) 기습합니다!`,
  (attacker: string, defender: string) => `${attacker}: "오늘은 내가 간다!" ${defender}을(를) 지목합니다!`,
  (attacker: string, defender: string) => `${attacker}이(가) 눈을 번뜩이며 ${defender}에게 선전포고!`,
  (attacker: string, defender: string) => `${attacker}이(가) 쿠키를 들고 ${defender}에게 달려갑니다!`,
  (attacker: string, defender: string) => `${attacker}: "${defender}! 네 쿠키를 내놔라!"`,
  (attacker: string, defender: string) => `${attacker}이(가) ${defender}의 쿠키 냄새를 맡았습니다...`,
  (attacker: string, defender: string) => `${attacker}이(가) ${defender}을(를) 덮치려 합니다!`,
  (attacker: string, defender: string) => `갑자기 ${attacker}이(가) ${defender}에게 도전장을 내밉니다!`,
  (attacker: string, defender: string) => `${attacker}: "각오해라 ${defender}!" 전투 시작!`,
];

// 공격 장면 나레이션 (확률에 따라)
const ATTACK_SCENES_HIGH_PROB = [  // 승률 높을 때 (>60%)
  (attacker: string) => `${attacker}의 압도적인 쿠키 공세!`,
  (attacker: string) => `${attacker}이(가) 자신감 넘치는 표정으로 공격!`,
  (attacker: string) => `${attacker}의 쿠키가 빛나기 시작합니다!`,
  (attacker: string) => `${attacker}: "이 정도는 껌이지~"`,
];

const ATTACK_SCENES_LOW_PROB = [   // 승률 낮을 때 (<40%)
  (attacker: string) => `${attacker}이(가) 떨리는 손으로 쿠키를 던집니다...`,
  (attacker: string) => `${attacker}: "될 대로 되라!" 무모한 도전!`,
  (attacker: string) => `${attacker}이(가) 눈을 질끈 감고 돌진합니다!`,
  (attacker: string) => `${attacker}의 용감한(?) 도전이 시작됩니다!`,
];

const ATTACK_SCENES_NORMAL = [     // 평범한 확률 (40-60%)
  (attacker: string) => `${attacker}이(가) 신중하게 움직입니다.`,
  (attacker: string) => `${attacker}: "한번 해보자!"`,
  (attacker: string) => `${attacker}이(가) 쿠키를 힘차게 던집니다!`,
  (attacker: string) => `팽팽한 긴장감 속에서 ${attacker}이(가) 공격!`,
];

// 승리 결과 나레이션 (재미있고 다양하게)
const WIN_RESULTS = [
  (attacker: string, defender: string, cookies: number) =>
    `${attacker}의 완벽한 승리! ${defender}에게서 ${cookies}쿠키를 획득!`,
  (attacker: string, defender: string, cookies: number) =>
    `${attacker}: "쿠키는 내꺼다!" ${cookies}쿠키 GET!`,
  (attacker: string, defender: string, cookies: number) =>
    `${defender}이(가) 당황한 사이 ${attacker}이(가) ${cookies}쿠키를 챙깁니다!`,
  (attacker: string, defender: string, cookies: number) =>
    `${attacker}의 기습 성공! ${cookies}쿠키를 손에 넣었습니다!`,
  (attacker: string, defender: string, cookies: number) =>
    `${attacker}: "역시 나야 나!" ${defender}에게서 ${cookies}쿠키 탈취!`,
  (attacker: string, defender: string, cookies: number) =>
    `${defender}이(가) 넘어지면서 ${cookies}쿠키를 흘립니다. ${attacker} 줍줍~`,
  (attacker: string, defender: string, cookies: number) =>
    `전광석화! ${attacker}이(가) ${cookies}쿠키를 낚아챕니다!`,
  (attacker: string, defender: string, cookies: number) =>
    `${attacker}의 쿠키 레이더가 ${cookies}쿠키를 정확히 포착!`,
];

// 패배 결과 나레이션 (어이없고 재미있게)
const LOSE_RESULTS = [
  (attacker: string, defender: string, cookies: number) =>
    `${attacker}이(가) 미끄러져 넘어집니다! ${cookies}쿠키 손실...`,
  (attacker: string, defender: string, cookies: number) =>
    `${defender}의 철벽 방어! ${attacker}이(가) ${cookies}쿠키를 잃습니다!`,
  (attacker: string, defender: string, cookies: number) =>
    `${attacker}이(가) 너무 신나서 춤추다가 ${cookies}쿠키를 떨어뜨립니다!`,
  (attacker: string, defender: string, cookies: number) =>
    `${attacker}: "어...어?" 공격 실패! -${cookies}쿠키`,
  (attacker: string, defender: string, cookies: number) =>
    `${defender}이(가) 가볍게 피합니다. ${attacker} 허탈... -${cookies}쿠키`,
  (attacker: string, defender: string, cookies: number) =>
    `${attacker}이(가) 갑자기 화살에 맞고 쓰러집니다! ${cookies}쿠키 손실!`,
  (attacker: string, defender: string, cookies: number) =>
    `${attacker}이(가) 바나나 껍질에 미끄러집니다! -${cookies}쿠키`,
  (attacker: string, defender: string, cookies: number) =>
    `${attacker}: "이게 아닌데..." 멘붕과 함께 ${cookies}쿠키 증발!`,
  (attacker: string, defender: string, cookies: number) =>
    `${defender}이(가) 쿠키 배리어를 펼칩니다! ${attacker} 튕겨나감! -${cookies}쿠키`,
  (attacker: string, defender: string, cookies: number) =>
    `${attacker}이(가) 자신의 쿠키에 걸려 넘어집니다! ${cookies}쿠키 안녕~`,
];

// 방어 페널티 나레이션
const DEFENSE_PENALTY_RESULTS = [
  (team: string, cookies: number) =>
    `${team}: 아무도 안 와서 심심해하다가 쿠키가 ${cookies}개 상했습니다...`,
  (team: string, cookies: number) =>
    `${team}이(가) 방어만 하다가 쿠키 ${cookies}개가 먼지가 되었습니다.`,
  (team: string, cookies: number) =>
    `${team}: 기다리다 지쳐서 쿠키 ${cookies}개를 실수로 먹어버림...`,
  (team: string, cookies: number) =>
    `${team}의 방어 쿠키 ${cookies}개가 유통기한 만료!`,
];

// 나레이션 생성 함수
export function generateBattleNarration(
  attackerName: string,
  defenderName: string,
  winProbability: number,
  attackerWon: boolean,
  cookieTransfer: number
): BattleNarration {
  const randomPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // 인트로
  const intro = randomPick(ATTACK_INTROS)(attackerName, defenderName);

  // 공격 장면 (확률에 따라)
  let attackScene: string;
  if (winProbability > 60) {
    attackScene = randomPick(ATTACK_SCENES_HIGH_PROB)(attackerName);
  } else if (winProbability < 40) {
    attackScene = randomPick(ATTACK_SCENES_LOW_PROB)(attackerName);
  } else {
    attackScene = randomPick(ATTACK_SCENES_NORMAL)(attackerName);
  }

  // 결과
  const result = attackerWon
    ? randomPick(WIN_RESULTS)(attackerName, defenderName, cookieTransfer)
    : randomPick(LOSE_RESULTS)(attackerName, defenderName, cookieTransfer);

  return { intro, attack: attackScene, result };
}

// 방어 페널티 나레이션 생성
export function generateDefensePenaltyNarration(teamName: string, penaltyCookies: number): string {
  const randomPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  return randomPick(DEFENSE_PENALTY_RESULTS)(teamName, penaltyCookies);
}

// 팀 이모지 옵션
export const TEAM_FLAGS = [
  // 동물
  '🐉', '🦅', '🦁', '🐺', '🦊', '🐻', '🦈', '🦋', '🐯', '🦄',
  '🐼', '🐰', '🦖', '🦕', '🐸', '🦀', '🐙', '🦑', '🦩', '🦚',
  // 자연/우주
  '🔥', '🌟', '⚡', '🌊', '🌈', '☀️', '🌙', '⭐', '🪐', '🌸',
  // 물건/특별
  '🎯', '🚀', '💎', '🏆', '👑', '🗡️', '🛡️', '⚔️', '🎮', '🎪',
];

// 승률 계산 함수
export function calculateWinProbability(
  attackBet: number,
  defenseBet: number,
  settings: GameSettings = DEFAULT_GAME_SETTINGS
): number {
  if (attackBet === 0) return 0;
  if (defenseBet === 0) return settings.maxWinProbability;

  const rawProbability = (attackBet / (attackBet + defenseBet)) * 100;

  // 최소/최대 제한 적용
  return Math.max(
    settings.minWinProbability,
    Math.min(settings.maxWinProbability, rawProbability)
  );
}

// 배틀 결과 계산 함수
export function resolveBattle(
  attackerBet: BattleBet,
  defenderBet: BattleBet,
  settings: GameSettings = DEFAULT_GAME_SETTINGS
): BattleResult {
  const winProbability = calculateWinProbability(
    attackerBet.attackBet,
    defenderBet.defenseBet,
    settings
  );

  const diceRoll = Math.floor(Math.random() * 100) + 1;
  const attackerWon = diceRoll <= winProbability;

  // 쿠키 이동량 계산
  const cookieTransfer = attackerWon
    ? Math.floor(defenderBet.defenseBet * settings.winnerTakePercent / 100)
    : attackerBet.attackBet;

  return {
    attackerId: attackerBet.teamId,
    defenderId: defenderBet.teamId,
    attackerBet: attackerBet.attackBet,
    defenderBet: defenderBet.defenseBet,
    winProbability,
    diceRoll,
    attackerWon,
    cookieTransfer,
  };
}
