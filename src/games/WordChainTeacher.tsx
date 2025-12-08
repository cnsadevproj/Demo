// src/games/WordChainTeacher.tsx
// 끝말잇기 - 교사용 게임 관리 페이지

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  setDoc,
  getDoc,
  arrayUnion,
} from 'firebase/firestore';
import { getLastChar, getDueumVariants } from '../services/koreanDictApi';

// 시작 단어 목록
const START_WORDS = [
  '사과', '바나나', '학교', '친구', '가족', '행복', '여행', '음악', '영화', '책',
  '컴퓨터', '자동차', '비행기', '고양이', '강아지', '햇살', '바다', '산', '하늘', '구름',
  '꽃', '나무', '새', '물고기', '별', '달', '태양', '지구', '우주', '시간',
];

interface GameData {
  teacherId: string;
  classId: string;
  className?: string;
  status: 'waiting' | 'playing' | 'finished';
  gameMode: 'survival' | 'score';
  battleType: 'individual' | 'team';
  currentWord: string;
  currentTurnIndex: number;
  turnOrder: string[];
  usedWords: string[];
  timeLimit: number;
  minLength: number;
  maxLength: number;
  banKillerWords: boolean;
  maxRounds?: number;
  currentRound?: number;
  createdAt: any;
  winner?: string;
  teamId?: string;
  teamName?: string;
}

interface PlayerData {
  code: string;
  name: string;
  joinedAt: any;
  isAlive: boolean;
  score: number;
  lastWord?: string;
  teamId?: string;
  teamName?: string;
}

interface WordHistory {
  word: string;
  playerName: string;
  playerCode: string;
  score: number;
  timestamp: string;
}

interface StudentData {
  name: string;
  number: number;
  code: string;
  jelly?: number;
  cookie?: number;
}

