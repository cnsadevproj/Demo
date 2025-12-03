// src/games/RockPaperScissorsTeacher.tsx
// 가위바위보 게임 - 교사용 게임 관리 페이지

import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, collection, getDocs, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';

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
  code: string;
  name: string;
  choice: Choice;
  eliminated: boolean;
  candyBet: number;
  result: PlayerResult;
  candyWon: number;
}

interface StudentData {
  name: string;
  number: number;
  code: string;
  jelly?: number;
  cookie?: number;
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

// 가위바위보 결과 계산
function getResult(playerChoice: Choice, teacherChoice: Choice): PlayerResult {
  if (!playerChoice || !teacherChoice) return null;
  if (playerChoice === teacherChoice) return 'draw';

  if (
    (playerChoice === 'rock' && teacherChoice === 'scissors') ||
    (playerChoice === 'paper' && teacherChoice === 'rock') ||
    (playerChoice === 'scissors' && teacherChoice === 'paper')
  ) {
    return 'win';
  }
  return 'lose';
}

export function RockPaperScissorsTeacher() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [teacherChoice, setTeacherChoice] = useState<Choice>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTeacherChoice, setShowTeacherChoice] = useState(false);
  const [drawSurvives, setDrawSurvives] = useState(false); // 비겨도 생존 토글

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

      // 학생 정보 새로고침
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
      console.error('[RPSTeacher] No gameId in URL');
      return;
    }

    console.log('[RPSTeacher] Subscribing to game:', gameId);
    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(
      gameRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as GameData;
          console.log('[RPSTeacher] Game data updated');
          setGameData(data);
          if (data.teacherChoice) {
            setTeacherChoice(data.teacherChoice);
          }
        } else {
          alert('게임이 삭제되었습니다.');
          window.close();
        }
      },
      (error) => {
        console.error('[RPSTeacher] Game subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [gameId]);

  // 플레이어 목록 구독
  useEffect(() => {
    if (!gameId) return;

    console.log('[RPSTeacher] Subscribing to players for game:', gameId);
    const playersRef = collection(db, 'games', gameId, 'players');
    const unsubscribe = onSnapshot(
      playersRef,
      (snapshot) => {
        const playerList: PlayerData[] = [];
        snapshot.forEach((doc) => {
          playerList.push({ code: doc.id, ...doc.data() } as PlayerData);
        });
        // 이름순 정렬
        playerList.sort((a, b) => a.name.localeCompare(b.name));
        console.log('[RPSTeacher] Players updated:', playerList.length);
        setPlayers(playerList);
      },
      (error) => {
        console.error('[RPSTeacher] Players subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [gameId]);

  // 게임 시작 (선택 단계로)
  const startRound = async () => {
    if (!gameId || !teacherChoice || !gameData) return;
    setIsProcessing(true);

    try {
      const gameRef = doc(db, 'games', gameId);
      const gameSnap = await getDoc(gameRef);
      const currentRound = gameSnap.data()?.round || 0;

      // 게임 상태 업데이트
      await updateDoc(gameRef, {
        status: 'selecting',
        teacherChoice: teacherChoice,
        showResult: false,
        round: currentRound + 1,
      });

      // 모든 플레이어의 선택 초기화 및 캔디 잔액 갱신
      const batch = writeBatch(db);
      const playersRef = collection(db, 'games', gameId, 'players');
      const playersSnap = await getDocs(playersRef);

      // 캔디 모드일 때 각 플레이어의 최신 캔디 잔액 조회
      const isCandyMode = gameData.gameMode !== 'survivor';

      for (const playerDoc of playersSnap.docs) {
        const updateData: any = {
          choice: null,
          result: null,
          candyBet: 0,
          candyWon: 0,
        };

        // 캔디 모드일 때 최신 잔액 갱신
        if (isCandyMode) {
          try {
            const studentRef = doc(db, 'teachers', gameData.teacherId, 'students', playerDoc.id);
            const studentSnap = await getDoc(studentRef);
            if (studentSnap.exists()) {
              const studentData = studentSnap.data();
              updateData.myCandy = studentData.jelly ?? studentData.cookie ?? 0;
            }
          } catch (err) {
            console.error('Failed to fetch student candy:', playerDoc.id, err);
          }
        }

        batch.update(playerDoc.ref, updateData);
      }

      await batch.commit();
      setShowTeacherChoice(false);
    } catch (error) {
      console.error('Failed to start round:', error);
      alert('라운드 시작에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 결과 계산 및 표시
  const showResults = async () => {
    if (!gameId || !gameData) return;
    setIsProcessing(true);

    try {
      const batch = writeBatch(db);
      const playersRef = collection(db, 'games', gameId, 'players');
      const playersSnap = await getDocs(playersRef);

      let remainingPlayers = 0;
      let winnerId: string | null = null;

      // 캔디 업데이트를 위한 데이터 수집
      const candyUpdates: { studentCode: string; change: number }[] = [];

      playersSnap.forEach((playerDoc) => {
        const player = playerDoc.data() as PlayerData;
        if (player.eliminated) return;

        const result = getResult(player.choice, gameData.teacherChoice);
        let updateData: any = { result };

        if (gameData.gameMode === 'survivor') {
          // 서바이벌 모드: 진 사람 탈락 (drawSurvives 옵션에 따라 무승부 처리)
          if (result === 'lose' || (result === 'draw' && !drawSurvives)) {
            updateData.eliminated = true;
          } else {
            remainingPlayers++;
            winnerId = playerDoc.id;
          }
        } else {
          // 캔디 모드: 배팅 시 이미 차감됨
          // - 승리: 배팅금 * 배수 지급
          // - 패배: 이미 차감됨 (추가 처리 없음)
          // - 무승부: 배팅금 반환
          if (result === 'win' && player.candyBet > 0) {
            const multiplier = gameData.gameMode === 'candy15' ? 1.5 : 1.2;
            const candyWon = Math.round(player.candyBet * multiplier);
            updateData.candyWon = candyWon;
            // 승리 시 배팅금 * 배수 지급 (배팅 시 이미 차감됨)
            candyUpdates.push({ studentCode: playerDoc.id, change: candyWon });
          } else if (result === 'lose' && player.candyBet > 0) {
            updateData.candyWon = 0;
            // 패배 시 추가 차감 없음 (배팅 시 이미 차감됨)
          } else if (result === 'draw' && player.candyBet > 0) {
            // 무승부 시 배팅금 반환
            updateData.candyWon = 0;
            candyUpdates.push({ studentCode: playerDoc.id, change: player.candyBet });
          } else {
            updateData.candyWon = 0;
          }
        }

        batch.update(playerDoc.ref, updateData);
      });

      // 게임 상태 업데이트
      const gameRef = doc(db, 'games', gameId);
      batch.update(gameRef, {
        status: 'result',
        showResult: true,
      });

      await batch.commit();

      // 캔디 모드: 실제 학생 캔디 잔액 업데이트
      if (gameData.gameMode !== 'survivor' && candyUpdates.length > 0) {
        for (const update of candyUpdates) {
          try {
            const studentRef = doc(db, 'teachers', gameData.teacherId, 'students', update.studentCode);
            const studentSnap = await getDoc(studentRef);
            if (studentSnap.exists()) {
              const studentData = studentSnap.data();
              // jelly 또는 cookie 필드 사용 (jelly 우선)
              const currentCandy = studentData.jelly ?? studentData.cookie ?? 0;
              const newCandy = Math.max(0, currentCandy + update.change); // 음수 방지
              await updateDoc(studentRef, {
                jelly: newCandy
              });
            }
          } catch (err) {
            console.error('Failed to update student candy:', update.studentCode, err);
          }
        }
      }

      // 서바이벌 모드에서 1명만 남으면 게임 종료
      if (gameData.gameMode === 'survivor' && remainingPlayers <= 1) {
        await updateDoc(gameRef, { status: 'finished' });
      }
    } catch (error) {
      console.error('Failed to show results:', error);
      alert('결과 표시에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 다음 라운드 준비
  const prepareNextRound = async () => {
    if (!gameId) return;
    setIsProcessing(true);

    try {
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        status: 'waiting',
        teacherChoice: null,
        showResult: false,
      });

      setTeacherChoice(null);
      setShowTeacherChoice(false);
    } catch (error) {
      console.error('Failed to prepare next round:', error);
    } finally {
      setIsProcessing(false);
    }
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
      const playersRef = collection(db, 'games', gameId, 'players');
      const playersSnap = await getDocs(playersRef);
      for (const playerDoc of playersSnap.docs) {
        await deleteDoc(playerDoc.ref);
      }
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
      <div className="min-h-screen bg-gradient-to-b from-amber-100 to-orange-100 flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-gradient-to-b from-amber-100 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="text-6xl mb-4 animate-bounce">✊✋✌️</div>
          <h1 className="text-xl font-bold text-gray-800">게임 로딩 중...</h1>
        </div>
      </div>
    );
  }

  const activePlayers = players.filter(p => !p.eliminated);
  const playersWithChoice = activePlayers.filter(p => p.choice !== null);
  const modeText = gameData.gameMode === 'survivor'
    ? '최후의 승자를 가려라!'
    : gameData.gameMode === 'candy15'
      ? '캔디 1.5배 이벤트!'
      : '캔디 1.2배 이벤트!';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-600 to-orange-700 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-4 text-center">
          <h1 className="text-3xl font-bold text-amber-800 mb-2">✊✋✌️ 가위바위보</h1>
          <p className="text-gray-600">{gameData.className || '게임'}</p>
          <p className="text-amber-600 font-medium mt-1">{modeText}</p>

          {/* 상태 배지 */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className={`px-4 py-2 rounded-full text-white font-bold ${
              gameData.status === 'waiting' ? 'bg-amber-500' :
              gameData.status === 'selecting' ? 'bg-blue-500' :
              gameData.status === 'result' ? 'bg-green-500' : 'bg-gray-500'
            }`}>
              {gameData.status === 'waiting' ? `⏳ 라운드 ${gameData.round + 1} 준비` :
               gameData.status === 'selecting' ? `🎮 라운드 ${gameData.round} 진행중` :
               gameData.status === 'result' ? `📊 라운드 ${gameData.round} 결과` : '🏁 종료'}
            </span>
          </div>
        </div>

        {/* 교사 선택 영역 */}
        {gameData.status === 'waiting' && (
          <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
            <h2 className="font-bold text-lg text-gray-800 mb-4 text-center">🎯 나의 선택 (학생에게 안 보임)</h2>
            <div className="flex justify-center gap-4 mb-4">
              {(['rock', 'paper', 'scissors'] as const).map((choice) => (
                <button
                  key={choice}
                  onClick={() => setTeacherChoice(choice)}
                  className={`w-20 h-20 rounded-2xl text-4xl transition-all transform
                    ${teacherChoice === choice
                      ? 'bg-amber-500 scale-110 shadow-lg ring-4 ring-amber-300'
                      : 'bg-gray-100 hover:bg-gray-200 hover:scale-105'
                    }`}
                >
                  {CHOICE_EMOJI[choice]}
                </button>
              ))}
              {/* 랜덤 버튼 */}
              <button
                onClick={() => {
                  const choices: Choice[] = ['rock', 'paper', 'scissors'];
                  const randomChoice = choices[Math.floor(Math.random() * 3)];
                  setTeacherChoice(randomChoice);
                }}
                className="w-20 h-20 rounded-2xl text-4xl transition-all transform bg-purple-100 hover:bg-purple-200 hover:scale-105"
              >
                🎲
              </button>
            </div>
            {teacherChoice && (
              <p className="text-center text-amber-600 font-medium">
                {CHOICE_NAME[teacherChoice]} 선택됨!
              </p>
            )}

            {/* 서바이벌 모드: 비겨도 생존 토글 */}
            {gameData.gameMode === 'survivor' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-gray-600">생존 조건:</span>
                  <button
                    onClick={() => setDrawSurvives(!drawSurvives)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      drawSurvives
                        ? 'bg-green-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {drawSurvives ? '🤝 비겨도 생존' : '✊ 이겨야만 생존'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 선택 진행 중일 때 교사 선택 표시 (토글) */}
        {(gameData.status === 'selecting' || gameData.status === 'result') && (
          <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-700">내 선택</span>
              <button
                onClick={() => setShowTeacherChoice(!showTeacherChoice)}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  showTeacherChoice
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {showTeacherChoice ? `${CHOICE_EMOJI[gameData.teacherChoice!]} ${CHOICE_NAME[gameData.teacherChoice!]}` : '🔒 보기'}
              </button>
            </div>
          </div>
        )}

        {/* 참가자 목록 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-xl text-gray-800">
              👥 참가자 ({activePlayers.length}명)
            </h2>
            {gameData.status === 'selecting' && (
              <span className="text-blue-600 font-medium">
                ✅ 선택: {playersWithChoice.length}/{activePlayers.length}
              </span>
            )}
          </div>

          {players.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">👀</div>
              <p>아직 참가한 학생이 없습니다</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {players.map((player) => {
                let bgColor = 'bg-gray-100';
                let textColor = 'text-gray-700';
                let icon = '';

                if (player.eliminated) {
                  bgColor = 'bg-gray-300';
                  textColor = 'text-gray-500 line-through';
                  icon = '❌';
                } else if (gameData.status === 'selecting') {
                  if (player.choice) {
                    bgColor = 'bg-green-100';
                    textColor = 'text-green-700';
                    icon = '✅';
                  } else {
                    bgColor = 'bg-amber-100';
                    textColor = 'text-amber-700';
                    icon = '⏳';
                  }
                } else if (gameData.status === 'result' && gameData.showResult) {
                  if (player.result === 'win') {
                    bgColor = 'bg-green-200';
                    textColor = 'text-green-800';
                    icon = '🎉';
                  } else if (player.result === 'lose') {
                    bgColor = 'bg-red-200';
                    textColor = 'text-red-800';
                    icon = '😢';
                  } else if (player.result === 'draw') {
                    bgColor = 'bg-amber-200';
                    textColor = 'text-amber-800';
                    icon = '🤝';
                  }
                }

                const isCandyMode = gameData.gameMode !== 'survivor';
                const showBet = isCandyMode && player.candyBet > 0;
                const showChoice = gameData.status === 'selecting' && player.choice;

                return (
                  <div
                    key={player.code}
                    onClick={() => openStudentModal(player)}
                    className={`px-3 py-2 rounded-lg ${bgColor} ${textColor} text-sm font-medium flex items-center gap-1 cursor-pointer hover:ring-2 hover:ring-amber-400 transition-all`}
                  >
                    {icon && <span>{icon}</span>}
                    <span>{player.name}</span>
                    {/* 선택 중: 선택 표시 */}
                    {showChoice && (
                      <span className="ml-1">{CHOICE_EMOJI[player.choice!]}</span>
                    )}
                    {/* 캔디 모드: 배팅 금액 표시 */}
                    {showBet && (
                      <span className="ml-1 text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded-full">
                        🍭{player.candyBet}
                      </span>
                    )}
                    {/* 배팅 안함 표시 */}
                    {isCandyMode && !showBet && player.choice && (
                      <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                        무배팅
                      </span>
                    )}
                    {/* 결과 화면: 선택 표시 */}
                    {gameData.status === 'result' && gameData.showResult && player.choice && (
                      <span className="ml-1">{CHOICE_EMOJI[player.choice]}</span>
                    )}
                    {/* 결과 화면: 캔디 획득/손실 */}
                    {gameData.status === 'result' && gameData.showResult && isCandyMode && player.candyBet > 0 && (
                      <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                        player.result === 'win' ? 'bg-green-300 text-green-800' :
                        player.result === 'lose' ? 'bg-red-300 text-red-800' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {player.result === 'win' ? `+${player.candyWon}` :
                         player.result === 'lose' ? `-${player.candyBet}` : '±0'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 결과 요약 (결과 화면일 때) */}
        {gameData.status === 'result' && gameData.showResult && (
          <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
            <h2 className="font-bold text-lg text-gray-800 mb-3">📊 라운드 {gameData.round} 결과</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 rounded-xl p-3">
                <div className="text-2xl mb-1">🎉</div>
                <div className="text-green-600 font-bold">
                  {players.filter(p => !p.eliminated && p.result === 'win').length}명
                </div>
                <div className="text-sm text-gray-500">승리</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <div className="text-2xl mb-1">🤝</div>
                <div className="text-amber-600 font-bold">
                  {players.filter(p => !p.eliminated && p.result === 'draw').length}명
                </div>
                <div className="text-sm text-gray-500">무승부</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <div className="text-2xl mb-1">😢</div>
                <div className="text-red-600 font-bold">
                  {players.filter(p => p.result === 'lose').length}명
                </div>
                <div className="text-sm text-gray-500">패배</div>
              </div>
            </div>

            {/* 서바이벌 모드에서 남은 인원 표시 */}
            {gameData.gameMode === 'survivor' && (
              <div className="mt-4 text-center">
                <p className="text-gray-600">
                  남은 참가자: <span className="font-bold text-amber-600">{activePlayers.length}명</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* 컨트롤 버튼 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex gap-3">
            {gameData.status === 'waiting' && (
              <>
                <button
                  onClick={startRound}
                  disabled={!teacherChoice || players.length === 0 || isProcessing}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                    teacherChoice && players.length > 0 && !isProcessing
                      ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? '처리중...' : '🎮 라운드 시작!'}
                </button>
                <button
                  onClick={deleteGame}
                  className="px-6 py-4 rounded-xl bg-red-100 text-red-600 font-bold hover:bg-red-200"
                >
                  삭제
                </button>
              </>
            )}
            {gameData.status === 'selecting' && (
              <>
                <button
                  onClick={showResults}
                  disabled={isProcessing}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                    !isProcessing
                      ? 'bg-green-500 text-white hover:bg-green-600 active:scale-95'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? '처리중...' : '✊✋✌️ 가위바위보!'}
                </button>
                <button
                  onClick={endGame}
                  className="px-6 py-4 rounded-xl bg-gray-200 text-gray-600 font-bold hover:bg-gray-300"
                >
                  종료
                </button>
              </>
            )}
            {gameData.status === 'result' && (
              <>
                <button
                  onClick={prepareNextRound}
                  disabled={isProcessing}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                    !isProcessing
                      ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? '처리중...' : '➡️ 다음 라운드'}
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
            <p>가위/바위/보 중 하나를 선택하고 라운드를 시작하세요</p>
          )}
          {gameData.status === 'selecting' && (
            <p>모든 학생이 선택하지 않아도 진행할 수 있어요 (미선택자는 패배 처리)</p>
          )}
          {gameData.status === 'result' && (
            <p>결과를 확인하고 다음 라운드를 진행하세요</p>
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
            {/* 헤더 */}
            <div className="p-4 border-b flex items-center justify-between">
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

            {/* 현재 캔디 */}
            <div className="p-4 bg-pink-50 text-center">
              <p className="text-pink-600 font-bold text-3xl">
                {studentData ? (studentData.jelly ?? studentData.cookie ?? 0) : '...'}
              </p>
              <p className="text-sm text-pink-700">🍭 캔디</p>
            </div>

            {/* 캔디 부여 */}
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

export default RockPaperScissorsTeacher;
