// src/games/CookieBattleTeacher.tsx
// 팀 쿠키 배틀 - 교사용 게임 관리 페이지

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebase';
import {
  doc, onSnapshot, updateDoc, collection, getDocs, deleteDoc,
  setDoc, getDoc, writeBatch
} from 'firebase/firestore';

// 전투 내러티브 템플릿 (중세풍)
const BATTLE_NARRATIVES = {
  attackWin: [
    "{attacker}의 기사단이 {defender}의 성벽을 뚫었다! 쿠키 {amount}개 약탈!",
    "{attacker}가 {defender}의 허를 찔러 대승! 전리품 {amount}개!",
    "{attacker}의 투석기가 {defender}의 창고를 명중! 쿠키 {amount}개 탈취!",
    "용맹한 {attacker}! {defender}를 무릎 꿇렸다. 쿠키 {amount}개 획득!",
    "{attacker}의 기습 작전 성공! {defender}에서 {amount}개 쿠키 확보!",
    "{defender}의 수비가 무너졌다! {attacker}가 {amount}개 챙겨 도주!",
    "{attacker}의 공성전 대성공! {defender} 함락, 쿠키 {amount}개!",
    "전설이 시작되었다! {attacker}가 {defender}를 격파! +{amount}쿠키!",
  ],
  attackLose: [
    "{attacker}의 공격이 {defender}의 철벽 수비에 막혔다! 쿠키 {amount}개 손실!",
    "{defender}의 함정에 빠진 {attacker}! 쿠키 {amount}개 잃음!",
    "{attacker}의 무모한 돌격... {defender}에게 쿠키 {amount}개 빼앗김!",
    "안타까운 {attacker}! {defender}의 역습에 {amount}개 손실!",
    "{defender}의 성이 너무 견고했다! {attacker} 퇴각, -{amount}쿠키!",
    "{attacker}의 작전 실패! {defender}의 궁수대에 쿠키 {amount}개 헌납!",
    "오만했던 {attacker}... {defender}에게 무릎 꿇고 쿠키 {amount}개 바침!",
    "{attacker}의 기사들이 길을 잃었다! {defender}가 {amount}개 노획!",
  ],
  elimination: [
    "{team}이(가) 패가망신하여 고향으로 내려갑니다...",
    "{team}의 금고가 텅텅! 왕국이 멸망했습니다!",
    "{team}의 마지막 쿠키가 사라졌다... 역사 속으로...",
    "안녕, {team}! 다음 시즌에서 만나요~",
    "{team}의 성이 폐허가 되었습니다. 탈락!",
    "{team}의 백성들이 모두 떠났습니다. 게임 오버!",
    "전설은 여기까지! {team}의 모험이 끝났습니다.",
    "{team}: '다음엔 꼭...!' (퇴장)",
  ],
  defenseUnused: [
    "{team}이(가) 수비에 {amount}개를 배팅했지만 아무도 공격하지 않았다! {refund}개 반환!",
    "{team}의 철벽 수비... 아무도 안 왔다! {refund}개 되찾음!",
    "외로운 {team}의 성... 공격자 없음! {refund}개 환불!",
  ],
  studentAction: [
    "{name}이(가) 성벽에서 활을 쏘았다!",
    "{name}이(가) 투석기를 발사했다!",
    "{name}이(가) 선봉에 서서 돌격했다!",
    "{name}이(가) 적의 함정을 발견했다!",
    "{name}이(가) 용맹하게 싸웠다!",
    "{name}이(가) 적의 화살을 막아냈다!",
    "{name}이(가) 성문을 지켰다!",
    "{name}이(가) 기발한 전술을 제안했다!",
    "{name}이(가) 쿠키 창고를 사수했다!",
    "{name}이(가) 적장을 베었다!",
  ],
  studentFail: [
    "{name}이(가) 지나가다 쿠키를 탐하다 활에 맞았다!",
    "{name}이(가) 성벽에서 미끄러졌다!",
    "{name}이(가) 적의 함정에 빠졌다!",
    "{name}이(가) 쿠키를 들고 도망치다 잡혔다!",
    "{name}이(가) 길을 잃고 헤매고 있다!",
    "{name}이(가) 투석에 맞아 쿠키를 떨어뜨렸다!",
  ],
};

