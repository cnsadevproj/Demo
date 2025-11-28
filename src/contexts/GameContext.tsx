import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  GameTeam,
  GameSession,
  GameSettings,
  DEFAULT_GAME_SETTINGS,
  ReflectionKing,
  ReflectionPenalty,
  ReflectionRecord,
  BattleBet,
  RoundResult,
  GameSettlement,
  resolveBattle,
  TEAM_FLAGS,
} from '../types/game';

// 로컬 스토리지 키
const STORAGE_KEYS = {
  GAME_SESSIONS: 'dahandin_game_sessions',
  REFLECTION_KINGS: 'dahandin_reflection_kings',
  REFLECTION_PENALTIES: 'dahandin_reflection_penalties',
  GAME_SETTINGS: 'dahandin_game_settings',
  CURRENT_TEAMS: 'dahandin_current_teams',
};

interface GameContextType {
  // 게임 설정
  settings: GameSettings;
  updateSettings: (settings: Partial<GameSettings>) => void;

  // 팀 관리
  teams: GameTeam[];
  createTeam: (name: string, flag: string, memberCodes: string[], memberNames: string[]) => GameTeam;
  updateTeam: (teamId: string, updates: Partial<GameTeam>) => void;
  deleteTeam: (teamId: string) => void;
  addBonusCookies: (teamId: string, amount: number) => void;
  clearTeams: () => void;

  // 성찰왕 관리
  reflectionKings: ReflectionKing[];
  addReflectionKing: (studentCode: string, studentName: string, bonusCookies?: number, note?: string) => void;
  removeReflectionKing: (id: string) => void;
  getReflectionKingsByDate: (date: string) => ReflectionKing[];

  // 미성찰 페널티 관리
  reflectionPenalties: ReflectionPenalty[];
  addReflectionPenalty: (studentCode: string, studentName: string, penaltyCookies: number, reason?: string) => void;
  removeReflectionPenalty: (id: string) => void;

  // 성찰 기록 조회
  getReflectionRecords: (studentCodes: string[], studentNames: string[]) => ReflectionRecord[];

  // 게임 세션 관리
  currentSession: GameSession | null;
  startNewGame: (classId: string, className: string, teams: GameTeam[], totalRounds: number) => void;
  submitBets: (bets: BattleBet[]) => void;
  executeRound: () => RoundResult | null;
  finishGame: () => GameSettlement[];
  cancelGame: () => void;

