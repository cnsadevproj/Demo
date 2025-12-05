// src/games/MinorityGame.tsx
// 소수결게임 - 학생용 게임 플레이 페이지
// 밸런스 게임에서 소수파가 승리하는 서바이벌 게임

import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';

interface GameData {
  teacherId: string;
  classId: string;
  className?: string;
  status: 'waiting' | 'question' | 'result' | 'finished';
  currentRound: number;
  currentQuestion: {
    text: string;
    optionA: string;
    optionB: string;
  } | null;
  createdAt: any;
  gameMode?: 'elimination' | 'score'; // 탈락전 또는 점수전
  maxRounds?: number; // 점수전 최대 라운드
}

interface PlayerData {
  name: string;
  joinedAt: any;
  isAlive: boolean;
  currentChoice: 'A' | 'B' | null;
  survivedRounds: number;
  score?: number; // 점수 모드에서 사용
}

interface RoundResult {
  question: string;
  optionA: string;
  optionB: string;
  countA: number;
  countB: number;
  winningChoice: 'A' | 'B';
  eliminated: string[];
  gameMode?: 'elimination' | 'score';
}

export function MinorityGame() {
  // URL에서 파라미터 추출
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');
  const studentCode = params.get('studentCode');
  const studentName = params.get('studentName');

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [closeCountdown, setCloseCountdown] = useState<number | null>(null);

  // 게임 데이터 구독
  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameData;
        setGameData(data);

        // 게임 종료 시 카운트다운 시작
        if (data.status === 'finished' && closeCountdown === null) {
          setCloseCountdown(10);
        }

        // 새 질문 시 선택 초기화
        if (data.status === 'question') {
          setSelectedChoice(null);
        }
      } else {
        alert('게임이 삭제되었습니다.');
        window.close();
      }
    });

    return () => unsubscribe();
  }, [gameId, closeCountdown]);

  // 플레이어 데이터 구독
  useEffect(() => {
    if (!gameId || !studentCode) return;

    const playerRef = doc(db, 'games', gameId, 'players', studentCode);
    const unsubscribe = onSnapshot(playerRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as PlayerData;
        setPlayerData(data);
        if (data.currentChoice) {
          setSelectedChoice(data.currentChoice);
        }
      }
    });

    return () => unsubscribe();
  }, [gameId, studentCode]);

  // 라운드 결과 구독
  useEffect(() => {
    if (!gameId || !gameData) return;

    const resultRef = doc(db, 'games', gameId, 'rounds', `round_${gameData.currentRound}`);
    const unsubscribe = onSnapshot(resultRef, (snapshot) => {
      if (snapshot.exists()) {
        setLastResult(snapshot.data() as RoundResult);
      }
    });

    return () => unsubscribe();
  }, [gameId, gameData?.currentRound]);

  // 카운트다운 및 자동 종료
  useEffect(() => {
    if (closeCountdown === null) return;
    if (closeCountdown <= 0) {
      window.close();
      return;
    }
    const timer = setTimeout(() => setCloseCountdown(closeCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [closeCountdown]);

  // 선택 제출
  const submitChoice = async (choice: 'A' | 'B') => {
    if (!gameId || !studentCode || isSubmitting) return;

    setIsSubmitting(true);
    setSelectedChoice(choice);

    try {
      const playerRef = doc(db, 'games', gameId, 'players', studentCode);
      await updateDoc(playerRef, {
        currentChoice: choice
      });
    } catch (error) {
      console.error('Failed to submit choice:', error);
      setSelectedChoice(null);
    }

    setIsSubmitting(false);
  };

  // 유효하지 않은 접근
  if (!gameId || !studentCode || !studentName) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">잘못된 접근</h1>
          <p className="text-gray-600">게임에 올바르게 참가해주세요</p>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (!gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="text-6xl mb-4 animate-bounce">🎯</div>
          <h1 className="text-xl font-bold text-gray-800">게임 로딩 중...</h1>
        </div>
      </div>
    );
  }

  // 탈락한 경우 (탈락전 모드에서만)
  if (playerData && !playerData.isAlive && gameData?.gameMode !== 'score') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="text-8xl mb-4">😢</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">탈락!</h1>
          <p className="text-gray-600 mb-4">아쉽게도 다수파에 속했어요</p>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-700">생존 라운드: <span className="font-bold text-purple-600">{playerData.survivedRounds}</span></p>
          </div>
          {closeCountdown !== null && (
            <p className="text-sm text-amber-600 mt-4">
              ⏰ {closeCountdown}초 후 자동으로 닫힙니다
            </p>
          )}
          <button
            onClick={() => window.close()}
            className="mt-4 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            창 닫기
          </button>
        </div>
      </div>
    );
  }

  // 대기 중
  if (gameData.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="text-6xl mb-4 animate-pulse">🎯</div>
          <h1 className="text-2xl font-bold text-pink-800 mb-2">소수결 게임</h1>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${
            gameData.gameMode === 'score'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-purple-100 text-purple-700'
          }`}>
            {gameData.gameMode === 'score' ? '⭐ 점수전 모드' : '💀 탈락전 모드'}
          </span>
          <p className="text-gray-600 mb-4">{studentName}님, 게임 시작을 기다리는 중...</p>
          <div className="bg-pink-50 rounded-xl p-4">
            {gameData.gameMode === 'score' ? (
              <>
                <p className="text-pink-700 font-medium">소수파가 되어 점수를 얻으세요!</p>
                <p className="text-sm text-pink-600 mt-1">소수파: 1점, 다수파: 0점</p>
                <p className="text-sm text-pink-600">총 {gameData.maxRounds || 10}문제!</p>
              </>
            ) : (
              <>
                <p className="text-pink-700 font-medium">소수파가 되어 살아남으세요!</p>
                <p className="text-sm text-pink-600 mt-1">적은 쪽을 선택해야 생존!</p>
              </>
            )}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // 게임 종료
  if (gameData.status === 'finished') {
    // 점수 모드 종료 화면
    if (gameData.gameMode === 'score') {
      return (
        <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-amber-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
            <div className="text-8xl mb-4">🏆</div>
            <h1 className="text-3xl font-bold text-amber-600 mb-2">게임 종료!</h1>
            <p className="text-gray-600 mb-2">{studentName}님, 수고하셨습니다!</p>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-amber-700 text-lg">최종 점수</p>
              <p className="text-4xl font-bold text-amber-600 mt-2">⭐ {playerData?.score || 0}점</p>
              <p className="text-sm text-amber-600 mt-2">{gameData.maxRounds || 10}문제 중 {playerData?.score || 0}번 소수파!</p>
            </div>
            {closeCountdown !== null && (
              <p className="text-sm text-amber-600 mt-4">
                ⏰ {closeCountdown}초 후 자동으로 닫힙니다
              </p>
            )}
            <button
              onClick={() => window.close()}
              className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              창 닫기
            </button>
          </div>
        </div>
      );
    }

    // 탈락전 종료 화면 - 생존자
    if (playerData?.isAlive) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-amber-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
            <div className="text-8xl mb-4 animate-bounce">🏆</div>
            <h1 className="text-3xl font-bold text-amber-600 mb-2">최종 생존!</h1>
            <p className="text-gray-600 mb-2">{studentName}님, 축하합니다!</p>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-amber-700">생존 라운드: <span className="font-bold">{playerData.survivedRounds}</span></p>
            </div>
            {closeCountdown !== null && (
              <p className="text-sm text-amber-600 mt-4">
                ⏰ {closeCountdown}초 후 자동으로 닫힙니다
              </p>
            )}
            <button
              onClick={() => window.close()}
              className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              창 닫기
            </button>
          </div>
        </div>
      );
    }
  }

  // 결과 화면
  if (gameData.status === 'result' && lastResult) {
    const myChoice = selectedChoice;
    const iWon = myChoice === lastResult.winningChoice;
    const isScoreMode = gameData.gameMode === 'score';

    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        iWon ? 'bg-gradient-to-b from-green-100 to-emerald-100' : 'bg-gradient-to-b from-red-100 to-pink-100'
      }`}>
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md w-full">
          <div className="text-6xl mb-4">{iWon ? '✅' : '❌'}</div>
          <h1 className={`text-2xl font-bold mb-2 ${iWon ? 'text-green-600' : 'text-red-600'}`}>
            {isScoreMode
              ? (iWon ? '+1점!' : '0점')
              : (iWon ? '생존!' : '위험!')}
          </h1>
          {isScoreMode && (
            <p className="text-yellow-600 font-bold mb-4">
              현재 점수: ⭐ {playerData?.score || 0}점
            </p>
          )}

          {/* 질문 */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-gray-700 font-medium">{lastResult.question}</p>
          </div>

          {/* 결과 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={`p-4 rounded-xl ${
              lastResult.winningChoice === 'A'
                ? 'bg-green-100 border-2 border-green-400'
                : 'bg-red-100 border-2 border-red-400'
            }`}>
              <p className="font-bold text-lg">{lastResult.optionA}</p>
              <p className="text-2xl font-bold mt-2">{lastResult.countA}명</p>
              {lastResult.winningChoice === 'A' && (
                <span className="text-green-600 text-sm">소수파 {isScoreMode ? '+1점!' : '승리!'}</span>
              )}
            </div>
            <div className={`p-4 rounded-xl ${
              lastResult.winningChoice === 'B'
                ? 'bg-green-100 border-2 border-green-400'
                : 'bg-red-100 border-2 border-red-400'
            }`}>
              <p className="font-bold text-lg">{lastResult.optionB}</p>
              <p className="text-2xl font-bold mt-2">{lastResult.countB}명</p>
              {lastResult.winningChoice === 'B' && (
                <span className="text-green-600 text-sm">소수파 {isScoreMode ? '+1점!' : '승리!'}</span>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-500">
            {isScoreMode
              ? `${gameData.currentRound}/${gameData.maxRounds || 10}라운드 완료 / 다음 라운드 대기중...`
              : `${lastResult.eliminated.length}명 탈락 / 다음 라운드 대기중...`}
          </p>
        </div>
      </div>
    );
  }

  // 질문 화면
  if (gameData.status === 'question' && gameData.currentQuestion) {
    const isScoreMode = gameData.gameMode === 'score';
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-100 p-4">
        <div className="max-w-md mx-auto">
          {/* 헤더 */}
          <div className="bg-white rounded-2xl p-4 shadow-lg mb-4 text-center">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Round {gameData.currentRound}{isScoreMode ? `/${gameData.maxRounds || 10}` : ''}
              </span>
              {isScoreMode && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold">
                  ⭐ {playerData?.score || 0}점
                </span>
              )}
              <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                소수파가 되세요!
              </span>
            </div>
          </div>

          {/* 질문 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-4">
            <h2 className="text-xl font-bold text-gray-800 text-center mb-6">
              {gameData.currentQuestion.text}
            </h2>

            {/* 선택지 */}
            <div className="space-y-4">
              <button
                onClick={() => submitChoice('A')}
                disabled={isSubmitting || selectedChoice !== null}
                className={`w-full p-6 rounded-2xl text-left transition-all ${
                  selectedChoice === 'A'
                    ? 'bg-pink-500 text-white scale-105 shadow-lg'
                    : selectedChoice === 'B'
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-pink-50 text-pink-800 hover:bg-pink-100 hover:scale-102 active:scale-95'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🅰️</span>
                  <span className="text-lg font-medium">{gameData.currentQuestion.optionA}</span>
                </div>
              </button>

              <button
                onClick={() => submitChoice('B')}
                disabled={isSubmitting || selectedChoice !== null}
                className={`w-full p-6 rounded-2xl text-left transition-all ${
                  selectedChoice === 'B'
                    ? 'bg-purple-500 text-white scale-105 shadow-lg'
                    : selectedChoice === 'A'
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 hover:scale-102 active:scale-95'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🅱️</span>
                  <span className="text-lg font-medium">{gameData.currentQuestion.optionB}</span>
                </div>
              </button>
            </div>

            {selectedChoice && (
              <div className="mt-6 text-center">
                <p className="text-gray-500">선택 완료! 결과를 기다리세요...</p>
                <div className="mt-2 flex justify-center gap-2">
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>

          {/* 도움말 */}
          <div className="bg-white/50 rounded-xl p-4 text-center text-sm text-gray-600">
            {isScoreMode ? (
              <>
                <p>💡 소수파에 속하면 1점을 얻어요!</p>
                <p className="mt-1">남들이 고를 것 같은 선택지를 피하세요</p>
              </>
            ) : (
              <>
                <p>💡 적은 수가 선택한 쪽이 생존합니다!</p>
                <p className="mt-1">남들이 고를 것 같은 선택지를 피하세요</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 기본 로딩
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
        <div className="text-6xl mb-4 animate-spin">⏳</div>
        <h1 className="text-xl font-bold text-gray-800">잠시만 기다려주세요...</h1>
      </div>
    </div>
  );
}

export default MinorityGame;
