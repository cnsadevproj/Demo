// 공통 타입 정의

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
}

export interface Team {
  id: string;
  name: string;
  flag: string;
  members: User[];
  earnedRound: number;
  attackTarget?: string;
  attackBet?: number;
  defense?: number;
  receivedMission?: Mission;
}

export interface Mission {
  id: string;
  type: 'team' | 'personal';
  title: string;
  description: string;
  targetValue?: number;
  completed?: boolean;
}

export interface GrassData {
  date: string;
  completed: boolean;
  missionType: 'team' | 'personal';
}

export interface Snapshot {
  userId: string;
  weekId: string;
  bMon: number;
  bWed: number;
  earnedRound: number;
  teamId: string;
}

export interface RankingUser {
  rank: number;
  userId: string;
  name: string;
  missionCount: number;
  successRate: number;
  maxStreak: number;
  grassCount: number;
}

export interface WeekReport {
  weekId: string;
  teamResults: {
    teamId: string;
    teamName: string;
    missionSuccess: boolean;
    participationRate: number;
  }[];
  personalMissionRate: number;
  avgCookieChange: number;
}
