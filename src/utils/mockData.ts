// 데모용 가짜 데이터

import { Team, User, GrassData, RankingUser, WeekReport, Mission } from '../types';

export const mockUsers: User[] = [
  { id: '1', name: '김민수', email: 'minsu@school.ac.kr', role: 'student' },
  { id: '2', name: '이지은', email: 'jieun@school.ac.kr', role: 'student' },
  { id: '3', name: '박서준', email: 'seojun@school.ac.kr', role: 'student' },
  { id: '4', name: '최유나', email: 'yuna@school.ac.kr', role: 'student' },
  { id: '5', name: '정하늘', email: 'haneul@school.ac.kr', role: 'student' },
  { id: '6', name: '강민지', email: 'minji@school.ac.kr', role: 'student' },
  { id: '7', name: '윤성호', email: 'seongho@school.ac.kr', role: 'student' },
  { id: '8', name: '한소희', email: 'sohee@school.ac.kr', role: 'student' },
  { id: '9', name: '임준영', email: 'junyoung@school.ac.kr', role: 'student' },
  { id: '10', name: '송지아', email: 'jia@school.ac.kr', role: 'student' },
  { id: '11', name: '조은우', email: 'eunwoo@school.ac.kr', role: 'student' },
];

export const mockTeams: Team[] = [
  {
    id: 'team1',
    name: '불꽃 피닉스',
    flag: '🔥',
    members: [mockUsers[0], mockUsers[1], mockUsers[2], mockUsers[3]],
    earnedRound: 3200,
    attackTarget: 'team2',
    attackBet: 1500,
    defense: 800,
  },
  {
    id: 'team2',
    name: '푸른 드래곤',
    flag: '🐉',
    members: [mockUsers[4], mockUsers[5], mockUsers[6]],
    earnedRound: 2400,
    attackTarget: 'team3',
    attackBet: 1200,
    defense: 1200,
    receivedMission: {
      id: 'mission1',
      type: 'team',
      title: '팀 합산 공부시간 6시간 달성',
      description: '팀원 모두가 협력하여 목·금 이틀간 총 6시간의 공부시간을 달성하세요.',
    },
  },
  {
    id: 'team3',
    name: '황금 독수리',
    flag: '🦅',
    members: [mockUsers[7], mockUsers[8], mockUsers[9], mockUsers[10]],
    earnedRound: 2800,
    attackTarget: 'team1',
    attackBet: 1000,
    defense: 1000,
  },
];

export const mockPersonalMission: Mission = {
  id: 'personal1',
  type: 'personal',
  title: '목·금 하루 20분 이상 공부',
  description: '오늘 20분 이상 공부하고 인증하세요.',
};

// 학기 시작일을 기준으로 잔디 데이터 생성 (16주 가정)
export const generateMockGrassData = (userId: string): GrassData[] => {
  const data: GrassData[] = [];
  const startDate = new Date('2024-09-01');
  const weeks = 16;
  const daysPerWeek = 7;

  for (let i = 0; i < weeks * daysPerWeek; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    // 주말 제외, 랜덤하게 완료 여부 결정 (약 70% 완료율)
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const completed = !isWeekend && Math.random() > 0.3;

    data.push({
      date: dateStr,
      completed,
      missionType: Math.random() > 0.3 ? 'personal' : 'team',
    });
  }

  return data;
};

export const mockGrassData = generateMockGrassData('1');

export const mockRanking: RankingUser[] = [
  {
    rank: 1,
    userId: '2',
    name: '이지은',
    missionCount: 58,
    successRate: 96.7,
    maxStreak: 23,
    grassCount: 58,
  },
  {
    rank: 2,
    userId: '5',
    name: '정하늘',
    missionCount: 56,
    successRate: 93.3,
    maxStreak: 19,
    grassCount: 56,
  },
  {
    rank: 3,
    userId: '1',
    name: '김민수',
    missionCount: 54,
    successRate: 90.0,
    maxStreak: 17,
    grassCount: 54,
  },
];

export const mockWeekReport: WeekReport = {
  weekId: 'week-12',
  teamResults: [
    {
      teamId: 'team1',
      teamName: '불꽃 피닉스',
      missionSuccess: false,
      participationRate: 75,
    },
    {
      teamId: 'team2',
      teamName: '푸른 드래곤',
      missionSuccess: true,
      participationRate: 100,
    },
    {
      teamId: 'team3',
      teamName: '황금 독수리',
      missionSuccess: false,
      participationRate: 50,
    },
  ],
  personalMissionRate: 78.2,
  avgCookieChange: 245,
};

export const currentUser: User = mockUsers[0];
export const currentTeam: Team = mockTeams[0];