  // 게임 히스토리
  gameSessions: GameSession[];
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  // 설정
  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GAME_SETTINGS);
    return saved ? JSON.parse(saved) : DEFAULT_GAME_SETTINGS;
  });

  // 팀 목록
  const [teams, setTeams] = useState<GameTeam[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_TEAMS);
    return saved ? JSON.parse(saved) : [];
  });

  // 성찰왕 기록
  const [reflectionKings, setReflectionKings] = useState<ReflectionKing[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REFLECTION_KINGS);
    return saved ? JSON.parse(saved) : [];
  });

  // 미성찰 페널티 기록
  const [reflectionPenalties, setReflectionPenalties] = useState<ReflectionPenalty[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REFLECTION_PENALTIES);
    return saved ? JSON.parse(saved) : [];
  });

  // 게임 세션
  const [gameSessions, setGameSessions] = useState<GameSession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GAME_SESSIONS);
    return saved ? JSON.parse(saved) : [];
  });

  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);

  // 로컬 스토리지 동기화
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GAME_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_TEAMS, JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REFLECTION_KINGS, JSON.stringify(reflectionKings));
  }, [reflectionKings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REFLECTION_PENALTIES, JSON.stringify(reflectionPenalties));
  }, [reflectionPenalties]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GAME_SESSIONS, JSON.stringify(gameSessions));
  }, [gameSessions]);

  // 설정 업데이트
  const updateSettings = useCallback((updates: Partial<GameSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // 팀 생성
  const createTeam = useCallback((
    name: string,
    flag: string,
    memberCodes: string[],
    memberNames: string[]
  ): GameTeam => {
    const newTeam: GameTeam = {
      id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      flag,
      memberCodes,
      memberNames,
      baseCookies: 0,
      bonusCookies: 0,
      totalCookies: 0,
    };
    setTeams(prev => [...prev, newTeam]);
    return newTeam;
  }, []);

  // 팀 업데이트
  const updateTeam = useCallback((teamId: string, updates: Partial<GameTeam>) => {
    setTeams(prev => prev.map(team => {
      if (team.id === teamId) {
        const updated = { ...team, ...updates };
        updated.totalCookies = updated.baseCookies + updated.bonusCookies;
        return updated;
      }
      return team;
    }));
  }, []);

  // 팀 삭제
  const deleteTeam = useCallback((teamId: string) => {
    setTeams(prev => prev.filter(team => team.id !== teamId));
  }, []);

  // 보너스 쿠키 추가
  const addBonusCookies = useCallback((teamId: string, amount: number) => {
    setTeams(prev => prev.map(team => {
      if (team.id === teamId) {
        const newBonus = team.bonusCookies + amount;
        return {
          ...team,
          bonusCookies: newBonus,
          totalCookies: team.baseCookies + newBonus,
        };
      }
      return team;
    }));
  }, []);

  // 팀 초기화
  const clearTeams = useCallback(() => {
    setTeams([]);
  }, []);

  // 성찰왕 추가
  const addReflectionKing = useCallback((
    studentCode: string,
    studentName: string,
    bonusCookies: number = settings.defaultBonusCookies,
    note?: string
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const newKing: ReflectionKing = {
      id: `king_${Date.now()}`,
      date: today,
      studentCode,
      studentName,
      bonusCookies,
      note,
    };

    // 해당 학생이 속한 팀에 보너스 쿠키 추가
    const studentTeam = teams.find(team => team.memberCodes.includes(studentCode));
    if (studentTeam) {
      newKing.teamId = studentTeam.id;
      addBonusCookies(studentTeam.id, bonusCookies);
    }

    setReflectionKings(prev => [...prev, newKing]);
  }, [settings.defaultBonusCookies, teams, addBonusCookies]);

  // 성찰왕 삭제
  const removeReflectionKing = useCallback((id: string) => {
    const king = reflectionKings.find(k => k.id === id);
    if (king && king.teamId) {
      // 보너스 쿠키 회수
      addBonusCookies(king.teamId, -king.bonusCookies);
    }
    setReflectionKings(prev => prev.filter(k => k.id !== id));
  }, [reflectionKings, addBonusCookies]);

  // 날짜별 성찰왕 조회
  const getReflectionKingsByDate = useCallback((date: string) => {
    return reflectionKings.filter(k => k.date === date);
  }, [reflectionKings]);

  // 미성찰 페널티 추가
  const addReflectionPenalty = useCallback((
    studentCode: string,
    studentName: string,
    penaltyCookies: number,
    reason: string = '미성찰'
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const newPenalty: ReflectionPenalty = {
      id: `penalty_${Date.now()}`,
      date: today,
      studentCode,
      studentName,
      penaltyCookies,
      reason,
    };

    // 해당 학생이 속한 팀에서 쿠키 차감
    const studentTeam = teams.find(team => team.memberCodes.includes(studentCode));
    if (studentTeam) {
      newPenalty.teamId = studentTeam.id;
      addBonusCookies(studentTeam.id, -penaltyCookies);
    }

    setReflectionPenalties(prev => [...prev, newPenalty]);
  }, [teams, addBonusCookies]);

  // 미성찰 페널티 삭제
  const removeReflectionPenalty = useCallback((id: string) => {
    const penalty = reflectionPenalties.find(p => p.id === id);
    if (penalty && penalty.teamId) {
      // 페널티 쿠키 복구
      addBonusCookies(penalty.teamId, penalty.penaltyCookies);
    }
    setReflectionPenalties(prev => prev.filter(p => p.id !== id));
  }, [reflectionPenalties, addBonusCookies]);

  // 성찰 기록 조회
  const getReflectionRecords = useCallback((
    studentCodes: string[],
    studentNames: string[]
  ): ReflectionRecord[] => {
    return studentCodes.map((code, index) => {
      const kings = reflectionKings.filter(k => k.studentCode === code);
      const penalties = reflectionPenalties.filter(p => p.studentCode === code);

      const kingCount = kings.length;
      const penaltyCount = penalties.length;
      const totalBonus = kings.reduce((sum, k) => sum + k.bonusCookies, 0);
      const totalPenalty = penalties.reduce((sum, p) => sum + p.penaltyCookies, 0);
      const lastKingDate = kings.length > 0
        ? kings.sort((a, b) => b.date.localeCompare(a.date))[0].date
        : undefined;

      return {
        studentCode: code,
        studentName: studentNames[index] || code,
        kingCount,
        penaltyCount,
        totalBonus,
        totalPenalty,
        lastKingDate,
        neverReflected: kingCount === 0,
      };
    });
  }, [reflectionKings, reflectionPenalties]);

  // 새 게임 시작
  const startNewGame = useCallback((
    classId: string,
    className: string,
    gameTeams: GameTeam[],
    totalRounds: number
  ) => {
    const newSession: GameSession = {
      id: `game_${Date.now()}`,
      classId,
      className,
      createdAt: new Date().toISOString(),
      status: 'setup',
      teams: gameTeams,
      currentRound: 0,
      totalRounds,
      rounds: [],
      settlements: [],
    };
    setCurrentSession(newSession);
  }, []);

  // 배팅 제출
  const submitBets = useCallback((bets: BattleBet[]) => {
    if (!currentSession) return;
    setCurrentSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        status: 'battle',
        currentRound: prev.currentRound + 1,
      };
    });
  }, [currentSession]);

  // 라운드 실행
  const executeRound = useCallback((): RoundResult | null => {
    // 실제 배틀 로직은 컴포넌트에서 처리
    return null;
  }, []);

  // 게임 종료
  const finishGame = useCallback((): GameSettlement[] => {
    if (!currentSession) return [];

    const settlements: GameSettlement[] = currentSession.teams.map((team, index) => ({
      teamId: team.id,
      teamName: team.name,
      startCookies: team.totalCookies,
      totalWins: 0,
      totalLosses: 0,
      cookiesWon: 0,
      cookiesLost: 0,
      defensePenalty: 0,
      finalCookies: team.totalCookies,
      rank: index + 1,
    }));

    const finishedSession: GameSession = {
      ...currentSession,
      status: 'finished',
      settlements,
    };

    setGameSessions(prev => [...prev, finishedSession]);
    setCurrentSession(null);

    return settlements;
  }, [currentSession]);

  // 게임 취소
  const cancelGame = useCallback(() => {
    setCurrentSession(null);
  }, []);

  const value: GameContextType = {
    settings,
    updateSettings,
    teams,
    createTeam,
    updateTeam,
    deleteTeam,
    addBonusCookies,
    clearTeams,
    reflectionKings,
    addReflectionKing,
    removeReflectionKing,
    getReflectionKingsByDate,
    reflectionPenalties,
    addReflectionPenalty,
    removeReflectionPenalty,
    getReflectionRecords,
    currentSession,
    startNewGame,
    submitBets,
    executeRound,
    finishGame,
    cancelGame,
    gameSessions,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