type LossMode = 'basic' | 'zeroSum' | 'soft';
type CurrencyMode = 'current' | 'earned';
type GameStatus = 'waiting' | 'betting' | 'targeting' | 'battle' | 'result' | 'finished';

interface TeamData {
  id: string;
  name: string;
  emoji: string;
  resources: number;
  initialResources: number;
  members: string[]; // student codes
  representativeCode: string | null;
  attackBet: number;
  defenseBet: number;
  targetTeamId: string | null;
  isEliminated: boolean;
  isReady: boolean; // 배팅 완료 여부
}

interface StudentInfo {
  code: string;
  name: string;
  number: number;
  teamId: string;
  isOnline: boolean;
  hasReflected: boolean; // 축적 기간 동안 성찰 여부
  jelly?: number;
  cookie?: number;
}

interface GameData {
  teacherId: string;
  classId: string;
  className?: string;
  gameType: 'cookieBattle';
  status: GameStatus;
  lossMode: LossMode;
  currencyMode: CurrencyMode;
  round: number;
  createdAt: any;
  accumulationStartDate: string; // 팀 결성일
  battleLog: string[];
}

interface BattleResult {
  attackerTeamId: string;
  defenderTeamId: string;
  attackBet: number;
  defenseBet: number;
  attackerWins: boolean;
  winProbability: number;
  attackerChange: number;
  defenderChange: number;
}