export function WordChainTeacher() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [wordHistory, setWordHistory] = useState<WordHistory[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // 학생 모달 관련 상태
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [candyAmount, setCandyAmount] = useState('');
  const [isAddingCandy, setIsAddingCandy] = useState(false);

  const historyEndRef = useRef<HTMLDivElement>(null);

  // 게임 데이터 구독
  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        setGameData(snapshot.data() as GameData);
      } else {
        alert('게임이 삭제되었습니다.');
        window.close();
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  // 플레이어 목록 구독
  useEffect(() => {
    if (!gameId) return;

    const playersRef = collection(db, 'games', gameId, 'players');
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      const playerList: PlayerData[] = [];
      snapshot.forEach((doc) => {
        playerList.push({ code: doc.id, ...doc.data() } as PlayerData);
      });

      // 점수 높은 순으로 정렬
      playerList.sort((a, b) => b.score - a.score);
      setPlayers(playerList);
    });

    return () => unsubscribe();
  }, [gameId]);

  // 단어 히스토리 구독
  useEffect(() => {
    if (!gameId) return;

    const historyRef = doc(db, 'games', gameId, 'history', 'words');
    const unsubscribe = onSnapshot(historyRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setWordHistory(data.words || []);
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  // 히스토리 자동 스크롤
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [wordHistory]);

  // 타이머 구독 (게임 진행 중)
  useEffect(() => {
    if (!gameData || gameData.status !== 'playing') {
      setTimeLeft(null);
      return;
    }

    // 초기 시간 설정
    setTimeLeft(gameData.timeLimit);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameData?.status, gameData?.currentTurnIndex]);

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
        jelly: newCandy,
      });

      setStudentData((prev) => (prev ? { ...prev, jelly: newCandy } : null));
      setCandyAmount('');
    } catch (error) {
      console.error('Failed to add candy:', error);
      alert('캔디 부여에 실패했습니다.');
    }
    setIsAddingCandy(false);
  };

  // 게임 시작
  const startGame = async () => {
    if (!gameId || !gameData || players.length < 2) return;

    try {
      // 랜덤 시작 단어 선택
      const startWord = START_WORDS[Math.floor(Math.random() * START_WORDS.length)];

      // 플레이어 순서 셔플
      const shuffledOrder = [...players.map((p) => p.code)].sort(() => Math.random() - 0.5);

      // 히스토리 문서 초기화
      await setDoc(doc(db, 'games', gameId, 'history', 'words'), {
        words: [],
      });

      // 게임 시작
      await updateDoc(doc(db, 'games', gameId), {
        status: 'playing',
        currentWord: startWord,
        turnOrder: shuffledOrder,
        currentTurnIndex: 0,
        usedWords: [startWord],
        currentRound: 1,
      });

      // 모든 플레이어 초기화
      const playersRef = collection(db, 'games', gameId, 'players');
      const playersSnap = await getDocs(playersRef);
      for (const playerDoc of playersSnap.docs) {
        await updateDoc(playerDoc.ref, {
          isAlive: true,
          score: 0,
          lastWord: null,
        });
      }
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('게임 시작에 실패했습니다.');
    }
  };

  // 현재 턴 스킵 (시간 초과 대신 교사가 수동으로)
  const skipCurrentTurn = async () => {
    if (!gameId || !gameData) return;

    const currentPlayerCode = gameData.turnOrder[gameData.currentTurnIndex];
    const currentPlayer = players.find((p) => p.code === currentPlayerCode);

    try {
      const gameRef = doc(db, 'games', gameId);

      if (gameData.gameMode === 'survival') {
        // 생존모드: 탈락 처리
        const playerRef = doc(db, 'games', gameId, 'players', currentPlayerCode);
        await updateDoc(playerRef, { isAlive: false });

        // 남은 플레이어 확인
        const alivePlayers = gameData.turnOrder.filter((code) => {
          const player = players.find((p) => p.code === code);
          return player?.isAlive && code !== currentPlayerCode;
        });

        if (alivePlayers.length <= 1) {
          // 게임 종료
          await updateDoc(gameRef, {
            status: 'finished',
            winner: alivePlayers[0] || null,
          });
        } else {
          // 다음 턴으로
          const newTurnOrder = alivePlayers;
          const nextIndex = gameData.currentTurnIndex % newTurnOrder.length;
          await updateDoc(gameRef, {
            turnOrder: newTurnOrder,
            currentTurnIndex: nextIndex,
          });
        }
      } else {
        // 점수모드: 그냥 다음 턴으로
        const nextIndex = (gameData.currentTurnIndex + 1) % gameData.turnOrder.length;
        const newRound =
          nextIndex === 0 ? (gameData.currentRound || 1) + 1 : gameData.currentRound || 1;

        if (gameData.maxRounds && newRound > gameData.maxRounds) {
          await updateDoc(gameRef, { status: 'finished' });
        } else {
          await updateDoc(gameRef, {
            currentTurnIndex: nextIndex,
            currentRound: newRound,
          });
        }
      }
    } catch (error) {
      console.error('Failed to skip turn:', error);
      alert('턴 스킵에 실패했습니다.');
    }
  };

  // 게임 종료
  const endGame = async () => {
    if (!gameId) return;
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
      // 플레이어 삭제
      const playersRef = collection(db, 'games', gameId, 'players');
      const playersSnap = await getDocs(playersRef);
      for (const playerDoc of playersSnap.docs) {
        await deleteDoc(playerDoc.ref);
      }

      // 히스토리 삭제
      const historyRef = doc(db, 'games', gameId, 'history', 'words');
      await deleteDoc(historyRef);

      // 게임 삭제
      await deleteDoc(doc(db, 'games', gameId));
      window.close();
    } catch (error) {
      console.error('Failed to delete game:', error);
    }
  };

  // 유효하지 않은 접근
  if (!gameId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-100 to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800">잘못된 접근</h1>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (!gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-100 to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="text-6xl mb-4 animate-bounce">🔤</div>
          <h1 className="text-xl font-bold text-gray-800">게임 로딩 중...</h1>
        </div>
      </div>
    );
  }

  const alivePlayers = players.filter((p) => p.isAlive);
  const currentPlayerCode = gameData.turnOrder[gameData.currentTurnIndex];
  const currentPlayer = players.find((p) => p.code === currentPlayerCode);
  const currentChar = getLastChar(gameData.currentWord);
  const validStartChars = getDueumVariants(currentChar);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-600 to-teal-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-4 text-center">
          <h1 className="text-3xl font-bold text-emerald-800 mb-2">🔤 끝말잇기</h1>
          <p className="text-gray-600">{gameData.className || '게임'}</p>
          <div className="mt-2 flex justify-center gap-2 flex-wrap">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                gameData.gameMode === 'score'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {gameData.gameMode === 'score' ? '⭐ 점수모드' : '💀 생존모드'}
            </span>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                gameData.battleType === 'team'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {gameData.battleType === 'team' ? `👥 ${gameData.teamName || '팀전'}` : '👤 개인전'}
            </span>
          </div>
          <div className="mt-3 flex justify-center gap-4 flex-wrap">
            <span
              className={`px-4 py-2 rounded-full text-white font-bold ${
                gameData.status === 'waiting'
                  ? 'bg-amber-500'
                  : gameData.status === 'playing'
                  ? 'bg-green-500'
                  : 'bg-gray-500'
              }`}
            >
              {gameData.status === 'waiting'
                ? '⏳ 대기중'
                : gameData.status === 'playing'
                ? `🎮 진행중 ${
                    gameData.gameMode === 'score'
                      ? `(${gameData.currentRound || 1}/${gameData.maxRounds || '∞'})`
                      : ''
                  }`
                : '🏁 종료'}
            </span>
            <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full font-bold">
              {gameData.gameMode === 'survival'
                ? `👥 생존: ${alivePlayers.length}명`
                : `👥 참가: ${players.length}명`}
            </span>
          </div>
        </div>

        {/* 현재 단어 및 턴 정보 */}
        {gameData.status === 'playing' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-4">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500 mb-1">현재 단어</p>
              <p className="text-5xl font-bold text-emerald-600 mb-2">{gameData.currentWord}</p>
              <p className="text-lg text-gray-600">
                다음 글자:{' '}
                <span className="font-bold text-emerald-700">
                  {validStartChars.length > 1 ? validStartChars.join(' / ') : currentChar}
                </span>
              </p>
            </div>

            {/* 현재 턴 */}
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-4">
                <div>
                  <p className="text-sm text-emerald-600">현재 차례</p>
                  <p className="text-2xl font-bold text-emerald-800">
                    🎯 {currentPlayer?.name || '알 수 없음'}
                  </p>
                </div>
                <div
                  className={`text-4xl font-bold ${
                    timeLeft !== null && timeLeft <= 5
                      ? 'text-red-500 animate-pulse'
                      : 'text-emerald-600'
                  }`}
                >
                  {timeLeft !== null ? `${timeLeft}초` : '--'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 단어 히스토리 */}
        {wordHistory.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
            <h2 className="font-bold text-lg text-gray-800 mb-3">📝 단어 기록</h2>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {wordHistory.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium">{item.word}</span>
                    <span className="text-xs text-gray-400">by {item.playerName}</span>
                  </div>
                  <span className="text-sm text-emerald-600 font-bold">+{item.score}점</span>
                </div>
              ))}
              <div ref={historyEndRef} />
            </div>
          </div>
        )}

        {/* 참가자 목록 (순위) */}
        <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
          <h2 className="font-bold text-xl text-gray-800 mb-3">
            🏆 {gameData.gameMode === 'score' ? '순위' : '참가자'} ({players.length}명)
          </h2>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {players.map((player, index) => {
              const isCurrentTurn =
                gameData.status === 'playing' && player.code === currentPlayerCode;
              return (
                <div
                  key={player.code}
                  onClick={() => openStudentModal(player)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all ${
                    isCurrentTurn
                      ? 'bg-emerald-100 ring-2 ring-emerald-500'
                      : gameData.gameMode === 'survival' && !player.isAlive
                      ? 'bg-gray-100'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {gameData.gameMode === 'score' ? (
                      <span
                        className={`text-xl font-bold ${
                          index === 0
                            ? 'text-yellow-500'
                            : index === 1
                            ? 'text-gray-400'
                            : index === 2
                            ? 'text-amber-600'
                            : 'text-gray-500'
                        }`}
                      >
                        #{index + 1}
                      </span>
                    ) : (
                      <span className="text-xl">{player.isAlive ? '💚' : '💀'}</span>
                    )}
                    <span
                      className={
                        gameData.gameMode === 'survival' && !player.isAlive
                          ? 'text-gray-400 line-through'
                          : 'font-medium'
                      }
                    >
                      {player.name}
                    </span>
                    {isCurrentTurn && <span className="text-emerald-600 animate-pulse">🎯</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">⭐{player.score}점</span>
                    {player.lastWord && (
                      <span className="text-xs text-gray-400">({player.lastWord})</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 컨트롤 버튼 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex gap-3 flex-wrap">
            {gameData.status === 'waiting' && (
              <>
                <button
                  onClick={startGame}
                  disabled={players.length < 2}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg ${
                    players.length >= 2
                      ? 'bg-green-500 text-white hover:bg-green-600'
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
                  onClick={skipCurrentTurn}
                  className="flex-1 py-4 rounded-xl bg-amber-500 text-white font-bold text-lg hover:bg-amber-600"
                >
                  ⏭️ 턴 스킵 ({currentPlayer?.name})
                </button>
                <button
                  onClick={endGame}
                  className="px-6 py-4 rounded-xl bg-gray-200 text-gray-600 font-bold hover:bg-gray-300"
                >
                  종료
                </button>
              </>
            )}
            {gameData.status === 'finished' && (
              <>
                <button
                  onClick={startGame}
                  className="flex-1 py-4 rounded-xl bg-green-500 text-white font-bold text-lg hover:bg-green-600"
                >
                  🔄 다시 시작
                </button>
                <button
                  onClick={() => window.close()}
                  className="px-6 py-4 rounded-xl bg-gray-500 text-white font-bold hover:bg-gray-600"
                >
                  창 닫기
                </button>
              </>
            )}
          </div>
        </div>

        {/* 설정 정보 */}
        <div className="mt-4 bg-white/20 rounded-xl p-3 text-white text-sm">
          <div className="flex flex-wrap gap-3 justify-center">
            <span>⏱️ {gameData.timeLimit}초</span>
            <span>
              📏 {gameData.minLength}~{gameData.maxLength}글자
            </span>
            {gameData.banKillerWords && <span>🚫 한방단어 금지</span>}
            {gameData.gameMode === 'score' && gameData.maxRounds && (
              <span>🔄 {gameData.maxRounds}라운드</span>
            )}
          </div>
        </div>

        {/* 게임 종료 시 최종 순위 */}
        {gameData.status === 'finished' && (
          <div className="mt-4 bg-white rounded-2xl p-6 shadow-lg text-center">
            <h2 className="text-2xl font-bold text-amber-600 mb-4">🏆 최종 결과</h2>
            <div className="space-y-3">
              {players.slice(0, 3).map((player, index) => (
                <div
                  key={player.code}
                  className={`p-4 rounded-xl ${
                    index === 0
                      ? 'bg-yellow-100'
                      : index === 1
                      ? 'bg-gray-100'
                      : 'bg-amber-50'
                  }`}
                >
                  <span className="text-2xl mr-2">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </span>
                  <span className="font-bold text-lg">{player.name}</span>
                  <span className="ml-2 text-emerald-600 font-bold">⭐{player.score}점</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
              <button
                onClick={closeStudentModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-4 bg-emerald-50 text-center">
              <p className="text-emerald-600 font-bold text-3xl">
                {studentData ? studentData.jelly ?? studentData.cookie ?? 0 : '...'}
              </p>
              <p className="text-sm text-emerald-700">🍭 캔디</p>
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
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-center focus:border-emerald-400 focus:outline-none"
                />
                <button
                  onClick={() => handleAddCandy()}
                  disabled={isAddingCandy || !candyAmount}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-50"
                >
                  {isAddingCandy ? '...' : '적용'}
                </button>
              </div>
            </div>

            {/* 게임 내 정보 */}
            <div className="p-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">게임 정보</p>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-emerald-50 rounded-lg p-2">
                  <p className="text-xs text-emerald-600">점수</p>
                  <p className="font-bold text-emerald-700">⭐{selectedPlayer.score}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-600">마지막 단어</p>
                  <p className="font-bold text-gray-700">{selectedPlayer.lastWord || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WordChainTeacher;
