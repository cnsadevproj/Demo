// src/games/BulletDodgeTeacher.tsx
// 총알피하기 - 교사용 게임 관리 페이지

import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, collection, getDocs, deleteDoc, getDoc } from 'firebase/firestore';

interface GameData {
  teacherId: string;
  classId: string;
  className?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any;
}

interface PlayerData {
  code: string;
  name: string;
  lastScore: number;
  highScore: number;
  lastPlayedAt: any;
}

interface StudentData {
  name: string;
  number: number;
  code: string;
  jelly?: number;
  cookie?: number;
}

export function BulletDodgeTeacher() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 타이머 관련 상태
  const [timerMinutes, setTimerMinutes] = useState<number>(3); // 기본 3분
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0); // 남은 시간 (초)
  const [frozenPlayers, setFrozenPlayers] = useState<PlayerData[] | null>(null); // 타이머 종료 시 고정된 순위

  // 학생 모달 관련 상태
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [candyAmount, setCandyAmount] = useState('');
  const [isAddingCandy, setIsAddingCandy] = useState(false);

  // 타이머 시작 (새로 시작)
  const startTimer = () => {
    const totalSeconds = timerMinutes * 60 + timerSeconds;
    if (totalSeconds <= 0) return;
    setRemainingTime(totalSeconds);
    setIsTimerRunning(true);
    setFrozenPlayers(null); // 타이머 시작 시 고정 해제
  };

  // 타이머 재개 (일시정지 후 이어서)
  const resumeTimer = () => {
    if (remainingTime > 0) {
      setIsTimerRunning(true);
    }
  };

  // 타이머 중지 (일시정지)
  const stopTimer = () => {
    setIsTimerRunning(false);
  };

  // 타이머 리셋
  const resetTimer = () => {
    setIsTimerRunning(false);
    setRemainingTime(0);
    setFrozenPlayers(null);
  };

  // 타이머 카운트다운
  useEffect(() => {
    if (!isTimerRunning || remainingTime <= 0) return;

    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          // 타이머 종료 시 현재 순위 고정
          setFrozenPlayers([...players]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, remainingTime, players]);

  // 남은 시간 포맷팅
  const formatRemainingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 학생 모달 열기
  const openStudentModal = async (player: PlayerData) => {
    if (!gameData) return;
    setSelectedPlayer(player);

    try {
      const studentRef = doc(db, 'teachers', gameData.teacherId, 'students', player.code);
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        setStudentData({ code: player.code, ...studentSnap.data() } as StudentData);
      }
    } catch (error) {
      console.error('Failed to load student:', error);
    }
  };

  // 학생 모달 닫기
  const closeStudentModal = () => {
    setSelectedPlayer(null);
    setStudentData(null);
    setCandyAmount('');
  };

  // 캔디 부여/차감
  const handleAddCandy = async (directAmount?: number) => {
    if (!gameData || !selectedPlayer || !studentData) return;

    const amount = directAmount !== undefined ? directAmount : parseInt(candyAmount);
    if (isNaN(amount) || amount === 0) return;

    setIsAddingCandy(true);
    try {
      const studentRef = doc(db, 'teachers', gameData.teacherId, 'students', selectedPlayer.code);
      const currentCandy = studentData.jelly ?? studentData.cookie ?? 0;
      const newCandy = Math.max(0, currentCandy + amount);

      await updateDoc(studentRef, {
        jelly: newCandy
      });

      setStudentData(prev => prev ? { ...prev, jelly: newCandy } : null);
      setCandyAmount('');
    } catch (error) {
      console.error('Failed to add candy:', error);
      alert('캔디 부여에 실패했습니다.');
    }
    setIsAddingCandy(false);
  };

  // 게임 데이터 구독
  useEffect(() => {
    if (!gameId) {
      setError('게임 ID가 없습니다.');
      console.error('[BulletDodgeTeacher] No gameId in URL');
      return;
    }

    console.log('[BulletDodgeTeacher] Subscribing to game:', gameId);
    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(
      gameRef,
      (docSnap) => {
        if (docSnap.exists()) {
          console.log('[BulletDodgeTeacher] Game data updated');
          setGameData(docSnap.data() as GameData);
        } else {
          setError('게임을 찾을 수 없습니다.');
        }
      },
      (error) => {
        console.error('[BulletDodgeTeacher] Game subscription error:', error);
        setError('게임 데이터를 불러올 수 없습니다.');
      }
    );

    return () => unsubscribe();
  }, [gameId]);

  // 플레이어 구독
  useEffect(() => {
    if (!gameId) return;

    console.log('[BulletDodgeTeacher] Subscribing to players for game:', gameId);
    const playersRef = collection(db, 'games', gameId, 'players');
    const unsubscribe = onSnapshot(
      playersRef,
      (snapshot) => {
        const playerList: PlayerData[] = [];
        snapshot.docs.forEach(docSnap => {
          playerList.push({ code: docSnap.id, ...docSnap.data() } as PlayerData);
        });

        // 최고 점수 순으로 정렬
        playerList.sort((a, b) => (b.highScore || 0) - (a.highScore || 0));
        console.log('[BulletDodgeTeacher] Players updated:', playerList.length);
        setPlayers(playerList);
      },
      (error) => {
        console.error('[BulletDodgeTeacher] Players subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [gameId]);

  // 게임 시작
  const handleStartGame = async () => {
    if (!gameId) return;

    try {
      await updateDoc(doc(db, 'games', gameId), {
        status: 'playing'
      });
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };

  // 게임 종료
  const handleEndGame = async () => {
    if (!gameId) return;

    try {
      await updateDoc(doc(db, 'games', gameId), {
        status: 'finished'
      });
    } catch (error) {
      console.error('Failed to end game:', error);
    }
  };

  // 게임 삭제
  const handleDeleteGame = async () => {
    if (!gameId) return;

    if (!confirm('정말 게임을 삭제하시겠습니까?')) return;

    try {
      // 플레이어 데이터 삭제
      const playersRef = collection(db, 'games', gameId, 'players');
      const playersSnap = await getDocs(playersRef);
      for (const playerDoc of playersSnap.docs) {
        await deleteDoc(playerDoc.ref);
      }

      // 게임 삭제
      await deleteDoc(doc(db, 'games', gameId));
      window.close();
    } catch (error) {
      console.error('Failed to delete game:', error);
    }
  };

  // 점수 포맷팅
  const formatScore = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const millis = Math.floor((ms % 1000) / 10);
    return `${seconds}.${millis.toString().padStart(2, '0')}초`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">오류 발생</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 to-purple-900 p-4">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-4 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">🚀</span>
              <div>
                <h1 className="text-xl font-bold text-white">총알피하기</h1>
                <p className="text-white/70 text-sm">교사 관리 페이지</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (gameId && gameData?.status === 'playing') {
                  window.open(`${window.location.origin}?game=bullet-dodge&gameId=${gameId}&studentCode=teacher&studentName=${encodeURIComponent('선생님')}`, '_blank');
                } else {
                  alert('게임이 진행 중일 때만 참여할 수 있습니다.');
                }
              }}
              disabled={gameData?.status !== 'playing'}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${
                gameData?.status === 'playing'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-white/10 text-white/50 cursor-not-allowed'
              }`}
            >
              🎮 참여하기
            </button>
          </div>
        </div>

        {/* 게임 상태 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-4 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/70">게임 상태</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              gameData?.status === 'waiting' ? 'bg-amber-500 text-white' :
              gameData?.status === 'playing' ? 'bg-green-500 text-white' :
              'bg-gray-500 text-white'
            }`}>
              {gameData?.status === 'waiting' ? '⏳ 대기중' :
               gameData?.status === 'playing' ? '🎮 진행중' : '🏁 종료'}
            </span>
          </div>

          {/* 컨트롤 버튼 */}
          <div className="grid grid-cols-2 gap-3">
            {gameData?.status === 'waiting' && (
              <>
                <button
                  onClick={handleStartGame}
                  disabled={players.length === 0}
                  className="col-span-2 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🚀 게임 시작
                </button>
                <button
                  onClick={handleDeleteGame}
                  className="col-span-2 px-4 py-2 bg-red-600/20 text-red-300 rounded-xl font-medium hover:bg-red-600/30 transition-all"
                >
                  게임 삭제
                </button>
              </>
            )}
            {gameData?.status === 'playing' && (
              <>
                {/* 타이머 설정 */}
                <div className="col-span-2 bg-white/10 rounded-xl p-3 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/70 text-sm">⏱️ 타이머</span>
                    {frozenPlayers && (
                      <span className="text-amber-400 text-xs font-bold animate-pulse">🔒 순위 고정됨</span>
                    )}
                  </div>

                  {!isTimerRunning && remainingTime === 0 ? (
                    // 타이머 설정 UI
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={timerMinutes}
                          onChange={(e) => setTimerMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                          className="w-16 px-2 py-2 bg-white/20 text-white text-center rounded-lg font-bold text-lg"
                        />
                        <span className="text-white font-bold">분</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={timerSeconds}
                          onChange={(e) => setTimerSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                          className="w-16 px-2 py-2 bg-white/20 text-white text-center rounded-lg font-bold text-lg"
                        />
                        <span className="text-white font-bold">초</span>
                      </div>
                      <button
                        onClick={startTimer}
                        disabled={timerMinutes === 0 && timerSeconds === 0}
                        className="w-full py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 text-lg"
                      >
                        ▶️ 타이머 시작
                      </button>
                    </div>
                  ) : (
                    // 타이머 실행 중 또는 종료됨
                    <div className="flex items-center gap-2">
                      <div className={`flex-1 text-center py-2 rounded-lg font-bold text-2xl ${
                        remainingTime === 0 ? 'bg-red-500/30 text-red-300' :
                        remainingTime <= 10 ? 'bg-red-500/20 text-red-300 animate-pulse' :
                        'bg-white/20 text-white'
                      }`}>
                        {remainingTime === 0 ? '⏰ 종료!' : formatRemainingTime(remainingTime)}
                      </div>
                      {isTimerRunning ? (
                        <button
                          onClick={stopTimer}
                          className="px-4 py-2 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600"
                        >
                          ⏸️
                        </button>
                      ) : (
                        <button
                          onClick={resumeTimer}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600"
                        >
                          ▶️
                        </button>
                      )}
                      <button
                        onClick={resetTimer}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600"
                      >
                        🔄
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleEndGame}
                  className="col-span-2 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all"
                >
                  🏁 게임 종료
                </button>
              </>
            )}
            {gameData?.status === 'finished' && (
              <button
                onClick={handleDeleteGame}
                className="col-span-2 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                게임 삭제 및 닫기
              </button>
            )}
          </div>
        </div>

        {/* 참가자 / 리더보드 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              🏆 리더보드 ({players.length}명)
            </h2>
            {frozenPlayers && (
              <span className="text-amber-400 text-sm font-bold">🔒 순위 고정</span>
            )}
          </div>

          {(frozenPlayers || players).length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎮</div>
              <p className="text-white/50">아직 참가한 학생이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(frozenPlayers || players).map((player, index) => (
                <div
                  key={player.code}
                  onClick={() => openStudentModal(player)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer hover:ring-2 hover:ring-white/50 transition-all ${
                    index === 0 ? 'bg-amber-500/20 border border-amber-500/30' :
                    index === 1 ? 'bg-gray-400/20 border border-gray-400/30' :
                    index === 2 ? 'bg-orange-600/20 border border-orange-600/30' :
                    'bg-white/5'
                  } ${frozenPlayers ? 'ring-1 ring-amber-500/30' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {index === 0 ? '🥇' :
                       index === 1 ? '🥈' :
                       index === 2 ? '🥉' :
                       `${index + 1}위`}
                    </span>
                    <span className="text-white font-medium">{player.name}</span>
                    {frozenPlayers && <span className="text-amber-400 text-xs">🔒</span>}
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">
                      {formatScore(player.highScore || 0)}
                    </div>
                    {!frozenPlayers && player.lastScore !== player.highScore && player.lastScore > 0 && (
                      <div className="text-white/50 text-xs">
                        최근: {formatScore(player.lastScore || 0)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 안내 */}
        <div className="mt-4 text-center text-white/50 text-sm">
          <p>학생들은 게임 시작 후 자유롭게 플레이할 수 있습니다</p>
          <p>최고 점수가 리더보드에 기록됩니다</p>
        </div>
      </div>

      {/* 학생 모달 */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeStudentModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full max-h-[85dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{selectedPlayer.name}</h3>
                <p className="text-sm text-gray-500">{selectedPlayer.code}</p>
              </div>
              <button onClick={closeStudentModal} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div className="p-4 bg-pink-50 text-center">
              <p className="text-pink-600 font-bold text-3xl">
                {studentData ? (studentData.jelly ?? studentData.cookie ?? 0) : '...'}
              </p>
              <p className="text-sm text-pink-700">🍭 캔디</p>
            </div>

            <div className="p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">🍭 캔디 부여/차감</p>
              <div className="flex gap-2 mb-2">
                <button onClick={() => handleAddCandy(-5)} disabled={isAddingCandy}
                  className="flex-1 py-2 rounded-lg bg-red-100 text-red-600 font-bold hover:bg-red-200 disabled:opacity-50">-5</button>
                <button onClick={() => handleAddCandy(-1)} disabled={isAddingCandy}
                  className="flex-1 py-2 rounded-lg bg-red-100 text-red-600 font-bold hover:bg-red-200 disabled:opacity-50">-1</button>
                <button onClick={() => handleAddCandy(1)} disabled={isAddingCandy}
                  className="flex-1 py-2 rounded-lg bg-green-100 text-green-600 font-bold hover:bg-green-200 disabled:opacity-50">+1</button>
                <button onClick={() => handleAddCandy(5)} disabled={isAddingCandy}
                  className="flex-1 py-2 rounded-lg bg-green-100 text-green-600 font-bold hover:bg-green-200 disabled:opacity-50">+5</button>
              </div>
              <div className="flex gap-2">
                <input type="number" value={candyAmount} onChange={(e) => setCandyAmount(e.target.value)}
                  placeholder="직접 입력" className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-center focus:border-indigo-400 focus:outline-none"/>
                <button onClick={() => handleAddCandy()} disabled={isAddingCandy || !candyAmount}
                  className="px-4 py-2 rounded-lg bg-indigo-500 text-white font-bold hover:bg-indigo-600 disabled:opacity-50">
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