export function CookieBattleTeacher() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [students, setStudents] = useState<Map<string, StudentInfo>>(new Map());
  const [battleResults, setBattleResults] = useState<BattleResult[]>([]);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 정산 모달
  const [showSettlement, setShowSettlement] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [candyAmount, setCandyAmount] = useState('');
  const [isAddingCandy, setIsAddingCandy] = useState(false);

  // 게임 데이터 구독
  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameData;
        setGameData(data);
        setBattleLog(data.battleLog || []);
      } else {
        alert('게임이 삭제되었습니다.');
        window.close();
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  // 팀 데이터 구독
  useEffect(() => {
    if (!gameId) return;

    const teamsRef = collection(db, 'games', gameId, 'teams');
    const unsubscribe = onSnapshot(teamsRef, (snapshot) => {
      const teamList: TeamData[] = [];
      snapshot.forEach((doc) => {
        teamList.push({ id: doc.id, ...doc.data() } as TeamData);
      });
      // 팀 이름순 정렬
      teamList.sort((a, b) => a.name.localeCompare(b.name));
      setTeams(teamList);
    });

    return () => unsubscribe();
  }, [gameId]);

  // 학생 정보 구독 (studentInfo subcollection)
  useEffect(() => {
    if (!gameId) return;

    const studentInfoRef = collection(db, 'games', gameId, 'studentInfo');
    const unsubscribe = onSnapshot(studentInfoRef, (snapshot) => {
      const newMap = new Map<string, StudentInfo>();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        newMap.set(docSnap.id, {
          code: docSnap.id,
          name: data.name || docSnap.id,
          number: data.number || 0,
          teamId: data.teamId || '',
          isOnline: data.isOnline || false,
          hasReflected: data.hasReflected ?? true,
          jelly: data.jelly || 0,
          cookie: data.cookie || 0
        });
      });
      setStudents(newMap);
    });

    return () => unsubscribe();
  }, [gameId]);

  // 학생 접속 상태 구독 (players subcollection - 접속 시 생성됨)
  useEffect(() => {
    if (!gameId) return;

    const playersRef = collection(db, 'games', gameId, 'players');
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      setStudents(prev => {
        const newMap = new Map(prev);
        // 먼저 모든 학생을 오프라인으로 설정
        newMap.forEach((student, code) => {
          newMap.set(code, { ...student, isOnline: false });
        });
        // 접속한 학생만 온라인으로 표시
        snapshot.forEach((docSnap) => {
          const existing = newMap.get(docSnap.id);
          if (existing) {
            newMap.set(docSnap.id, { ...existing, isOnline: true });
          }
        });
        return newMap;
      });
    });

    return () => unsubscribe();
  }, [gameId]);

  // 내러티브 생성 함수
  const generateNarrative = useCallback((
    type: keyof typeof BATTLE_NARRATIVES,
    params: Record<string, string | number>
  ): string => {
    const templates = BATTLE_NARRATIVES[type];
    const template = templates[Math.floor(Math.random() * templates.length)];
    return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] || ''));
  }, []);

  // 학생 액션 내러티브 생성
  const generateStudentNarratives = useCallback((
    teamMembers: string[],
    isWin: boolean
  ): string[] => {
    const narratives: string[] = [];
    const actionCount = Math.min(2, teamMembers.length);
    const shuffled = [...teamMembers].sort(() => Math.random() - 0.5);

    for (let i = 0; i < actionCount; i++) {
      const studentInfo = students.get(shuffled[i]);
      if (studentInfo) {
        const type = isWin ? 'studentAction' : (Math.random() < 0.5 ? 'studentAction' : 'studentFail');
        narratives.push(generateNarrative(type, { name: studentInfo.name }));
      }
    }
    return narratives;
  }, [students, generateNarrative]);

  // 라운드 시작 (배팅 단계로)
  const startBettingPhase = async () => {
    if (!gameId || !gameData) return;
    setIsProcessing(true);

    try {
      const batch = writeBatch(db);
      const gameRef = doc(db, 'games', gameId);

      // 모든 팀의 배팅 초기화
      for (const team of teams) {
        if (!team.isEliminated) {
          const teamRef = doc(db, 'games', gameId, 'teams', team.id);
          batch.update(teamRef, {
            attackBet: 0,
            defenseBet: 0,
            targetTeamId: null,
            isReady: false,
          });
        }
      }

      batch.update(gameRef, {
        status: 'betting',
        round: gameData.round + 1,
      });

      await batch.commit();
    } catch (error) {
      console.error('Failed to start betting phase:', error);
      alert('배팅 단계 시작에 실패했습니다.');
    }
    setIsProcessing(false);
  };

  // 공격 대상 선택 단계로
  const startTargetingPhase = async () => {
    if (!gameId) return;
    setIsProcessing(true);

    try {
      await updateDoc(doc(db, 'games', gameId), {
        status: 'targeting',
      });
    } catch (error) {
      console.error('Failed to start targeting phase:', error);
    }
    setIsProcessing(false);
  };

  // 전투 실행
  const executeBattle = async () => {
    if (!gameId || !gameData) return;
    setIsProcessing(true);

    try {
      const results: BattleResult[] = [];
      const newBattleLog: string[] = [...battleLog];
      newBattleLog.push(`\n===== 라운드 ${gameData.round} =====`);

      const batch = writeBatch(db);
      const teamUpdates: Map<string, { resources: number; isEliminated: boolean }> = new Map();

      // 초기화
      teams.forEach(team => {
        teamUpdates.set(team.id, {
          resources: team.resources,
          isEliminated: team.isEliminated
        });
      });

      // 공격하는 팀들 처리
      const attackingTeams = teams.filter(t => !t.isEliminated && t.targetTeamId && t.attackBet > 0);
      const attackedTeamIds = new Set(attackingTeams.map(t => t.targetTeamId!));

      // 각 전투 처리
      for (const attacker of attackingTeams) {
        const defender = teams.find(t => t.id === attacker.targetTeamId);
        if (!defender || defender.isEliminated) continue;

        const attackBet = attacker.attackBet;
        const defenseBet = defender.defenseBet;

        // 승률 계산 (10% ~ 90%)
        let winProbability = attackBet / (attackBet + defenseBet);
        winProbability = Math.max(0.1, Math.min(0.9, winProbability));

        // 승패 결정
        const attackerWins = Math.random() < winProbability;

        // 손실 계산
        let attackerChange = 0;
        let defenderChange = 0;

        if (attackerWins) {
          // 공격 성공
          switch (gameData.lossMode) {
            case 'basic':
              attackerChange = Math.floor(defenseBet * 0.3);
              defenderChange = -defenseBet;
              break;
            case 'zeroSum':
              attackerChange = defenseBet;
              defenderChange = -defenseBet;
              break;
            case 'soft':
              attackerChange = Math.floor(defenseBet * 0.2);
              defenderChange = -Math.floor(defenseBet * 0.5);
              break;
          }
          // 공격자는 배팅액 유지
          attackerChange -= attackBet; // 배팅액 소모
          attackerChange += attackBet; // 배팅액 회수 (승리)
        } else {
          // 공격 실패
          switch (gameData.lossMode) {
            case 'basic':
            case 'zeroSum':
              attackerChange = -attackBet;
              defenderChange = Math.floor(attackBet * 0.3);
              break;
            case 'soft':
              attackerChange = -Math.floor(attackBet * 0.5);
              defenderChange = Math.floor(attackBet * 0.2);
              break;
          }
        }

        results.push({
          attackerTeamId: attacker.id,
          defenderTeamId: defender.id,
          attackBet,
          defenseBet,
          attackerWins,
          winProbability,
          attackerChange,
          defenderChange,
        });

        // 업데이트 적용
        const attackerData = teamUpdates.get(attacker.id)!;
        const defenderData = teamUpdates.get(defender.id)!;
        attackerData.resources = Math.max(0, attackerData.resources + attackerChange);
        defenderData.resources = Math.max(0, defenderData.resources + defenderChange);

        // 내러티브 생성
        const narrativeType = attackerWins ? 'attackWin' : 'attackLose';
        const changeAmount = attackerWins ? attackerChange : -attackerChange;
        newBattleLog.push(generateNarrative(narrativeType, {
          attacker: `${attacker.emoji} ${attacker.name}`,
          defender: `${defender.emoji} ${defender.name}`,
          amount: Math.abs(changeAmount),
        }));

        // 학생 액션 내러티브
        const studentNarratives = generateStudentNarratives(attacker.members, attackerWins);
        studentNarratives.forEach(n => newBattleLog.push(`  └ ${n}`));
      }

      // 수비만 하고 공격 안 받은 팀 처리
      for (const team of teams) {
        if (team.isEliminated || !team.defenseBet) continue;
        if (!attackedTeamIds.has(team.id)) {
          const teamData = teamUpdates.get(team.id)!;
          const refundRate = gameData.lossMode === 'soft' ? 1.0 : 0.7;
          const refund = Math.floor(team.defenseBet * refundRate);
          teamData.resources = teamData.resources - team.defenseBet + refund;

          newBattleLog.push(generateNarrative('defenseUnused', {
            team: `${team.emoji} ${team.name}`,
            amount: team.defenseBet,
            refund: refund,
          }));
        }
      }

      // 탈락 처리
      teamUpdates.forEach((data, teamId) => {
        if (data.resources <= 0 && !data.isEliminated) {
          data.isEliminated = true;
          data.resources = 0;
          const team = teams.find(t => t.id === teamId);
          if (team) {
            newBattleLog.push(generateNarrative('elimination', {
              team: `${team.emoji} ${team.name}`,
            }));
          }
        }
      });

      // Firebase 업데이트
      teamUpdates.forEach((data, teamId) => {
        const teamRef = doc(db, 'games', gameId, 'teams', teamId);
        batch.update(teamRef, {
          resources: data.resources,
          isEliminated: data.isEliminated,
        });
      });

      const gameRef = doc(db, 'games', gameId);
      batch.update(gameRef, {
        status: 'result',
        battleLog: newBattleLog,
      });

      await batch.commit();
      setBattleResults(results);
      setBattleLog(newBattleLog);

    } catch (error) {
      console.error('Failed to execute battle:', error);
      alert('전투 실행에 실패했습니다.');
    }
    setIsProcessing(false);
  };

  // 게임 종료
  const endGame = async () => {
    if (!gameId) return;
    if (!confirm('게임을 종료하시겠습니까?')) return;

    try {
      await updateDoc(doc(db, 'games', gameId), {
        status: 'finished',
      });
    } catch (error) {
      console.error('Failed to end game:', error);
    }
  };

  // 게임 삭제
  const deleteGame = async () => {
    if (!gameId) return;
    if (!confirm('정말 게임을 삭제하시겠습니까?')) return;

    try {
      // 하위 컬렉션 삭제
      const teamsRef = collection(db, 'games', gameId, 'teams');
      const teamsSnap = await getDocs(teamsRef);
      for (const teamDoc of teamsSnap.docs) {
        await deleteDoc(teamDoc.ref);
      }

      const playersRef = collection(db, 'games', gameId, 'players');
      const playersSnap = await getDocs(playersRef);
      for (const playerDoc of playersSnap.docs) {
        await deleteDoc(playerDoc.ref);
      }

      await deleteDoc(doc(db, 'games', gameId));
      window.close();
    } catch (error) {
      console.error('Failed to delete game:', error);
    }
  };

  // 대표자 지정
  const setRepresentative = async (teamId: string, studentCode: string) => {
    if (!gameId) return;

    try {
      await updateDoc(doc(db, 'games', gameId, 'teams', teamId), {
        representativeCode: studentCode,
      });
    } catch (error) {
      console.error('Failed to set representative:', error);
    }
  };

  // 팀 재화 조정
  const adjustTeamResources = async (teamId: string, amount: number) => {
    if (!gameId) return;

    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    try {
      await updateDoc(doc(db, 'games', gameId, 'teams', teamId), {
        resources: Math.max(0, team.resources + amount),
      });
    } catch (error) {
      console.error('Failed to adjust resources:', error);
    }
  };

  // 캔디 부여/차감
  const handleAddCandy = async (directAmount?: number) => {
    if (!gameData || !selectedStudent) return;

    const amount = directAmount !== undefined ? directAmount : parseInt(candyAmount);
    if (isNaN(amount) || amount === 0) return;

    setIsAddingCandy(true);
    try {
      const studentRef = doc(db, 'teachers', gameData.teacherId, 'students', selectedStudent.code);
      const currentCandy = selectedStudent.jelly ?? selectedStudent.cookie ?? 0;
      const newCandy = Math.max(0, currentCandy + amount);

      await updateDoc(studentRef, {
        jelly: newCandy,
      });

      // 학생 정보 업데이트
      setStudents(prev => {
        const newMap = new Map(prev);
        const student = newMap.get(selectedStudent.code);
        if (student) {
          newMap.set(selectedStudent.code, { ...student, jelly: newCandy });
        }
        return newMap;
      });

      setSelectedStudent(prev => prev ? { ...prev, jelly: newCandy } : null);
      setCandyAmount('');
    } catch (error) {
      console.error('Failed to add candy:', error);
      alert('캔디 부여에 실패했습니다.');
    }
    setIsAddingCandy(false);
  };

  // 로딩
  if (!gameId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 to-stone-900 flex items-center justify-center">
        <div className="text-white text-xl">게임 ID가 없습니다</div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 to-stone-900 flex items-center justify-center">
        <div className="text-6xl animate-bounce">🏰</div>
      </div>
    );
  }

  const aliveTeams = teams.filter(t => !t.isEliminated);
  const allTeamsReady = aliveTeams.every(t => t.isReady);

  // 손실 모드 라벨
  const lossModeLabels: Record<LossMode, { emoji: string; name: string }> = {
    basic: { emoji: '⚔️', name: '기본' },
    zeroSum: { emoji: '💀', name: '제로섬' },
    soft: { emoji: '🌸', name: '부드러운' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-900 via-stone-800 to-stone-900 p-4">
      {/* 헤더 */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-stone-800/80 backdrop-blur rounded-2xl p-6 mb-6 border border-amber-600/30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-amber-400 flex items-center gap-3">
                <span>🏰</span>
                <span>쿠키 배틀</span>
              </h1>
              <p className="text-stone-400 mt-1">{gameData.className || '게임'}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-stone-500 text-xs">라운드</p>
                <p className="text-2xl font-bold text-amber-400">{gameData.round}</p>
              </div>
              <div className="text-center">
                <p className="text-stone-500 text-xs">모드</p>
                <p className="text-lg">
                  {lossModeLabels[gameData.lossMode].emoji} {lossModeLabels[gameData.lossMode].name}
                </p>
              </div>
              <span className={`px-4 py-2 rounded-full font-bold ${
                gameData.status === 'waiting' ? 'bg-stone-600 text-stone-300' :
                gameData.status === 'betting' ? 'bg-blue-600 text-white' :
                gameData.status === 'targeting' ? 'bg-purple-600 text-white' :
                gameData.status === 'battle' ? 'bg-red-600 text-white' :
                gameData.status === 'result' ? 'bg-green-600 text-white' :
                'bg-stone-500 text-white'
              }`}>
                {gameData.status === 'waiting' && '⏳ 대기중'}
                {gameData.status === 'betting' && '💰 배팅 중'}
                {gameData.status === 'targeting' && '🎯 공격 대상 선택'}
                {gameData.status === 'battle' && '⚔️ 전투 중'}
                {gameData.status === 'result' && '📊 결과'}
                {gameData.status === 'finished' && '🏁 종료'}
              </span>
            </div>
          </div>
        </div>

        {/* 팀 배치 (원형) */}
        <div className="bg-stone-800/50 backdrop-blur rounded-2xl p-8 mb-6 border border-amber-600/20">
          <div className="relative" style={{ minHeight: '400px' }}>
            {/* 중앙 표시 */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="text-6xl">⚔️</div>
            </div>

            {/* 팀들을 원형으로 배치 */}
            {teams.map((team, index) => {
              const angle = (2 * Math.PI * index) / teams.length - Math.PI / 2;
              const radius = 160;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <div
                  key={team.id}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${
                    team.isEliminated ? 'opacity-40 grayscale' : ''
                  }`}
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                  }}
                >
                  {/* 성 카드 */}
                  <div className={`bg-gradient-to-b from-stone-700 to-stone-800 rounded-xl p-4 border-2 min-w-[140px] ${
                    team.isEliminated
                      ? 'border-stone-600'
                      : team.isReady
                        ? 'border-green-500'
                        : 'border-amber-500'
                  } shadow-lg`}>
                    <div className="text-center">
                      <div className="text-4xl mb-1">{team.emoji}</div>
                      <p className="font-bold text-white text-sm">{team.name}</p>
                      <p className={`text-2xl font-bold mt-1 ${
                        team.isEliminated ? 'text-stone-500' : 'text-amber-400'
                      }`}>
                        🍪 {team.resources}
                      </p>
                      {team.isEliminated && (
                        <p className="text-xs text-red-400 mt-1">💀 탈락</p>
                      )}
                      {!team.isEliminated && team.representativeCode && (
                        <p className="text-xs text-green-400 mt-1">
                          👑 {students.get(team.representativeCode)?.name || '대표'}
                        </p>
                      )}
                    </div>

                    {/* 대기중일 때 재화 조정 버튼 */}
                    {gameData.status === 'waiting' && !team.isEliminated && (
                      <div className="flex justify-center gap-1 mt-2">
                        <button
                          onClick={() => adjustTeamResources(team.id, -10)}
                          className="px-2 py-1 bg-red-600/50 text-red-200 rounded text-xs hover:bg-red-600"
                        >
                          -10
                        </button>
                        <button
                          onClick={() => adjustTeamResources(team.id, 10)}
                          className="px-2 py-1 bg-green-600/50 text-green-200 rounded text-xs hover:bg-green-600"
                        >
                          +10
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 배팅 정보 (교사에게만 보임) */}
                  {(gameData.status === 'betting' || gameData.status === 'targeting') && !team.isEliminated && (
                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/80 rounded-lg px-3 py-1 text-xs whitespace-nowrap">
                      <span className="text-red-400">⚔️{team.attackBet}</span>
                      <span className="text-stone-500 mx-1">/</span>
                      <span className="text-blue-400">🛡️{team.defenseBet}</span>
                      {team.targetTeamId && (
                        <span className="text-amber-400 ml-2">
                          → {teams.find(t => t.id === team.targetTeamId)?.emoji}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 팀 상세 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {teams.map(team => (
            <div
              key={team.id}
              className={`bg-stone-800/80 rounded-xl p-4 border ${
                team.isEliminated ? 'border-stone-700 opacity-60' : 'border-amber-600/30'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{team.emoji}</span>
                  <span className="font-bold text-white">{team.name}</span>
                </div>
                <span className="text-amber-400 font-bold">🍪 {team.resources}</span>
              </div>

              {/* 팀원 목록 */}
              <div className="space-y-1">
                {team.members.map(code => {
                  const student = students.get(code);
                  const isRepresentative = team.representativeCode === code;
                  return (
                    <div
                      key={code}
                      className={`flex items-center justify-between px-2 py-1 rounded ${
                        student?.isOnline
                          ? 'bg-green-900/30'
                          : student?.hasReflected === false
                            ? 'bg-red-900/30'
                            : 'bg-stone-700/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isRepresentative && <span className="text-yellow-400">👑</span>}
                        <span className={`text-sm ${
                          student?.hasReflected === false ? 'text-red-400' : 'text-stone-300'
                        }`}>
                          {student?.name || code}
                        </span>
                      </div>
                      {gameData.status === 'waiting' && !team.isEliminated && (
                        <button
                          onClick={() => setRepresentative(team.id, code)}
                          className={`text-xs px-2 py-0.5 rounded ${
                            isRepresentative
                              ? 'bg-yellow-600 text-white'
                              : 'bg-stone-600 text-stone-300 hover:bg-stone-500'
                          }`}
                        >
                          {isRepresentative ? '대표' : '지정'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 전투 로그 */}
        {battleLog.length > 0 && (
          <div className="bg-stone-800/80 rounded-xl p-4 mb-6 border border-amber-600/20">
            <h3 className="font-bold text-amber-400 mb-3">📜 전투 기록</h3>
            <div className="max-h-48 overflow-y-auto space-y-1 text-sm">
              {battleLog.slice().reverse().map((log, i) => (
                <p key={i} className={`${
                  log.startsWith('=') ? 'text-amber-400 font-bold mt-2' : 'text-stone-300'
                }`}>
                  {log}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* 컨트롤 버튼 */}
        <div className="bg-stone-800/80 rounded-xl p-4 border border-amber-600/20">
          <div className="flex flex-wrap gap-3">
            {gameData.status === 'waiting' && (
              <>
                <button
                  onClick={startBettingPhase}
                  disabled={aliveTeams.length < 2 || aliveTeams.some(t => !t.representativeCode) || isProcessing}
                  className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🚀 라운드 {gameData.round + 1} 시작
                </button>
                <button
                  onClick={deleteGame}
                  className="px-6 py-3 rounded-xl bg-red-600/30 text-red-300 font-bold hover:bg-red-600/50"
                >
                  삭제
                </button>
              </>
            )}

            {gameData.status === 'betting' && (
              <>
                <button
                  onClick={startTargetingPhase}
                  disabled={!allTeamsReady || isProcessing}
                  className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🎯 공격 대상 선택 단계로
                </button>
                <span className="text-stone-400 self-center text-sm">
                  {aliveTeams.filter(t => t.isReady).length}/{aliveTeams.length} 팀 준비 완료
                </span>
              </>
            )}

            {gameData.status === 'targeting' && (
              <button
                onClick={executeBattle}
                disabled={aliveTeams.some(t => t.attackBet > 0 && !t.targetTeamId) || isProcessing}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⚔️ 전투 시작!
              </button>
            )}

            {gameData.status === 'result' && (
              <>
                <button
                  onClick={startBettingPhase}
                  disabled={aliveTeams.length < 2 || isProcessing}
                  className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-50"
                >
                  ➡️ 다음 라운드
                </button>
                <button
                  onClick={endGame}
                  className="px-6 py-3 rounded-xl bg-stone-600 text-white font-bold hover:bg-stone-700"
                >
                  🏁 게임 종료
                </button>
              </>
            )}

            {gameData.status === 'finished' && (
              <>
                <button
                  onClick={() => setShowSettlement(true)}
                  className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700"
                >
                  💰 정산하기
                </button>
                <button
                  onClick={() => window.close()}
                  className="px-6 py-3 rounded-xl bg-stone-600 text-white font-bold hover:bg-stone-700"
                >
                  창 닫기
                </button>
              </>
            )}
          </div>

          {/* 안내 메시지 */}
          <div className="mt-4 text-center text-stone-500 text-sm">
            {gameData.status === 'waiting' && aliveTeams.some(t => !t.representativeCode) && (
              <p>⚠️ 각 팀의 대표자를 먼저 지정해주세요</p>
            )}
            {gameData.status === 'betting' && (
              <p>각 팀 대표자가 공격/수비 배팅을 진행합니다</p>
            )}
            {gameData.status === 'targeting' && (
              <p>공격할 팀을 선택하세요. 공격 배팅이 있는 팀은 반드시 대상을 선택해야 합니다.</p>
            )}
            {gameData.status === 'result' && aliveTeams.length < 2 && (
              <p className="text-amber-400">🏆 게임 종료! 남은 팀: {aliveTeams[0]?.name || '없음'}</p>
            )}
          </div>
        </div>
      </div>

      {/* 정산 모달 */}
      {showSettlement && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !selectedStudent && setShowSettlement(false)}
        >
          <div
            className="bg-stone-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-stone-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">💰 정산</h3>
              <button
                onClick={() => setShowSettlement(false)}
                className="text-stone-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* 팀별 학생 목록 */}
              {teams.map(team => (
                <div key={team.id} className="mb-4">
                  <h4 className="font-bold text-amber-400 mb-2">
                    {team.emoji} {team.name}
                    <span className="text-stone-500 font-normal ml-2">
                      (최종 {team.resources}🍪, 변화 {team.resources - team.initialResources >= 0 ? '+' : ''}{team.resources - team.initialResources})
                    </span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {team.members.map(code => {
                      const student = students.get(code);
                      return (
                        <button
                          key={code}
                          onClick={() => setSelectedStudent(student || null)}
                          className="flex items-center justify-between px-3 py-2 bg-stone-700/50 rounded-lg hover:bg-stone-600/50 transition-all"
                        >
                          <span className="text-white">{student?.name || code}</span>
                          <span className="text-amber-400 text-sm">
                            🍭 {student?.jelly ?? student?.cookie ?? 0}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 학생 캔디 조정 모달 */}
      {selectedStudent && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{selectedStudent.name}</h3>
                <p className="text-sm text-gray-500">{selectedStudent.code}</p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-4 bg-amber-50 text-center">
              <p className="text-amber-600 font-bold text-3xl">
                {selectedStudent.jelly ?? selectedStudent.cookie ?? 0}
              </p>
              <p className="text-sm text-amber-700">🍭 캔디</p>
            </div>

            <div className="p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">🍭 캔디 부여/차감</p>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => handleAddCandy(-5)}
                  disabled={isAddingCandy}
                  className="flex-1 py-2 rounded-lg bg-red-100 text-red-600 font-bold hover:bg-red-200 disabled:opacity-50"
                >
                  -5
                </button>
                <button
                  onClick={() => handleAddCandy(-1)}
                  disabled={isAddingCandy}
                  className="flex-1 py-2 rounded-lg bg-red-100 text-red-600 font-bold hover:bg-red-200 disabled:opacity-50"
                >
                  -1
                </button>
                <button
                  onClick={() => handleAddCandy(1)}
                  disabled={isAddingCandy}
                  className="flex-1 py-2 rounded-lg bg-green-100 text-green-600 font-bold hover:bg-green-200 disabled:opacity-50"
                >
                  +1
                </button>
                <button
                  onClick={() => handleAddCandy(5)}
                  disabled={isAddingCandy}
                  className="flex-1 py-2 rounded-lg bg-green-100 text-green-600 font-bold hover:bg-green-200 disabled:opacity-50"
                >
                  +5
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={candyAmount}
                  onChange={(e) => setCandyAmount(e.target.value)}
                  placeholder="직접 입력"
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-center focus:border-amber-400 focus:outline-none"
                />
                <button
                  onClick={() => handleAddCandy()}
                  disabled={isAddingCandy || !candyAmount}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-white font-bold hover:bg-amber-600 disabled:opacity-50"
                >
                  {isAddingCandy ? '...' : '적용'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CookieBattleTeacher;
