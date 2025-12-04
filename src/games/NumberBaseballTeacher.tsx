// src/games/NumberBaseballTeacher.tsx
// 숫자야구 게임 - 교사용 게임 관리 페이지

import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, collection, getDocs, deleteDoc, getDoc } from 'firebase/firestore';

interface GameData {
  teacherId: string;
  classId: string;
  digits: 4 | 5;
  answer: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any;
  className?: string;
  completedCount?: number;
}

interface PlayerData {
  code: string;
  name: string;
  joinedAt: any;
  solvedAt: any | null;
  rank: number | null;
  attempts: number;
}

interface StudentData {
  name: string;
  number: number;
  code: string;
  jelly?: number;
  cookie?: number;
}

export function NumberBaseballTeacher() {
  // URL에서 파라미터 추출
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);

  // 학생 모달 관련 상태
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [candyAmount, setCandyAmount] = useState('');
  const [isAddingCandy, setIsAddingCandy] = useState(false);

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
      console.error('[NumberBaseballTeacher] No gameId in URL');
      return;
    }

    console.log('[NumberBaseballTeacher] Subscribing to game:', gameId);
    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(
      gameRef,
      (snapshot) => {
        if (snapshot.exists()) {
          console.log('[NumberBaseballTeacher] Game data updated');
          setGameData(snapshot.data() as GameData);
        } else {
          // 게임이 삭제됨
          alert('게임이 삭제되었습니다.');
          window.close();
        }
      },
      (error) => {
        console.error('[NumberBaseballTeacher] Game subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [gameId]);

  // 플레이어 목록 구독
  useEffect(() => {
    if (!gameId) return;

    console.log('[NumberBaseballTeacher] Subscribing to players for game:', gameId);
    const playersRef = collection(db, 'games', gameId, 'players');
    const unsubscribe = onSnapshot(
      playersRef,
      (snapshot) => {
        const playerList: PlayerData[] = [];
        snapshot.forEach((doc) => {
          playerList.push({ code: doc.id, ...doc.data() } as PlayerData);
        });
        // 소요 시간 기준 정렬 (짧은 시간 = 1등)
        playerList.sort((a, b) => {
          // 둘 다 완료한 경우: 소요 시간으로 정렬
          if (a.solvedAt && b.solvedAt && a.joinedAt && b.joinedAt) {
            const aJoined = a.joinedAt.toDate ? a.joinedAt.toDate() : new Date(a.joinedAt);
            const aSolved = a.solvedAt.toDate ? a.solvedAt.toDate() : new Date(a.solvedAt);
            const bJoined = b.joinedAt.toDate ? b.joinedAt.toDate() : new Date(b.joinedAt);
            const bSolved = b.solvedAt.toDate ? b.solvedAt.toDate() : new Date(b.solvedAt);
            const aElapsed = aSolved.getTime() - aJoined.getTime();
            const bElapsed = bSolved.getTime() - bJoined.getTime();
            return aElapsed - bElapsed; // 짧은 시간이 먼저
          }
          // 완료한 사람이 먼저
          if (a.solvedAt) return -1;
          if (b.solvedAt) return 1;
          return 0;
        });
        console.log('[NumberBaseballTeacher] Players updated:', playerList.length);
        setPlayers(playerList);
      },
      (error) => {
        console.error('[NumberBaseballTeacher] Players subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [gameId]);

  // 게임 시작
  const startGame = async () => {
    if (!gameId) return;
    try {
      await updateDoc(doc(db, 'games', gameId), {
        status: 'playing'
      });
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('게임 시작에 실패했습니다.');
    }
  };

  // 게임 종료
  const endGame = async () => {
    if (!gameId) return;
    try {
      await updateDoc(doc(db, 'games', gameId), {
        status: 'finished'
      });
    } catch (error) {
      console.error('Failed to end game:', error);
      alert('게임 종료에 실패했습니다.');
    }
  };

  // 게임 삭제
  const deleteGame = async () => {
    if (!gameId) return;
    if (!confirm('정말 게임을 삭제하시겠습니까?')) return;

    try {
      // 플레이어 삭제
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
      alert('게임 삭제에 실패했습니다.');
    }
  };

  // 유효하지 않은 접근
  if (!gameId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-100 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">잘못된 접근</h1>
          <p className="text-gray-600">게임 ID가 필요합니다</p>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (!gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-100 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="text-6xl mb-4 animate-bounce">⚾</div>
          <h1 className="text-xl font-bold text-gray-800">게임 로딩 중...</h1>
        </div>
      </div>
    );
  }

  const getRankEmoji = (rank: number | null) => {
    if (!rank) return '⏳';
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}등`;
  };

  // 소요 시간 포맷팅 (참가 시점부터 정답까지)
  const formatElapsedTime = (joinedAt: any, solvedAt: any) => {
    if (!solvedAt || !joinedAt) return '';
    const joined = joinedAt.toDate ? joinedAt.toDate() : new Date(joinedAt);
    const solved = solvedAt.toDate ? solvedAt.toDate() : new Date(solvedAt);
    const elapsed = Math.floor((solved.getTime() - joined.getTime()) / 1000);

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    if (minutes > 0) {
      return `${minutes}분 ${seconds}초`;
    }
    return `${seconds}초`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 to-indigo-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-4 text-center">
          <h1 className="text-3xl font-bold text-purple-800 mb-2">⚾ 숫자야구</h1>
          <p className="text-gray-600">{gameData.className || '게임'} - {gameData.digits}자리</p>

          {/* 상태 배지 */}
          <div className="mt-3">
            <span className={`px-4 py-2 rounded-full text-white font-bold ${
              gameData.status === 'waiting' ? 'bg-amber-500' :
              gameData.status === 'playing' ? 'bg-green-500' : 'bg-gray-500'
            }`}>
              {gameData.status === 'waiting' ? '⏳ 대기중' :
               gameData.status === 'playing' ? '🎮 진행중' : '🏁 종료'}
            </span>
          </div>
        </div>

        {/* 정답 표시 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-700">정답</span>
            <button
              onClick={() => setShowAnswer(!showAnswer)}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                showAnswer
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {showAnswer ? gameData.answer : '🔒 보기'}
            </button>
          </div>
        </div>

        {/* 참가자 목록 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-xl text-gray-800">
              👥 참가자 ({players.length}명)
            </h2>
            <span className="text-green-600 font-medium">
              🏆 완료: {players.filter(p => p.solvedAt).length}명
            </span>
          </div>

          {players.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">👀</div>
              <p>아직 참가한 학생이 없습니다</p>
              <p className="text-sm mt-1">학생들이 게임에 참가하면 여기에 표시됩니다</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {players.map((player, index) => {
                // 시간 기준 순위 계산 (완료한 사람만)
                const timeBasedRank = player.solvedAt ? index + 1 : null;
                return (
                  <div
                    key={player.code}
                    onClick={() => openStudentModal(player)}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer hover:ring-2 hover:ring-purple-400 ${
                      player.solvedAt ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getRankEmoji(timeBasedRank)}</span>
                      <div className="flex flex-col">
                        <span className={`font-medium ${player.solvedAt ? 'text-green-700' : 'text-gray-700'}`}>
                          {player.name}
                        </span>
                        {timeBasedRank && timeBasedRank <= 3 && (
                          <span className="text-xs text-purple-600 font-bold">
                            {timeBasedRank === 1 ? '🏆 1등!' : timeBasedRank === 2 ? '2등' : '3등'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-right">
                      {player.solvedAt ? (
                        <div>
                          <span className="text-green-600 font-medium">{formatElapsedTime(player.joinedAt, player.solvedAt)}</span>
                          <span className="text-gray-500 ml-2">({player.attempts}회)</span>
                        </div>
                      ) : (
                        <span className="text-amber-600">도전중...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 컨트롤 버튼 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex gap-3">
            {gameData.status === 'waiting' && (
              <>
                <button
                  onClick={startGame}
                  disabled={players.length === 0}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                    players.length > 0
                      ? 'bg-green-500 text-white hover:bg-green-600 active:scale-95'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  🚀 게임 시작
                </button>
                <button
                  onClick={deleteGame}
                  className="px-6 py-4 rounded-xl bg-red-100 text-red-600 font-bold hover:bg-red-200"
                >
                  삭제
                </button>
              </>
            )}
            {gameData.status === 'playing' && (
              <>
                <button
                  onClick={endGame}
                  className="flex-1 py-4 rounded-xl bg-amber-500 text-white font-bold text-lg hover:bg-amber-600 active:scale-95"
                >
                  🏁 게임 종료
                </button>
                <button
                  onClick={deleteGame}
                  className="px-6 py-4 rounded-xl bg-red-100 text-red-600 font-bold hover:bg-red-200"
                >
                  삭제
                </button>
              </>
            )}
            {gameData.status === 'finished' && (
              <button
                onClick={() => window.close()}
                className="flex-1 py-4 rounded-xl bg-gray-500 text-white font-bold text-lg hover:bg-gray-600"
              >
                창 닫기
              </button>
            )}
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="mt-4 text-center text-white/80 text-sm">
          {gameData.status === 'waiting' && (
            <p>학생들이 참가하면 시작 버튼을 눌러주세요</p>
          )}
          {gameData.status === 'playing' && (
            <p>10등까지 자동 종료되거나, 종료 버튼으로 마감할 수 있어요</p>
          )}
          {gameData.status === 'finished' && (
            <p>게임이 종료되었습니다. 학생들의 창도 자동으로 닫힙니다.</p>
          )}
        </div>
      </div>

      {/* 학생 모달 */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeStudentModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
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
                  placeholder="직접 입력" className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-center focus:border-purple-400 focus:outline-none"/>
                <button onClick={() => handleAddCandy()} disabled={isAddingCandy || !candyAmount}
                  className="px-4 py-2 rounded-lg bg-purple-500 text-white font-bold hover:bg-purple-600 disabled:opacity-50">
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

export default NumberBaseballTeacher;
