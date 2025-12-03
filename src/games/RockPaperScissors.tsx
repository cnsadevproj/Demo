// src/games/RockPaperScissors.tsx
// 가위바위보 게임 - 학생용 게임 플레이 페이지

import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';

type Choice = 'rock' | 'paper' | 'scissors' | null;
type GameMode = 'survivor' | 'candy15' | 'candy12';
type GameStatus = 'waiting' | 'selecting' | 'result' | 'finished';
type PlayerResult = 'win' | 'lose' | 'draw' | null;

interface GameData {
  teacherId: string;
  classId: string;
  status: GameStatus;
  gameMode: GameMode;
  teacherChoice: Choice;
  round: number;
  createdAt: any;
  className?: string;
  showResult?: boolean;
}

interface PlayerData {
  name: string;
  choice: Choice;
  eliminated: boolean;
  candyBet: number;
  result: PlayerResult;
  candyWon: number;
  myCandy?: number; // 학생의 현재 캔디 보유량
}

const CHOICE_EMOJI: Record<string, string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
};

const CHOICE_NAME: Record<string, string> = {
  rock: '바위',
  paper: '보',
  scissors: '가위',
};

const getResultText = (result: PlayerResult): string => {
  if (result === 'win') return '이겼어요!';
  if (result === 'lose') return '졌어요...';
  if (result === 'draw') return '비겼어요!';
  return '';
};

const getResultColor = (result: PlayerResult): string => {
  if (result === 'win') return 'text-green-600';
  if (result === 'lose') return 'text-red-600';
  if (result === 'draw') return 'text-amber-600';
  return '';
};

