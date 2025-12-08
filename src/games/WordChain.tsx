// src/games/WordChain.tsx
// 끝말잇기 - 학생용 게임 플레이 페이지

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import {
  validateWordChainInput,
  getLastChar,
  getDueumVariants,
  calculateScore,
} from '../services/koreanDictApi';

interface GameData {
  teacherId: string;
  classId: string;
  className?: string;
  status: 'waiting' | 'playing' | 'finished';
  gameMode: 'survival' | 'score'; // 생존모드 또는 점수모드
  battleType: 'individual' | 'team'; // 개인전 또는 팀전
  currentWord: string;
  currentTurnIndex: number;
  turnOrder: string[]; // 플레이어 순서 (studentCode 배열)
  usedWords: string[];
  timeLimit: number; // 턴당 제한시간 (초)
  minLength: number;
  maxLength: number;
  banKillerWords: boolean;
  maxRounds?: number; // 점수모드 최대 라운드
  currentRound?: number;
  createdAt: any;
  // 팀전용
  teamId?: string;
  teamName?: string;
}

interface PlayerData {
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
  timestamp: any;
}

export function WordChain() {
  // URL에서 파라미터 추출
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');
  const studentCode = params.get('studentCode');
  const studentName = params.get('studentName');

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [wordHistory, setWordHistory] = useState<WordHistory[]>([]);
  const [inputWord, setInputWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [lastValidation, setLastValidation] = useState<{ word: string; definition?: string } | null>(null);
  const [closeCountdown, setCloseCountdown] = useState<number | null>(null);
  const [eliminatedMessage, setEliminatedMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  // 현재 내 차례인지 확인
  const isMyTurn = gameData?.status === 'playing' &&
    gameData?.turnOrder[gameData.currentTurnIndex] === studentCode;

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
          setCloseCountdown(15);
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
      }
    });

    return () => unsubscribe();
  }, [gameId, studentCode]);

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

  // 내 차례일 때 타이머 시작
  useEffect(() => {
    if (!isMyTurn || !gameData) {
      setTimeLeft(null);
      return;
    }

    setTimeLeft(gameData.timeLimit);
    setError(null);
    inputRef.current?.focus();

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isMyTurn, gameData?.currentTurnIndex]);

  // 시간 초과 처리
  useEffect(() => {
    if (timeLeft === 0 && isMyTurn && gameData) {
      handleTimeout();
    }
  }, [timeLeft]);

  // 히스토리 자동 스크롤
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [wordHistory]);

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

  // 시간 초과 처리
  const handleTimeout = async () => {
    if (!gameId || !studentCode || !gameData) return;

    setEliminatedMessage('시간 초과!');

    try {
      const gameRef = doc(db, 'games', gameId);
      const playerRef = doc(db, 'games', gameId, 'players', studentCode);

      if (gameData.gameMode === 'survival') {
        // 생존모드: 탈락 처리
        await updateDoc(playerRef, { isAlive: false });

        // 다음 턴으로
        const alivePlayers = gameData.turnOrder.filter(code => code !== studentCode);
        if (alivePlayers.length <= 1) {
          // 게임 종료
          await updateDoc(gameRef, {
            status: 'finished',
            winner: alivePlayers[0] || null,
          });
        } else {
          // 다음 플레이어로
          const newTurnOrder = alivePlayers;
          const nextIndex = gameData.currentTurnIndex % newTurnOrder.length;
          await updateDoc(gameRef, {
            turnOrder: newTurnOrder,
            currentTurnIndex: nextIndex,
          });
        }
      } else {
        // 점수모드: 다음 턴으로
        const nextIndex = (gameData.currentTurnIndex + 1) % gameData.turnOrder.length;
        const newRound = nextIndex === 0
          ? (gameData.currentRound || 1) + 1
          : (gameData.currentRound || 1);

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
      console.error('Timeout handling failed:', error);
    }
  };

  // 단어 제출
  const handleSubmit = async () => {
    if (!gameId || !studentCode || !gameData || isSubmitting || !inputWord.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const word = inputWord.trim();

    try {
      // 단어 검증
      const validation = await validateWordChainInput(
        word,
        gameData.currentWord,
        gameData.usedWords,
        {
          minLength: gameData.minLength,
          maxLength: gameData.maxLength,
          banKillerWords: gameData.banKillerWords,
        }
      );

      if (!validation.isValid) {
        setError(validation.error || '올바르지 않은 단어입니다.');
        setIsSubmitting(false);
        return;
      }

      // 검증 성공 - 단어 저장
      setLastValidation({ word, definition: validation.definition });

      const gameRef = doc(db, 'games', gameId);
      const playerRef = doc(db, 'games', gameId, 'players', studentCode);
      const historyRef = doc(db, 'games', gameId, 'history', 'words');

      // 히스토리에 추가
      await updateDoc(historyRef, {
        words: arrayUnion({
          word,
          playerName: studentName,
          playerCode: studentCode,
          score: validation.score || 0,
          timestamp: new Date().toISOString(),
        }),
      });

      // 플레이어 점수 업데이트
      await updateDoc(playerRef, {
        score: (playerData?.score || 0) + (validation.score || 0),
        lastWord: word,
      });

      // 다음 턴으로
      const nextIndex = (gameData.currentTurnIndex + 1) % gameData.turnOrder.length;
      const newRound = nextIndex === 0
        ? (gameData.currentRound || 1) + 1
        : (gameData.currentRound || 1);

      // 점수모드에서 라운드 체크
      if (gameData.gameMode === 'score' && gameData.maxRounds && newRound > gameData.maxRounds) {
        await updateDoc(gameRef, {
          status: 'finished',
          currentWord: word,
          usedWords: arrayUnion(word),
        });
      } else {
        await updateDoc(gameRef, {
          currentWord: word,
          usedWords: arrayUnion(word),
          currentTurnIndex: nextIndex,
          currentRound: newRound,
        });
      }

      setInputWord('');
    } catch (error) {
      console.error('단어 제출 실패:', error);
      setError('제출 중 오류가 발생했습니다.');
    }

    setIsSubmitting(false);
  };

  // 유효하지 않은 접근
  if (!gameId || !studentCode || !studentName) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-100 to-teal-100 flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-gradient-to-b from-emerald-100 to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="text-6xl mb-4 animate-bounce">🔤</div>
          <h1 className="text-xl font-bold text-gray-800">게임 로딩 중...</h1>
        </div>
      </div>
    );
  }

  // 탈락한 경우 (생존모드)
  if (playerData && !playerData.isAlive && gameData.gameMode === 'survival') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="text-8xl mb-4">😢</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">탈락!</h1>
          <p className="text-gray-600 mb-4">{eliminatedMessage || '아쉽게도 탈락했어요'}</p>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-700">획득 점수: <span className="font-bold text-emerald-600">{playerData.score}점</span></p>
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
      <div className="min-h-screen bg-gradient-to-b from-emerald-100 to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="text-6xl mb-4 animate-pulse">🔤</div>
          <h1 className="text-2xl font-bold text-emerald-800 mb-2">끝말잇기</h1>
          <div className="flex justify-center gap-2 mb-2">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
              gameData.gameMode === 'score'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {gameData.gameMode === 'score' ? '⭐ 점수모드' : '💀 생존모드'}
            </span>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
              gameData.battleType === 'team'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {gameData.battleType === 'team' ? `👥 ${gameData.teamName || '팀전'}` : '👤 개인전'}
            </span>
          </div>
          <p className="text-gray-600 mb-4">{studentName}님, 게임 시작을 기다리는 중...</p>
          <div className="bg-emerald-50 rounded-xl p-4 text-sm">
            <p className="text-emerald-700 font-medium mb-2">게임 규칙</p>
            <ul className="text-emerald-600 text-left space-y-1">
              <li>• 제한시간: {gameData.timeLimit}초</li>
              <li>• 글자 수: {gameData.minLength}~{gameData.maxLength}글자</li>
              {gameData.banKillerWords && <li>• 한방 단어 금지</li>}
              {gameData.gameMode === 'score' && (
                <li>• 2글자=1점, 3글자=2점, 4글자=3점, 5글자+=5점</li>
              )}
            </ul>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // 게임 종료
  if (gameData.status === 'finished') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-amber-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="text-8xl mb-4">🏆</div>
          <h1 className="text-3xl font-bold text-amber-600 mb-2">게임 종료!</h1>
          <p className="text-gray-600 mb-2">{studentName}님, 수고하셨습니다!</p>
          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-amber-700 text-lg">최종 점수</p>
            <p className="text-4xl font-bold text-amber-600 mt-2">⭐ {playerData?.score || 0}점</p>
            <p className="text-sm text-amber-600 mt-2">사용한 단어: {wordHistory.filter(w => w.playerCode === studentCode).length}개</p>
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

  // 게임 진행 중
  const currentChar = getLastChar(gameData.currentWord);
  const validStartChars = getDueumVariants(currentChar);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-100 to-teal-100 p-4">
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">
              {gameData.gameMode === 'score'
                ? `${gameData.currentRound || 1}/${gameData.maxRounds || '∞'} 라운드`
                : '생존모드'}
            </span>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
              ⭐ {playerData?.score || 0}점
            </span>
          </div>
          {gameData.battleType === 'team' && gameData.teamName && (
            <div className="text-center text-sm text-blue-600 font-medium">
              👥 {gameData.teamName}
            </div>
          )}
        </div>

        {/* 현재 단어 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-4 text-center">
          <p className="text-sm text-gray-500 mb-2">현재 단어</p>
          <p className="text-4xl font-bold text-emerald-600 mb-2">{gameData.currentWord}</p>
          <p className="text-lg text-gray-600">
            다음 글자: <span className="font-bold text-emerald-700">
              {validStartChars.length > 1
                ? validStartChars.join(' 또는 ')
                : currentChar}
            </span>
          </p>
        </div>

        {/* 내 차례 또는 대기 */}
        {isMyTurn ? (
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-4">
            {/* 타이머 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-emerald-700">⏱️ 내 차례!</span>
                <span className={`text-2xl font-bold ${
                  timeLeft !== null && timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-emerald-600'
                }`}>
                  {timeLeft}초
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    timeLeft !== null && timeLeft <= 5 ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${((timeLeft || 0) / gameData.timeLimit) * 100}%`
                  }}
                ></div>
              </div>
            </div>

            {/* 입력 */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputWord}
                onChange={(e) => setInputWord(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={`'${validStartChars[0]}'(으)로 시작하는 단어...`}
                className="flex-1 px-4 py-3 border-2 border-emerald-300 rounded-xl focus:border-emerald-500 focus:outline-none text-lg"
                disabled={isSubmitting}
                autoFocus
              />
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !inputWord.trim()}
                className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '...' : '제출'}
              </button>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                ❌ {error}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-4 text-center">
            <div className="text-4xl mb-2">⏳</div>
            <p className="text-gray-600">
              <span className="font-bold text-emerald-600">
                {gameData.turnOrder[gameData.currentTurnIndex] === studentCode
                  ? '내'
                  : `${wordHistory.find(w => w.playerCode === gameData.turnOrder[gameData.currentTurnIndex])?.playerName || '다른 학생'}`}
              </span>의 차례입니다
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        {/* 단어 히스토리 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <h3 className="font-bold text-gray-700 mb-3">📝 단어 기록</h3>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {wordHistory.length === 0 ? (
              <p className="text-gray-400 text-center py-4">아직 단어가 없습니다</p>
            ) : (
              wordHistory.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    item.playerCode === studentCode
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium">{item.word}</span>
                    <span className="text-xs text-gray-400">by {item.playerName}</span>
                  </div>
                  <span className="text-sm text-emerald-600 font-bold">+{item.score}점</span>
                </div>
              ))
            )}
            <div ref={historyEndRef} />
          </div>
        </div>

        {/* 참가자 목록 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg mt-4">
          <h3 className="font-bold text-gray-700 mb-3">👥 참가자 ({gameData.turnOrder.length}명)</h3>
          <div className="flex flex-wrap gap-2">
            {gameData.turnOrder.map((code, index) => {
              const isCurrentTurn = index === gameData.currentTurnIndex;
              const isMe = code === studentCode;
              const player = wordHistory.find(w => w.playerCode === code);
              return (
                <span
                  key={code}
                  className={`px-3 py-1 rounded-full text-sm ${
                    isCurrentTurn
                      ? 'bg-emerald-500 text-white font-bold animate-pulse'
                      : isMe
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isMe ? '나' : player?.playerName || `학생${index + 1}`}
                  {isCurrentTurn && ' 🎯'}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WordChain;
