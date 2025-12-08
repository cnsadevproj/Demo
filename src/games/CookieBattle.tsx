// src/games/CookieBattle.tsx
// 팀 쿠키 배틀 - 학생용 게임 플레이 페이지

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import {
  doc, onSnapshot, updateDoc, collection, setDoc, serverTimestamp
} from 'firebase/firestore';

type LossMode = 'basic' | 'zeroSum' | 'soft';
type GameStatus = 'waiting' | 'betting' | 'targeting' | 'battle' | 'result' | 'finished';

interface TeamData {
  id: string;
  name: string;
  emoji: string;
  resources: number;
  members: string[];
  representativeCode: string | null;
  attackBet: number;
  defenseBet: number;
  targetTeamId: string | null;
  isEliminated: boolean;
  isReady: boolean;
}

interface GameData {
  teacherId: string;
  classId: string;
  className?: string;
  gameType: 'cookieBattle';
  status: GameStatus;
  lossMode: LossMode;
  round: number;
  battleLog: string[];
}

export function CookieBattle() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');
  const studentCode = params.get('studentCode');
  const studentName = params.get('studentName');

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [myTeam, setMyTeam] = useState<TeamData | null>(null);
  const [closeCountdown, setCloseCountdown] = useState<number | null>(null);

  // 배팅 입력 (대표자용)
  const [attackBetInput, setAttackBetInput] = useState('');
  const [defenseBetInput, setDefenseBetInput] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 사용법 모달
  const [showHelpModal, setShowHelpModal] = useState(false);

  // 내가 대표자인지 확인
  const isRepresentative = useMemo(() => {
    return myTeam?.representativeCode === studentCode;
  }, [myTeam, studentCode]);

  // 게임 데이터 구독
  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameData;
        setGameData(data);

        // 게임 종료 시 카운트다운
        if (data.status === 'finished' && closeCountdown === null) {
          setCloseCountdown(10);
        }
      } else {
        alert('게임이 종료되었습니다.');
        window.close();
      }
    });

    return () => unsubscribe();
  }, [gameId, closeCountdown]);

  // 팀 데이터 구독
  useEffect(() => {
    if (!gameId) return;

    const teamsRef = collection(db, 'games', gameId, 'teams');
    const unsubscribe = onSnapshot(teamsRef, (snapshot) => {
      const teamList: TeamData[] = [];
      snapshot.forEach((doc) => {
        teamList.push({ id: doc.id, ...doc.data() } as TeamData);
      });
      teamList.sort((a, b) => a.name.localeCompare(b.name));
      setTeams(teamList);

      // 내 팀 찾기
      const myTeamData = teamList.find(t => t.members.includes(studentCode || ''));
      setMyTeam(myTeamData || null);

      // 새 라운드 시작 시 입력 초기화
      if (myTeamData && !myTeamData.isReady) {
        setAttackBetInput('');
        setDefenseBetInput('');
        setSelectedTarget(null);
      }
    });

    return () => unsubscribe();
  }, [gameId, studentCode]);

  // 플레이어 접속 등록
  useEffect(() => {
    if (!gameId || !studentCode || !studentName) return;

    const registerPlayer = async () => {
      try {
        const playerRef = doc(db, 'games', gameId, 'players', studentCode);
        await setDoc(playerRef, {
          name: studentName,
          joinedAt: serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        console.error('Failed to register player:', error);
      }
    };

    registerPlayer();
  }, [gameId, studentCode, studentName]);

  // 카운트다운
  useEffect(() => {
    if (closeCountdown === null) return;
    if (closeCountdown <= 0) {
      window.close();
      return;
    }
    const timer = setTimeout(() => setCloseCountdown(closeCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [closeCountdown]);

  // 배팅 제출 (대표자만)
  const submitBetting = async () => {
    if (!gameId || !myTeam || !isRepresentative || isSubmitting) return;

    const attack = parseInt(attackBetInput) || 0;
    const defense = parseInt(defenseBetInput) || 0;

    if (attack + defense > myTeam.resources) {
      alert('배팅 합계가 보유 재화를 초과했습니다!');
      return;
    }

    if (attack < 0 || defense < 0) {
      alert('배팅은 0 이상이어야 합니다!');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'games', gameId, 'teams', myTeam.id), {
        attackBet: attack,
        defenseBet: defense,
        isReady: true,
      });
    } catch (error) {
      console.error('Failed to submit betting:', error);
      alert('배팅 제출에 실패했습니다.');
    }
    setIsSubmitting(false);
  };

  // 공격 대상 선택 (대표자만)
  const submitTarget = async () => {
    if (!gameId || !myTeam || !isRepresentative || isSubmitting) return;

    if (myTeam.attackBet > 0 && !selectedTarget) {
      alert('공격 배팅이 있으면 대상을 선택해야 합니다!');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'games', gameId, 'teams', myTeam.id), {
        targetTeamId: selectedTarget,
      });
    } catch (error) {
      console.error('Failed to submit target:', error);
      alert('대상 선택에 실패했습니다.');
    }
    setIsSubmitting(false);
  };

  // 로딩
  if (!gameId || !studentCode || !studentName) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 to-stone-900 flex items-center justify-center">
        <div className="text-white text-xl">잘못된 접근입니다</div>
      </div>
    );
  }

  if (!gameData || !myTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 to-stone-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">🏰</div>
          <p className="text-amber-400">게임 로딩 중...</p>
        </div>
      </div>
    );
  }

  // 우리 팀이 탈락한 경우
  if (myTeam.isEliminated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-800 to-stone-900 flex items-center justify-center p-4">
        <div className="bg-stone-800/80 rounded-2xl p-8 text-center max-w-md border border-stone-600">
          <div className="text-6xl mb-4">💀</div>
          <h1 className="text-2xl font-bold text-stone-400 mb-2">탈락!</h1>
          <p className="text-stone-500 mb-4">
            {myTeam.emoji} {myTeam.name}이(가) 패배했습니다...
          </p>
          <p className="text-stone-600 text-sm">다음 시즌에서 만나요!</p>
          {closeCountdown !== null && (
            <p className="text-amber-500 mt-4">⏰ {closeCountdown}초 후 자동 종료</p>
          )}
          <button
            onClick={() => window.close()}
            className="mt-4 px-6 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-500"
          >
            창 닫기
          </button>
        </div>
      </div>
    );
  }

  const aliveTeams = teams.filter(t => !t.isEliminated);
  const otherAliveTeams = aliveTeams.filter(t => t.id !== myTeam.id);

  // 손실 모드 라벨
  const lossModeLabels: Record<LossMode, { emoji: string; name: string }> = {
    basic: { emoji: '⚔️', name: '기본' },
    zeroSum: { emoji: '💀', name: '제로섬' },
    soft: { emoji: '🌸', name: '부드러운' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-900 via-stone-800 to-stone-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="bg-stone-800/80 backdrop-blur rounded-2xl p-4 mb-4 border border-amber-600/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{myTeam.emoji}</span>
              <div>
                <h1 className="text-xl font-bold text-amber-400">{myTeam.name}</h1>
                <p className="text-stone-400 text-sm">
                  {studentName}
                  {isRepresentative && <span className="text-yellow-400 ml-2">👑 대표</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHelpModal(true)}
                className="w-10 h-10 bg-stone-700 rounded-full flex items-center justify-center text-amber-400 hover:bg-stone-600 transition-colors"
                title="게임 방법"
              >
                ❓
              </button>
              <div className="text-right">
                <p className="text-stone-500 text-xs">보유 재화</p>
                <p className="text-2xl font-bold text-amber-400">🍪 {myTeam.resources}</p>
              </div>
            </div>
          </div>

          {/* 상태 표시 */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-700">
            <div className="flex items-center gap-4">
              <span className="text-stone-500">라운드 {gameData.round}</span>
              <span className="text-stone-600">|</span>
              <span className="text-stone-500">
                {lossModeLabels[gameData.lossMode].emoji} {lossModeLabels[gameData.lossMode].name} 모드
              </span>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              gameData.status === 'waiting' ? 'bg-stone-600 text-stone-300' :
              gameData.status === 'betting' ? 'bg-blue-600 text-white' :
              gameData.status === 'targeting' ? 'bg-purple-600 text-white' :
              gameData.status === 'result' ? 'bg-green-600 text-white' :
              'bg-stone-500 text-white'
            }`}>
              {gameData.status === 'waiting' && '⏳ 대기중'}
              {gameData.status === 'betting' && '💰 배팅'}
              {gameData.status === 'targeting' && '🎯 대상 선택'}
              {gameData.status === 'battle' && '⚔️ 전투'}
              {gameData.status === 'result' && '📊 결과'}
              {gameData.status === 'finished' && '🏁 종료'}
            </span>
          </div>
        </div>

        {/* 원형 성 배치 */}
        <div className="bg-stone-800/50 backdrop-blur rounded-2xl p-6 mb-4 border border-amber-600/20">
          <div className="relative" style={{ minHeight: '300px' }}>
            {/* 중앙 */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="text-5xl">⚔️</div>
            </div>

            {/* 팀들 */}
            {teams.map((team, index) => {
              const angle = (2 * Math.PI * index) / teams.length - Math.PI / 2;
              const radius = 120;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const isMyTeam = team.id === myTeam.id;
              const isTarget = selectedTarget === team.id || myTeam.targetTeamId === team.id;

              return (
                <div
                  key={team.id}
                  onClick={() => {
                    if (
                      gameData.status === 'targeting' &&
                      isRepresentative &&
                      !team.isEliminated &&
                      team.id !== myTeam.id &&
                      myTeam.attackBet > 0
                    ) {
                      setSelectedTarget(team.id);
                    }
                  }}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                    team.isEliminated ? 'opacity-30 grayscale' : ''
                  } ${
                    gameData.status === 'targeting' &&
                    isRepresentative &&
                    !team.isEliminated &&
                    team.id !== myTeam.id &&
                    myTeam.attackBet > 0
                      ? 'cursor-pointer hover:scale-110'
                      : ''
                  }`}
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                  }}
                >
                  <div className={`bg-gradient-to-b from-stone-700 to-stone-800 rounded-xl p-3 border-2 min-w-[100px] ${
                    isMyTeam
                      ? 'border-amber-400 ring-2 ring-amber-400/50'
                      : isTarget
                        ? 'border-red-500 ring-2 ring-red-500/50'
                        : team.isEliminated
                          ? 'border-stone-700'
                          : 'border-stone-600'
                  } shadow-lg`}>
                    <div className="text-center">
                      <div className="text-3xl mb-1">{team.emoji}</div>
                      <p className="font-bold text-white text-xs">{team.name}</p>
                      <p className={`text-lg font-bold mt-1 ${
                        team.isEliminated ? 'text-stone-500' : 'text-amber-400'
                      }`}>
                        🍪 {team.resources}
                      </p>
                      {team.isEliminated && (
                        <p className="text-xs text-red-400">💀</p>
                      )}
                      {isTarget && (
                        <p className="text-xs text-red-400 mt-1">🎯 공격!</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 배팅 단계 (대표자만 조작 가능) */}
        {gameData.status === 'betting' && (
          <div className="bg-stone-800/80 rounded-2xl p-4 mb-4 border border-amber-600/20">
            <h3 className="font-bold text-amber-400 mb-4">💰 배팅</h3>

            {isRepresentative ? (
              // 대표자: 배팅 입력
              myTeam.isReady ? (
                <div className="text-center py-4">
                  <p className="text-green-400 font-bold text-lg">✅ 배팅 완료!</p>
                  <p className="text-stone-400 mt-2">
                    공격 ⚔️ {myTeam.attackBet} / 수비 🛡️ {myTeam.defenseBet}
                  </p>
                  <p className="text-stone-500 text-sm mt-2">다른 팀을 기다리는 중...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-red-400 text-sm mb-1">⚔️ 공격 배팅</label>
                      <input
                        type="number"
                        value={attackBetInput}
                        onChange={(e) => setAttackBetInput(e.target.value)}
                        placeholder="0"
                        min="0"
                        max={myTeam.resources}
                        className="w-full px-4 py-3 bg-white border-2 border-red-300 rounded-xl text-gray-900 text-center text-xl font-bold focus:border-red-500 focus:outline-none placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-400 text-sm mb-1">🛡️ 수비 배팅</label>
                      <input
                        type="number"
                        value={defenseBetInput}
                        onChange={(e) => setDefenseBetInput(e.target.value)}
                        placeholder="0"
                        min="0"
                        max={myTeam.resources}
                        className="w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-xl text-gray-900 text-center text-xl font-bold focus:border-blue-500 focus:outline-none placeholder-gray-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500">
                      합계: {(parseInt(attackBetInput) || 0) + (parseInt(defenseBetInput) || 0)} / {myTeam.resources}
                    </span>
                    <span className={`${
                      (parseInt(attackBetInput) || 0) + (parseInt(defenseBetInput) || 0) > myTeam.resources
                        ? 'text-red-400'
                        : 'text-green-400'
                    }`}>
                      {(parseInt(attackBetInput) || 0) + (parseInt(defenseBetInput) || 0) <= myTeam.resources
                        ? '✅ 가능'
                        : '❌ 초과'}
                    </span>
                  </div>

                  <button
                    onClick={submitBetting}
                    disabled={
                      isSubmitting ||
                      (parseInt(attackBetInput) || 0) + (parseInt(defenseBetInput) || 0) > myTeam.resources
                    }
                    className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? '제출 중...' : '배팅 확정'}
                  </button>
                </div>
              )
            ) : (
              // 팀원: 대표자 배팅 현황 보기
              <div className="text-center py-4">
                {myTeam.isReady ? (
                  <>
                    <p className="text-green-400 font-bold text-lg">✅ 대표자가 배팅 완료!</p>
                    <div className="flex justify-center gap-8 mt-4">
                      <div>
                        <p className="text-red-400 text-2xl font-bold">⚔️ {myTeam.attackBet}</p>
                        <p className="text-stone-500 text-sm">공격</p>
                      </div>
                      <div>
                        <p className="text-blue-400 text-2xl font-bold">🛡️ {myTeam.defenseBet}</p>
                        <p className="text-stone-500 text-sm">수비</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-amber-400 font-bold">⏳ 대표자가 배팅 중...</p>
                    <p className="text-stone-500 text-sm mt-2">
                      👑 {teams.find(t => t.id === myTeam.id)?.representativeCode === studentCode ? '당신이' : '대표자가'} 결정합니다
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* 대상 선택 단계 */}
        {gameData.status === 'targeting' && (
          <div className="bg-stone-800/80 rounded-2xl p-4 mb-4 border border-amber-600/20">
            <h3 className="font-bold text-amber-400 mb-4">🎯 공격 대상 선택</h3>

            {myTeam.attackBet === 0 ? (
              <div className="text-center py-4">
                <p className="text-stone-400">공격 배팅이 없어 대상을 선택할 필요가 없습니다.</p>
                <p className="text-stone-500 text-sm mt-2">수비에만 집중! 🛡️</p>
              </div>
            ) : isRepresentative ? (
              // 대표자: 대상 선택
              myTeam.targetTeamId ? (
                <div className="text-center py-4">
                  <p className="text-green-400 font-bold text-lg">✅ 대상 선택 완료!</p>
                  <p className="text-stone-400 mt-2">
                    {teams.find(t => t.id === myTeam.targetTeamId)?.emoji}{' '}
                    {teams.find(t => t.id === myTeam.targetTeamId)?.name} 공격!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-stone-400 text-center mb-4">
                    위의 성을 클릭하여 공격할 팀을 선택하세요
                  </p>

                  {selectedTarget && (
                    <div className="bg-red-900/30 rounded-xl p-4 text-center">
                      <p className="text-red-400">
                        🎯 {teams.find(t => t.id === selectedTarget)?.emoji}{' '}
                        {teams.find(t => t.id === selectedTarget)?.name} 선택됨
                      </p>
                    </div>
                  )}

                  <button
                    onClick={submitTarget}
                    disabled={!selectedTarget || isSubmitting}
                    className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? '제출 중...' : '공격 대상 확정'}
                  </button>
                </div>
              )
            ) : (
              // 팀원: 대표자 선택 현황 보기
              <div className="text-center py-4">
                {myTeam.targetTeamId ? (
                  <>
                    <p className="text-green-400 font-bold text-lg">✅ 대표자가 대상 선택 완료!</p>
                    <p className="text-red-400 mt-2 text-xl">
                      🎯 {teams.find(t => t.id === myTeam.targetTeamId)?.emoji}{' '}
                      {teams.find(t => t.id === myTeam.targetTeamId)?.name}
                    </p>
                  </>
                ) : (
                  <p className="text-amber-400">⏳ 대표자가 공격 대상을 선택 중...</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 전투 로그 */}
        {gameData.battleLog && gameData.battleLog.length > 0 && (
          <div className="bg-stone-800/80 rounded-2xl p-4 mb-4 border border-amber-600/20">
            <h3 className="font-bold text-amber-400 mb-3">📜 전투 기록</h3>
            <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
              {gameData.battleLog.slice().reverse().slice(0, 20).map((log, i) => (
                <p key={i} className={`${
                  log.startsWith('=') ? 'text-amber-400 font-bold mt-2' :
                  log.includes(myTeam.name) ? 'text-amber-300' : 'text-stone-400'
                }`}>
                  {log}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* 결과 화면 */}
        {gameData.status === 'result' && (
          <div className="bg-stone-800/80 rounded-2xl p-4 mb-4 border border-green-600/30">
            <h3 className="font-bold text-green-400 mb-3">📊 라운드 {gameData.round} 결과</h3>
            <div className="text-center py-4">
              <p className="text-amber-400 text-lg">
                {myTeam.emoji} {myTeam.name}
              </p>
              <p className="text-3xl font-bold text-amber-400 mt-2">
                🍪 {myTeam.resources}
              </p>
              <p className="text-stone-500 text-sm mt-4">
                다음 라운드를 기다려주세요...
              </p>
            </div>
          </div>
        )}

        {/* 게임 종료 */}
        {gameData.status === 'finished' && (
          <div className="bg-stone-800/80 rounded-2xl p-6 text-center border border-amber-600/30">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-amber-400 mb-2">게임 종료!</h2>
            <p className="text-stone-400 mb-4">
              {myTeam.emoji} {myTeam.name} - 최종 재화: 🍪 {myTeam.resources}
            </p>
            {closeCountdown !== null && (
              <p className="text-amber-500">⏰ {closeCountdown}초 후 자동 종료</p>
            )}
            <button
              onClick={() => window.close()}
              className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              창 닫기
            </button>
          </div>
        )}

        {/* 대기 중 안내 */}
        {gameData.status === 'waiting' && (
          <div className="bg-stone-800/80 rounded-2xl p-6 text-center border border-stone-600">
            <div className="text-5xl mb-4 animate-pulse">⏳</div>
            <h2 className="text-xl font-bold text-stone-300 mb-2">대기 중</h2>
            <p className="text-stone-500">선생님이 게임을 시작하면 배틀이 시작됩니다!</p>
            {isRepresentative && (
              <p className="text-yellow-400 mt-4">👑 당신이 팀 대표입니다. 배팅과 공격 대상을 결정합니다!</p>
            )}
          </div>
        )}

        {/* 사용법 모달 */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-800 rounded-2xl max-w-md w-full max-h-[80dvh] overflow-hidden flex flex-col border border-amber-600/30">
              {/* 헤더 */}
              <div className="p-4 border-b border-stone-700 flex items-center justify-between flex-shrink-0">
                <h2 className="text-xl font-bold text-amber-400">📖 게임 방법</h2>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-stone-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* 스크롤 가능한 내용 */}
              <div className="p-4 overflow-y-auto flex-1">
                <div className="space-y-4 text-stone-300">
                  <div className="bg-stone-700/50 rounded-xl p-4">
                    <h3 className="font-bold text-amber-400 mb-2">🎯 게임 목표</h3>
                    <p className="text-sm">
                      팀의 쿠키를 지키면서 다른 팀의 쿠키를 빼앗으세요!<br/>
                      마지막까지 살아남은 팀이 승리합니다.
                    </p>
                  </div>

                  <div className="bg-stone-700/50 rounded-xl p-4">
                    <h3 className="font-bold text-amber-400 mb-2">👑 대표자 역할</h3>
                    <p className="text-sm">
                      각 팀의 대표자가 배팅과 공격 대상을 결정합니다.<br/>
                      팀원은 대표자의 선택을 지켜볼 수 있습니다.
                    </p>
                  </div>

                  <div className="bg-stone-700/50 rounded-xl p-4">
                    <h3 className="font-bold text-red-400 mb-2">⚔️ 공격 배팅</h3>
                    <p className="text-sm">
                      다른 팀을 공격할 때 사용합니다.<br/>
                      공격 성공 시 <span className="text-amber-400 font-bold">상대가 잃은 쿠키만큼 획득</span>합니다!
                    </p>
                  </div>

                  <div className="bg-stone-700/50 rounded-xl p-4">
                    <h3 className="font-bold text-blue-400 mb-2">🛡️ 수비 배팅</h3>
                    <p className="text-sm">
                      공격을 방어할 때 사용합니다.<br/>
                      수비가 공격보다 크거나 같으면 방어 성공!
                    </p>
                  </div>

                  <div className="bg-stone-700/50 rounded-xl p-4">
                    <h3 className="font-bold text-green-400 mb-2">💡 배팅 팁</h3>
                    <ul className="text-sm space-y-1">
                      <li>• 배팅은 보유 재화 이내에서 자유롭게 가능</li>
                      <li>• 모든 재화를 쓸 필요 없어요!</li>
                      <li>• 공격 0 배팅 = 수비에만 집중</li>
                      <li>• 공격+수비 합계가 재화를 넘으면 안 됨</li>
                    </ul>
                  </div>

                  <div className="bg-amber-900/30 rounded-xl p-4 border border-amber-600/30">
                    <h3 className="font-bold text-amber-400 mb-2">⚠️ 탈락 조건</h3>
                    <p className="text-sm text-amber-200">
                      쿠키가 0개가 되면 탈락합니다!<br/>
                      신중하게 배팅하세요.
                    </p>
                  </div>
                </div>
              </div>

              {/* 하단 버튼 */}
              <div className="p-4 border-t border-stone-700 flex-shrink-0">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CookieBattle;
