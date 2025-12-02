// src/games/index.ts
// 게임 레지스트리 - 새 게임 추가 시 여기에 import만 추가하면 됨

import { GameModule } from './types';

// ============================================
// 게임 목록 - 새 게임 추가 시 여기에 추가
// ============================================

// 현재는 더미 게임 정보만 (실제 구현 시 import로 교체)
export const GAMES: GameModule[] = [
  // 예시: import CookieBattle from './cookie-battle';
  // 그 후: CookieBattle,
];

// ============================================
// 더미 게임 목록 (UI 미리보기용)
// 실제 게임 구현 전까지 게임센터에 표시됨
// ============================================
export interface DummyGameInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'individual' | 'team' | 'realtime' | 'async';
  comingSoon: boolean;  // true면 "준비중" 표시
}

export const DUMMY_GAMES: DummyGameInfo[] = [
  {
    id: 'cookie-battle',
    name: '쿠키 배틀',
    description: '팀끼리 쿠키를 걸고 전략 대결!',
    icon: '⚔️',
    type: 'team',
    comingSoon: true,
  },
  {
    id: 'speed-quiz',
    name: '스피드 퀴즈',
    description: '빠르게 정답을 맞춰라!',
    icon: '⚡',
    type: 'individual',
    comingSoon: true,
  },
  {
    id: 'odd-even',
    name: '홀짝 게임',
    description: '운을 시험해보세요!',
    icon: '🎲',
    type: 'individual',
    comingSoon: true,
  },
  {
    id: 'rock-paper-scissors',
    name: '가위바위보',
    description: '쿠키를 걸고 승부!',
    icon: '✊',
    type: 'individual',
    comingSoon: true,
  },
  {
    id: 'word-chain',
    name: '끝말잇기',
    description: '단어 대결!',
    icon: '💬',
    type: 'realtime',
    comingSoon: true,
  },
  {
    id: 'number-baseball',
    name: '숫자야구',
    description: '숫자를 맞춰라!',
    icon: '⚾',
    type: 'individual',
    comingSoon: true,
  },
];

// 게임 ID로 게임 정보 찾기
export function getGameById(id: string): GameModule | undefined {
  return GAMES.find(game => game.id === id);
}

// 더미 게임 정보 찾기
export function getDummyGameById(id: string): DummyGameInfo | undefined {
  return DUMMY_GAMES.find(game => game.id === id);
}
