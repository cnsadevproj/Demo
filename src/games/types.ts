// src/games/types.ts
// 게임 모듈 공통 타입 정의

import { Student } from '../services/firestoreApi';

// 게임 타입
export type GameType = 'individual' | 'team' | 'realtime' | 'async';

// 게임 상태
export type GameStatus = 'ready' | 'playing' | 'finished';

// 게임 모듈 인터페이스
export interface GameModule {
  // 기본 정보
  id: string;                    // 고유 ID (영문, kebab-case)
  name: string;                  // 표시 이름
  description: string;           // 간단한 설명
  icon: string;                  // 이모지 아이콘
  type: GameType;                // 게임 유형

  // 선택적 정보
  minPlayers?: number;           // 최소 인원
  maxPlayers?: number;           // 최대 인원
  estimatedTime?: string;        // 예상 소요 시간 (예: "5분")

  // 게임 컴포넌트
  Component: React.ComponentType<GameComponentProps>;
}

// 게임 컴포넌트에 전달되는 Props
export interface GameComponentProps {
  student: Student;
  teacherId: string;
  classId: string;
  onClose: () => void;           // 게임 종료 시 호출
  onCookieChange?: (amount: number, reason: string) => void;  // 쿠키 변동 시
}

// Firestore 게임센터 설정 (교사별)
export interface GameCenterSettings {
  enabledGames: string[];        // 활성화된 게임 ID 목록
  gameSettings?: Record<string, any>;  // 게임별 커스텀 설정
}