export function RockPaperScissors() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');
  const studentCode = params.get('studentCode');
  const studentName = params.get('studentName');

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<Choice>(null);
  const [candyBetInput, setCandyBetInput] = useState<string>('');
  const [hasBetConfirmed, setHasBetConfirmed] = useState(false); // 배팅 확정 여부
  const [noBet, setNoBet] = useState(false); // 배팅 안함 선택
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closeCountdown, setCloseCountdown] = useState<number | null>(null);

  // 게임 데이터 구독
  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameData;
        setGameData(data);

        // 게임이 종료되면 카운트다운 시작
        if (data.status === 'finished' && closeCountdown === null) {
          setCloseCountdown(5);
        }
      } else {
        alert('게임이 종료되었습니다.');
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
        // 선택이 리셋되면 (새 라운드) 로컬 선택도 리셋
        if (data.choice === null) {
          setSelectedChoice(null);
          setCandyBetInput('');
          setHasBetConfirmed(false);
          setNoBet(false);
        }
      }
    });

    return () => unsubscribe();
  }, [gameId, studentCode]);

  // 카운트다운 및 자동 종료
  useEffect(() => {
    if (closeCountdown === null) return;

    if (closeCountdown <= 0) {
      window.close();
      return;
    }

    const timer = setTimeout(() => {
      setCloseCountdown(closeCountdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [closeCountdown]);

  // 배팅 확정
  const confirmBet = () => {
    const betAmount = parseInt(candyBetInput) || 0;
    if (betAmount <= 0) {
      alert('배팅할 캔디 수를 입력해주세요!');
      return;
    }
    if (playerData?.myCandy !== undefined && betAmount > playerData.myCandy) {
      alert('보유한 캔디보다 많이 배팅할 수 없어요!');
      return;
    }
    setHasBetConfirmed(true);
    setNoBet(false);
  };

  // 배팅 안함 선택
  const selectNoBet = () => {
    setNoBet(true);
    setHasBetConfirmed(false);
    setCandyBetInput('');
  };

  // 선택 및 배팅 제출
  const submitChoice = async (choice: Choice) => {
    if (!gameId || !studentCode || isSubmitting || !choice) return;
    if (gameData?.status !== 'selecting') return;
    if (playerData?.eliminated) return;

    // 캔디 모드에서는 배팅 확정 또는 배팅 안함 중 하나 필수
    if (gameData?.gameMode !== 'survivor') {
      if (!hasBetConfirmed && !noBet) {
        alert('배팅을 확정하거나 "배팅 안함"을 선택해주세요!');
        return;
      }
    }

    setSelectedChoice(choice);
    setIsSubmitting(true);

    try {
      const playerRef = doc(db, 'games', gameId, 'players', studentCode);
      const betAmount = noBet ? 0 : (parseInt(candyBetInput) || 0);

      const updateData: any = {
        choice: choice,
      };

      // 캔디 모드일 때 배팅금액도 저장 (배팅 안함이면 0)
      if (gameData?.gameMode !== 'survivor') {
        updateData.candyBet = betAmount;

        // 배팅 시 즉시 캔디 차감
        if (betAmount > 0 && gameData?.teacherId) {
          const studentRef = doc(db, 'teachers', gameData.teacherId, 'students', studentCode);
          const studentSnap = await getDoc(studentRef);
          if (studentSnap.exists()) {
            const studentData = studentSnap.data();
            const currentCandy = studentData.jelly ?? studentData.cookie ?? 0;
            const newCandy = Math.max(0, currentCandy - betAmount);
            await updateDoc(studentRef, {
              jelly: newCandy
            });
            // 차감 후 잔액 업데이트
            updateData.myCandy = newCandy;
          }
        }
      }

      await updateDoc(playerRef, updateData);
    } catch (error) {
      console.error('Failed to submit choice:', error);
      setSelectedChoice(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 유효하지 않은 접근
  if (!gameId || !studentCode || !studentName) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-100 to-orange-100 flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-gradient-to-b from-amber-100 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="text-6xl mb-4 animate-bounce">✊✋✌️</div>
          <h1 className="text-xl font-bold text-gray-800">게임 로딩 중...</h1>
        </div>
      </div>
    );
  }

  // 탈락된 경우
  if (playerData?.eliminated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-200 to-gray-300 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="text-6xl mb-4 opacity-50">😢</div>
          <h1 className="text-2xl font-bold text-gray-600 mb-2">탈락!</h1>
          <p className="text-gray-500 mb-4">{studentName}님, 아쉽게도 탈락했어요</p>
          <p className="text-sm text-gray-400">다른 친구들의 경기를 지켜봐주세요!</p>
          <button
            onClick={() => window.close()}
            className="mt-6 px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            창 닫기
          </button>
        </div>
      </div>
    );
  }

  // 대기 중
  if (gameData.status === 'waiting') {
    const modeText = gameData.gameMode === 'survivor'
      ? '최후의 승자를 가려라!'
      : gameData.gameMode === 'candy15'
        ? '🍭 캔디 1.5배 이벤트!'
        : '🍭 캔디 1.2배 이벤트!';

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-100 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="text-6xl mb-4 animate-pulse">✊✋✌️</div>
          <h1 className="text-2xl font-bold text-amber-800 mb-2">가위바위보</h1>
          <p className="text-gray-600 mb-4">{studentName}님, 게임 시작을 기다리는 중...</p>
          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-amber-700 font-medium">{modeText}</p>
            <p className="text-sm text-amber-600 mt-1">선생님이 게임을 시작하면 자동으로 시작돼요!</p>
          </div>
          {/* 캔디 모드일 때 보유 캔디 표시 */}
          {gameData.gameMode !== 'survivor' && playerData?.myCandy !== undefined && (
            <div className="mt-4 bg-yellow-50 rounded-xl p-3">
              <p className="text-yellow-700 font-medium">
                🍭 내 캔디: {playerData.myCandy}개
              </p>
            </div>
          )}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // 결과 화면
  if (gameData.status === 'result' && gameData.showResult) {
    const myResult = playerData?.result;
    const teacherChoice = gameData.teacherChoice;
    const myChoice = playerData?.choice;
    const betAmount = playerData?.candyBet || 0;

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-100 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-amber-800 mb-4">
            라운드 {gameData.round} 결과!
          </h1>

          {/* VS 표시 */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="text-center">
              <div className="text-6xl mb-2">{myChoice ? CHOICE_EMOJI[myChoice] : '❓'}</div>
              <p className="text-sm text-gray-600">나</p>
            </div>
            <div className="text-3xl font-bold text-gray-400">VS</div>
            <div className="text-center">
              <div className="text-6xl mb-2">{teacherChoice ? CHOICE_EMOJI[teacherChoice] : '❓'}</div>
              <p className="text-sm text-gray-600">선생님</p>
            </div>
          </div>

          {/* 결과 */}
          <div className={`text-3xl font-bold mb-4 ${getResultColor(myResult)}`}>
            {getResultText(myResult)}
          </div>

          {/* 캔디 모드일 때 결과 표시 */}
          {gameData.gameMode !== 'survivor' && (
            <div className={`rounded-xl p-4 mb-4 ${
              myResult === 'win' ? 'bg-green-50' :
              myResult === 'lose' ? 'bg-red-50' : 'bg-amber-50'
            }`}>
              {betAmount === 0 ? (
                <p className="text-gray-600 font-bold text-xl">
                  배팅 없음
                </p>
              ) : myResult === 'win' && playerData?.candyWon ? (
                <p className="text-green-700 font-bold text-xl">
                  🍭 +{playerData.candyWon} 캔디 획득!
                </p>
              ) : myResult === 'lose' ? (
                <p className="text-red-700 font-bold text-xl">
                  🍭 -{betAmount} 캔디 손실...
                </p>
              ) : (
                <p className="text-amber-700 font-bold text-xl">
                  🍭 배팅 {betAmount}개 반환
                </p>
              )}
            </div>
          )}

          {/* 서바이벌 모드에서 비김/이김 표시 */}
          {gameData.gameMode === 'survivor' && myResult !== 'lose' && (
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-green-700 font-medium">
                {myResult === 'win' ? '🎉 승리! 계속 진행합니다!' : '🤝 비겼어요! 다음 라운드로!'}
              </p>
            </div>
          )}

          <p className="text-sm text-gray-500 mt-4">
            다음 라운드를 기다려주세요...
          </p>
        </div>
      </div>
    );
  }

  // 선택 중
  if (gameData.status === 'selecting' || (gameData.status === 'result' && !gameData.showResult)) {
    const currentChoice = playerData?.choice || selectedChoice;
    const hasSubmitted = playerData?.choice !== null;
    const currentBet = playerData?.candyBet || 0;
    const isCandyMode = gameData.gameMode !== 'survivor';
    const canSelectChoice = !isCandyMode || hasBetConfirmed || noBet || hasSubmitted;

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-100 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-amber-800 mb-2">
            라운드 {gameData.round}
          </h1>

          {/* 캔디 모드 배팅 UI - 제출 전 */}
          {isCandyMode && !hasSubmitted && (
            <div className="mb-6 bg-yellow-50 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-2xl">🍭</span>
                <span className="text-yellow-700 font-bold">캔디 배팅</span>
              </div>
              {playerData?.myCandy !== undefined && (
                <p className="text-sm text-yellow-600 mb-3">
                  보유 캔디: <span className="font-bold">{playerData.myCandy}개</span>
                </p>
              )}

              {/* 배팅 미확정 상태 */}
              {!hasBetConfirmed && !noBet && (
                <>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <input
                      type="number"
                      value={candyBetInput}
                      onChange={(e) => setCandyBetInput(e.target.value)}
                      placeholder="배팅할 캔디 수"
                      min="1"
                      max={playerData?.myCandy || 999}
                      className="w-28 px-3 py-2 border-2 border-yellow-300 rounded-lg text-center font-bold text-yellow-700 focus:outline-none focus:border-yellow-500"
                    />
                    <span className="text-yellow-700 font-medium">개</span>
                  </div>
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={confirmBet}
                      className="px-4 py-2 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 transition-all"
                    >
                      🍭 배팅 확정
                    </button>
                    <button
                      onClick={selectNoBet}
                      className="px-4 py-2 bg-gray-400 text-white font-bold rounded-lg hover:bg-gray-500 transition-all"
                    >
                      배팅 안함
                    </button>
                  </div>
                  <p className="text-xs text-yellow-600 mt-3">
                    ⚠️ 배팅을 확정하거나 "배팅 안함"을 선택해야 가위바위보를 할 수 있어요!
                  </p>
                </>
              )}

              {/* 배팅 확정됨 */}
              {hasBetConfirmed && (
                <div className="bg-green-100 rounded-lg p-3">
                  <p className="text-green-700 font-bold text-lg">
                    ✅ {candyBetInput}개 배팅 확정!
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    이기면 {gameData.gameMode === 'candy15' ? '1.5배' : '1.2배'}! ({Math.round(parseInt(candyBetInput) * (gameData.gameMode === 'candy15' ? 1.5 : 1.2))}개 획득)
                  </p>
                  <button
                    onClick={() => { setHasBetConfirmed(false); }}
                    className="mt-2 text-xs text-gray-500 underline"
                  >
                    배팅 수정하기
                  </button>
                </div>
              )}

              {/* 배팅 안함 선택됨 */}
              {noBet && (
                <div className="bg-gray-100 rounded-lg p-3">
                  <p className="text-gray-600 font-bold">
                    배팅 안함 선택됨
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    이겨도 캔디를 얻을 수 없어요
                  </p>
                  <button
                    onClick={() => { setNoBet(false); }}
                    className="mt-2 text-xs text-gray-500 underline"
                  >
                    배팅하기
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 배팅 완료 표시 - 제출 후 */}
          {isCandyMode && hasSubmitted && (
            <div className="mb-4 bg-green-50 rounded-xl p-3">
              <p className="text-green-700 font-medium">
                {currentBet > 0 ? `🍭 ${currentBet}개 배팅 완료!` : '배팅 없이 참가'}
              </p>
            </div>
          )}

          <p className="text-gray-600 mb-4">
            {hasSubmitted ? '선택 완료! 결과를 기다리세요...' :
             canSelectChoice ? '가위바위보를 선택하세요!' : '먼저 배팅을 결정해주세요!'}
          </p>

          {/* 선택 버튼 */}
          <div className="flex justify-center gap-4 mb-6">
            {(['rock', 'paper', 'scissors'] as const).map((choice) => (
              <button
                key={choice}
                onClick={() => submitChoice(choice)}
                disabled={isSubmitting || hasSubmitted || !canSelectChoice}
                className={`w-24 h-24 rounded-2xl text-5xl transition-all transform
                  ${currentChoice === choice
                    ? 'bg-green-500 scale-110 shadow-lg ring-4 ring-green-300'
                    : hasSubmitted || !canSelectChoice
                      ? 'bg-gray-200 cursor-not-allowed opacity-50'
                      : 'bg-amber-100 hover:bg-amber-200 hover:scale-105 active:scale-95'
                  }`}
              >
                {CHOICE_EMOJI[choice]}
              </button>
            ))}
          </div>

          {/* 선택 상태 */}
          {currentChoice && (
            <div className={`rounded-xl p-3 ${hasSubmitted ? 'bg-green-50' : 'bg-amber-50'}`}>
              <p className={`font-medium ${hasSubmitted ? 'text-green-700' : 'text-amber-700'}`}>
                {hasSubmitted ? '✅ ' : ''}{CHOICE_NAME[currentChoice]} 선택!
              </p>
            </div>
          )}

          {/* 안내 메시지 */}
          <p className="text-sm text-gray-500 mt-4">
            {gameData.gameMode === 'survivor'
              ? '🏆 최후의 1인이 될 때까지 계속됩니다!'
              : `🍭 이기면 ${gameData.gameMode === 'candy15' ? '1.5배' : '1.2배'} 캔디!`}
          </p>
        </div>
      </div>
    );
  }

  // 게임 종료
  if (gameData.status === 'finished') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-100 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="text-6xl mb-4">🏁</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">게임 종료!</h1>
          <p className="text-gray-600 mb-4">재미있었나요?</p>
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

  // 기본 화면
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
        <div className="text-6xl mb-4">✊✋✌️</div>
        <h1 className="text-xl font-bold text-gray-800">게임 진행 중...</h1>
      </div>
    </div>
  );
}

export default RockPaperScissors;
