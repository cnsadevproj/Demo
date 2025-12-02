// src/games/NumberBaseball.tsx
// 숫자야구 게임 - 학생용 게임 플레이 페이지

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';

interface GameData {
  teacherId: string;
  classId: string;
  digits: 4 | 5;
  answer: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any;
  className?: string;
}

interface PlayerData {
  name: string;
  joinedAt: any;
  solvedAt: any | null;
  rank: number | null;
  attempts: number;
}

interface GuessResult {
  guess: string;
  strikes: number;
  balls: number;
}

export function NumberBaseball() {
  // URL에서 파라미터 추출
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');
  const studentCode = params.get('studentCode');
  const studentName = params.get('studentName');

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [guessHistory, setGuessHistory] = useState<GuessResult[]>([]);
  const [error, setError] = useState('');
  const [isSolved, setIsSolved] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 게임 데이터 구독
  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        setGameData(snapshot.data() as GameData);
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  // 플레이어 데이터 구독
  useEffect(() => {
    if (!gameId || !studentCode) return;

    const playerRef = doc(db, 'games', gameId, 'players', studentCode);
    const unsubscribe = onSnapshot(playerRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as PlayerData;
        setPlayerData(data);
        if (data.rank) {
          setMyRank(data.rank);
          setIsSolved(true);
        }
      }
    });

    return () => unsubscribe();
  }, [gameId, studentCode]);

  // 스트라이크/볼 계산
  const calculateResult = useCallback((guess: string, answer: string): { strikes: number; balls: number } => {
    let strikes = 0;
    let balls = 0;

    for (let i = 0; i < guess.length; i++) {
      if (guess[i] === answer[i]) {
        strikes++;
      } else if (answer.includes(guess[i])) {
        balls++;
      }
    }

    return { strikes, balls };
  }, []);

  // 추측 제출
  const handleSubmit = async () => {
    if (!gameData || !gameId || !studentCode || isSubmitting) return;

    const digits = gameData.digits;

    // 유효성 검사
    if (currentGuess.length !== digits) {
      setError(`${digits}자리 숫자를 입력해주세요`);
      return;
    }

    if (!/^\d+$/.test(currentGuess)) {
      setError('숫자만 입력해주세요');
      return;
    }

    // 중복 숫자 체크
    const uniqueDigits = new Set(currentGuess.split(''));
    if (uniqueDigits.size !== digits) {
      setError('중복된 숫자가 있어요. 각 자리는 다른 숫자여야 해요!');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const { strikes, balls } = calculateResult(currentGuess, gameData.answer);
      const newGuess: GuessResult = { guess: currentGuess, strikes, balls };
      setGuessHistory(prev => [...prev, newGuess]);

      // 시도 횟수 업데이트
      const playerRef = doc(db, 'games', gameId, 'players', studentCode);
      await updateDoc(playerRef, {
        attempts: (playerData?.attempts || 0) + 1
      });

      // 정답인 경우
      if (strikes === digits) {
        setIsSolved(true);

        // 현재 순위 계산 (게임 문서에서 현재 완료된 학생 수 확인)
        const gameRef = doc(db, 'games', gameId);
        const gameSnap = await getDoc(gameRef);
        const currentRank = (gameSnap.data()?.completedCount || 0) + 1;

        // 게임 문서 업데이트 (완료 수 증가)
        await updateDoc(gameRef, {
          completedCount: currentRank
        });

        // 플레이어 상태 업데이트
        await updateDoc(playerRef, {
          solvedAt: serverTimestamp(),
          rank: currentRank
        });

        setMyRank(currentRank);

        // 10등이면 게임 종료
        if (currentRank >= 10) {
          await updateDoc(gameRef, {
            status: 'finished'
          });
        }
      }

      setCurrentGuess('');
    } catch (err) {
      console.error('Error submitting guess:', err);
      setError('제출 중 오류가 발생했어요');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 숫자 버튼 클릭
  const handleNumberClick = (num: string) => {
    if (!gameData || currentGuess.length >= gameData.digits) return;
    if (currentGuess.includes(num)) {
      setError('이미 사용한 숫자예요!');
      return;
    }
    setError('');
    setCurrentGuess(prev => prev + num);
  };

  // 지우기
  const handleDelete = () => {
    setCurrentGuess(prev => prev.slice(0, -1));
    setError('');
  };

  // 전체 지우기
  const handleClear = () => {
    setCurrentGuess('');
    setError('');
  };

  // 자릿수가 채워지면 자동 제출
  useEffect(() => {
    if (gameData && currentGuess.length === gameData.digits && !isSubmitting && !isSolved) {
      handleSubmit();
    }
  }, [currentGuess, gameData?.digits, isSubmitting, isSolved]);

  // 유효하지 않은 접근
  if (!gameId || !studentCode || !studentName) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-100 to-blue-100 flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-gradient-to-b from-purple-100 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="text-6xl mb-4 animate-bounce">⚾</div>
          <h1 className="text-xl font-bold text-gray-800">게임 로딩 중...</h1>
        </div>
      </div>
    );
  }

  // 대기 중
  if (gameData.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-100 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="text-6xl mb-4 animate-pulse">⚾</div>
          <h1 className="text-2xl font-bold text-purple-800 mb-2">숫자야구</h1>
          <p className="text-gray-600 mb-4">{studentName}님, 게임 시작을 기다리는 중...</p>
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-purple-700 font-medium">{gameData.digits}자리 숫자 맞추기</p>
            <p className="text-sm text-purple-600 mt-1">선생님이 게임을 시작하면 자동으로 시작돼요!</p>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // 게임 종료
  if (gameData.status === 'finished' && !isSolved) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="text-6xl mb-4">🏁</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">게임 종료!</h1>
          <p className="text-gray-600 mb-4">아쉽게도 10등 안에 들지 못했어요</p>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-700">정답: <span className="font-bold text-purple-600">{gameData.answer}</span></p>
            <p className="text-sm text-gray-500 mt-1">시도 횟수: {playerData?.attempts || 0}회</p>
          </div>
          <button
            onClick={() => window.close()}
            className="mt-6 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            창 닫기
          </button>
        </div>
      </div>
    );
  }

  // 정답 맞춤!
  if (isSolved) {
    const rankEmoji = myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎉';
    const rankColor = myRank === 1 ? 'from-yellow-400 to-amber-500' :
                      myRank === 2 ? 'from-gray-300 to-gray-400' :
                      myRank === 3 ? 'from-amber-600 to-amber-700' : 'from-purple-400 to-pink-500';

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-100 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className={`text-8xl mb-4 animate-bounce`}>{rankEmoji}</div>
          <h1 className="text-3xl font-bold text-green-600 mb-2">정답!</h1>
          <div className={`inline-block px-6 py-3 rounded-full bg-gradient-to-r ${rankColor} text-white font-bold text-2xl mb-4`}>
            {myRank}등
          </div>
          <p className="text-gray-600 mb-2">{studentName}님, 축하해요!</p>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-green-700">정답: <span className="font-bold">{gameData.answer}</span></p>
            <p className="text-sm text-green-600 mt-1">시도 횟수: {guessHistory.length}회</p>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            선생님이 보상을 지급할 때까지 기다려주세요!
          </p>
          <button
            onClick={() => window.close()}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            창 닫기
          </button>
        </div>
      </div>
    );
  }

  // 게임 플레이 화면
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-blue-100 p-4">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg mb-4 text-center">
          <h1 className="text-2xl font-bold text-purple-800">⚾ 숫자야구</h1>
          <p className="text-sm text-gray-600">{gameData.digits}자리 숫자 맞추기</p>
          <p className="text-xs text-gray-500 mt-1">시도: {guessHistory.length}회</p>
        </div>

        {/* 규칙 안내 */}
        <div className="bg-white/50 rounded-xl p-3 mb-4 text-center text-sm">
          <span className="text-red-500 font-bold">⚾ 스트라이크</span> = 숫자와 위치 모두 맞음 |
          <span className="text-blue-500 font-bold ml-1">🔵 볼</span> = 숫자만 맞음
        </div>

        {/* 입력 표시 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-4">
          <div className="flex justify-center gap-3 mb-4">
            {Array.from({ length: gameData.digits }).map((_, i) => (
              <div
                key={i}
                className={`w-14 h-16 rounded-xl flex items-center justify-center text-3xl font-bold
                  ${currentGuess[i] ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-300 border-2 border-dashed border-gray-300'}`}
              >
                {currentGuess[i] || '?'}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center mb-2">{error}</p>
          )}

          {/* 숫자 키패드 - 다이얼 방식 */}
          <div className="grid grid-cols-3 gap-2 mb-4 max-w-[200px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
                disabled={currentGuess.includes(num) || currentGuess.length >= gameData.digits}
                className={`h-11 rounded-xl font-bold text-lg transition-all
                  ${currentGuess.includes(num)
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200 active:scale-95'}`}
              >
                {num}
              </button>
            ))}
            {/* 0 버튼 - 가운데 정렬 */}
            <div></div>
            <button
              onClick={() => handleNumberClick('0')}
              disabled={currentGuess.includes('0') || currentGuess.length >= gameData.digits}
              className={`h-11 rounded-xl font-bold text-lg transition-all
                ${currentGuess.includes('0')
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200 active:scale-95'}`}
            >
              0
            </button>
            <div></div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300"
            >
              전체 지우기
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 py-3 bg-red-100 text-red-600 rounded-xl font-medium hover:bg-red-200"
            >
              ← 지우기
            </button>
            <button
              onClick={handleSubmit}
              disabled={currentGuess.length !== gameData.digits || isSubmitting}
              className={`flex-1 py-3 rounded-xl font-bold transition-all
                ${currentGuess.length === gameData.digits && !isSubmitting
                  ? 'bg-green-500 text-white hover:bg-green-600 active:scale-95'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              {isSubmitting ? '...' : '제출!'}
            </button>
          </div>
        </div>

        {/* 추측 기록 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <h2 className="font-bold text-gray-700 mb-3">📜 기록</h2>
          {guessHistory.length === 0 ? (
            <p className="text-gray-400 text-center py-4">아직 시도한 기록이 없어요</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...guessHistory].reverse().map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                >
                  <div className="flex gap-1">
                    {result.guess.split('').map((digit, i) => (
                      <span
                        key={i}
                        className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center font-bold text-purple-700"
                      >
                        {digit}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-red-500 font-bold">
                      ⚾ {result.strikes}S
                    </span>
                    <span className="text-blue-500 font-bold">
                      🔵 {result.balls}B
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NumberBaseball;
