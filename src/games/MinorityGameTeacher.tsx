// src/games/MinorityGameTeacher.tsx
// 소수결게임 - 교사용 게임 관리 페이지

import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, collection, getDocs, deleteDoc, setDoc } from 'firebase/firestore';

// 밸런스 게임 질문 목록 (학생에게 적합한 내용)
const BALANCE_QUESTIONS = [
  { text: '여름 vs 겨울, 더 좋은 계절은?', optionA: '여름', optionB: '겨울' },
  { text: '아침형 인간 vs 저녁형 인간?', optionA: '아침형', optionB: '저녁형' },
  { text: '단짠 vs 짠단, 더 맛있는 조합은?', optionA: '단짠', optionB: '짠단' },
  { text: '치킨 vs 피자, 오늘 저녁은?', optionA: '치킨', optionB: '피자' },
  { text: '산 vs 바다, 여행 갈 곳은?', optionA: '산', optionB: '바다' },
  { text: '떡볶이 vs 순대, 더 좋아하는 건?', optionA: '떡볶이', optionB: '순대' },
  { text: '짜장면 vs 짬뽕, 오늘의 선택은?', optionA: '짜장면', optionB: '짬뽕' },
  { text: '고양이 vs 강아지, 반려동물로 키운다면?', optionA: '고양이', optionB: '강아지' },
  { text: '책 vs 영화, 이야기를 접하는 방식은?', optionA: '책', optionB: '영화' },
  { text: '혼밥 vs 같이 먹기, 더 편한 건?', optionA: '혼밥', optionB: '같이 먹기' },
  { text: '민트초코 vs 반민초, 당신의 취향은?', optionA: '민트초코 좋아', optionB: '민트초코 싫어' },
  { text: '탕수육 부먹 vs 찍먹?', optionA: '부먹', optionB: '찍먹' },
  { text: '비 오는 날 vs 맑은 날?', optionA: '비 오는 날', optionB: '맑은 날' },
  { text: '엄마 vs 아빠, 용돈 더 잘 주시는 분?', optionA: '엄마', optionB: '아빠' },
  { text: '100만원 받기 vs 1% 확률로 1억 받기?', optionA: '확실한 100만원', optionB: '1% 도전' },
  { text: '시간을 멈추는 능력 vs 하늘을 나는 능력?', optionA: '시간 정지', optionB: '비행' },
  { text: '과거로 가기 vs 미래로 가기?', optionA: '과거', optionB: '미래' },
  { text: '투명인간 vs 독심술?', optionA: '투명인간', optionB: '독심술' },
  { text: '매일 같은 음식 vs 매일 다른 랜덤 음식?', optionA: '같은 음식', optionB: '랜덤 음식' },
  { text: '친구 10명 vs 진짜 친구 1명?', optionA: '10명', optionB: '진짜 1명' },
  { text: '스마트폰 없이 1주일 vs 샤워 없이 1주일?', optionA: '폰 없이', optionB: '샤워 없이' },
  { text: '아이스크림 vs 케이크?', optionA: '아이스크림', optionB: '케이크' },
  { text: '라면 vs 밥?', optionA: '라면', optionB: '밥' },
  { text: '유튜브 vs 틱톡?', optionA: '유튜브', optionB: '틱톡' },
  { text: '혼자 여행 vs 친구와 여행?', optionA: '혼자', optionB: '친구와' },
];

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
  usedQuestions: number[];
  createdAt: any;
}

interface PlayerData {
  code: string;
  name: string;
  joinedAt: any;
  isAlive: boolean;
  currentChoice: 'A' | 'B' | null;
  survivedRounds: number;
}

export function MinorityGameTeacher() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  // 게임 데이터 구독
  useEffect(() => {
    if (!gameId) {
      console.error('[MinorityGameTeacher] No gameId in URL');
      return;
    }

    console.log('[MinorityGameTeacher] Subscribing to game:', gameId);
    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(
      gameRef,
      (snapshot) => {
        if (snapshot.exists()) {
          console.log('[MinorityGameTeacher] Game data updated');
          setGameData(snapshot.data() as GameData);
        } else {
          alert('게임이 삭제되었습니다.');
          window.close();
        }
      },
      (error) => {
        console.error('[MinorityGameTeacher] Game subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [gameId]);

  // 플레이어 목록 구독
  useEffect(() => {
    if (!gameId) return;

    console.log('[MinorityGameTeacher] Subscribing to players for game:', gameId);
    const playersRef = collection(db, 'games', gameId, 'players');
    const unsubscribe = onSnapshot(
      playersRef,
      (snapshot) => {
        const playerList: PlayerData[] = [];
        snapshot.forEach((doc) => {
          playerList.push({ code: doc.id, ...doc.data() } as PlayerData);
        });
        playerList.sort((a, b) => {
          if (a.isAlive && !b.isAlive) return -1;
          if (!a.isAlive && b.isAlive) return 1;
          return b.survivedRounds - a.survivedRounds;
        });
        console.log('[MinorityGameTeacher] Players updated:', playerList.length);
        setPlayers(playerList);
      },
      (error) => {
        console.error('[MinorityGameTeacher] Players subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [gameId]);

  // 카운트다운 처리
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      calculateResult();
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // 다음 질문 가져오기
  const getNextQuestion = () => {
    if (!gameData) return null;
    const usedQuestions = gameData.usedQuestions || [];
    const available = BALANCE_QUESTIONS.filter((_, i) => !usedQuestions.includes(i));
    if (available.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * available.length);
    return {
      question: available[randomIndex],
      index: BALANCE_QUESTIONS.indexOf(available[randomIndex])
    };
  };

  // 새 라운드 시작
  const startRound = async () => {
    if (!gameId || !gameData) return;

    const next = getNextQuestion();
    if (!next) {
      alert('모든 질문을 사용했습니다!');
      return;
    }

    try {
      // 모든 플레이어 선택 초기화
      const playersRef = collection(db, 'games', gameId, 'players');
      const playersSnap = await getDocs(playersRef);
      for (const playerDoc of playersSnap.docs) {
        if (playerDoc.data().isAlive) {
          await updateDoc(playerDoc.ref, { currentChoice: null });
        }
      }

      // 게임 상태 업데이트
      await updateDoc(doc(db, 'games', gameId), {
        status: 'question',
        currentRound: (gameData.currentRound || 0) + 1,
        currentQuestion: {
          text: next.question.text,
          optionA: next.question.optionA,
          optionB: next.question.optionB
        },
        usedQuestions: [...(gameData.usedQuestions || []), next.index]
      });
    } catch (error) {
      console.error('Failed to start round:', error);
      alert('라운드 시작에 실패했습니다.');
    }
  };

  // 투표 마감 (카운트다운 시작)
  const closeVoting = () => {
    setCountdown(3);
  };

  // 결과 계산
  const calculateResult = async () => {
    if (!gameId || !gameData || !gameData.currentQuestion) return;

    try {
      const alivePlayers = players.filter(p => p.isAlive);
      const countA = alivePlayers.filter(p => p.currentChoice === 'A').length;
      const countB = alivePlayers.filter(p => p.currentChoice === 'B').length;

      // 동점이면 랜덤 또는 둘 다 탈락 방지
      let winningChoice: 'A' | 'B';
      if (countA === countB) {
        winningChoice = Math.random() < 0.5 ? 'A' : 'B';
      } else {
        winningChoice = countA < countB ? 'A' : 'B';
      }

      // 탈락자 처리
      const eliminated: string[] = [];
      const playersRef = collection(db, 'games', gameId, 'players');
      const playersSnap = await getDocs(playersRef);

      for (const playerDoc of playersSnap.docs) {
        const data = playerDoc.data();
        if (data.isAlive) {
          if (data.currentChoice !== winningChoice) {
            await updateDoc(playerDoc.ref, {
              isAlive: false,
              survivedRounds: gameData.currentRound
            });
            eliminated.push(data.name);
          } else {
            await updateDoc(playerDoc.ref, {
              survivedRounds: gameData.currentRound
            });
          }
        }
      }

      // 라운드 결과 저장
      await setDoc(doc(db, 'games', gameId, 'rounds', `round_${gameData.currentRound}`), {
        question: gameData.currentQuestion.text,
        optionA: gameData.currentQuestion.optionA,
        optionB: gameData.currentQuestion.optionB,
        countA,
        countB,
        winningChoice,
        eliminated
      });

      // 생존자 수 확인
      const survivors = alivePlayers.filter(p => p.currentChoice === winningChoice).length;

      if (survivors <= 2) {
        // 게임 종료
        await updateDoc(doc(db, 'games', gameId), {
          status: 'finished'
        });
      } else {
        // 결과 표시
        await updateDoc(doc(db, 'games', gameId), {
          status: 'result'
        });
      }
    } catch (error) {
      console.error('Failed to calculate result:', error);
      alert('결과 계산에 실패했습니다.');
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

      const roundsRef = collection(db, 'games', gameId, 'rounds');
      const roundsSnap = await getDocs(roundsRef);
      for (const roundDoc of roundsSnap.docs) {
        await deleteDoc(roundDoc.ref);
      }

      await deleteDoc(doc(db, 'games', gameId));
      window.close();
    } catch (error) {
      console.error('Failed to delete game:', error);
    }
  };

  // 유효하지 않은 접근
  if (!gameId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-100 flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="text-6xl mb-4 animate-bounce">🎯</div>
          <h1 className="text-xl font-bold text-gray-800">게임 로딩 중...</h1>
        </div>
      </div>
    );
  }

  const alivePlayers = players.filter(p => p.isAlive);
  const votedCount = alivePlayers.filter(p => p.currentChoice !== null).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-600 to-purple-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-4 text-center">
          <h1 className="text-3xl font-bold text-pink-800 mb-2">🎯 소수결 게임</h1>
          <p className="text-gray-600">{gameData.className || '게임'}</p>
          <div className="mt-3 flex justify-center gap-4">
            <span className={`px-4 py-2 rounded-full text-white font-bold ${
              gameData.status === 'waiting' ? 'bg-amber-500' :
              gameData.status === 'question' ? 'bg-green-500' :
              gameData.status === 'result' ? 'bg-blue-500' : 'bg-gray-500'
            }`}>
              {gameData.status === 'waiting' ? '⏳ 대기중' :
               gameData.status === 'question' ? `🎮 ${gameData.currentRound}라운드` :
               gameData.status === 'result' ? '📊 결과' : '🏁 종료'}
            </span>
            <span className="px-4 py-2 bg-pink-100 text-pink-700 rounded-full font-bold">
              👥 생존: {alivePlayers.length}명
            </span>
          </div>
        </div>

        {/* 카운트다운 오버레이 */}
        {countdown !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-12 text-center">
              <p className="text-xl text-gray-600 mb-4">투표 마감!</p>
              <div className="text-8xl font-bold text-pink-600 animate-pulse">{countdown}</div>
            </div>
          </div>
        )}

        {/* 현재 질문 */}
        {gameData.status === 'question' && gameData.currentQuestion && (
          <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
            <h2 className="font-bold text-lg text-center text-gray-800 mb-3">
              {gameData.currentQuestion.text}
            </h2>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-pink-100 rounded-xl p-4">
                <p className="font-bold text-pink-800">{gameData.currentQuestion.optionA}</p>
                <p className="text-2xl font-bold mt-2">
                  {alivePlayers.filter(p => p.currentChoice === 'A').length}명
                </p>
              </div>
              <div className="bg-purple-100 rounded-xl p-4">
                <p className="font-bold text-purple-800">{gameData.currentQuestion.optionB}</p>
                <p className="text-2xl font-bold mt-2">
                  {alivePlayers.filter(p => p.currentChoice === 'B').length}명
                </p>
              </div>
            </div>
            <p className="text-center text-gray-500 mt-3">
              투표: {votedCount} / {alivePlayers.length}명
            </p>
          </div>
        )}

        {/* 참가자 목록 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
          <h2 className="font-bold text-xl text-gray-800 mb-3">
            👥 참가자 ({players.length}명)
          </h2>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {players.map((player) => (
              <div
                key={player.code}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  player.isAlive ? 'bg-green-50' : 'bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{player.isAlive ? '💚' : '💀'}</span>
                  <span className={player.isAlive ? 'font-medium' : 'text-gray-400 line-through'}>
                    {player.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {gameData.status === 'question' && player.isAlive && (
                    <span className={player.currentChoice ? 'text-green-600' : 'text-amber-600'}>
                      {player.currentChoice ? '✅ 투표완료' : '⏳ 대기중'}
                    </span>
                  )}
                  <span className="text-gray-500">R{player.survivedRounds}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 컨트롤 버튼 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex gap-3 flex-wrap">
            {gameData.status === 'waiting' && (
              <>
                <button
                  onClick={startRound}
                  disabled={alivePlayers.length < 3}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg ${
                    alivePlayers.length >= 3
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
            {gameData.status === 'question' && (
              <>
                <button
                  onClick={closeVoting}
                  className="flex-1 py-4 rounded-xl bg-amber-500 text-white font-bold text-lg hover:bg-amber-600"
                >
                  ⏱️ 투표 마감
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
                  onClick={startRound}
                  className="flex-1 py-4 rounded-xl bg-green-500 text-white font-bold text-lg hover:bg-green-600"
                >
                  ➡️ 다음 라운드
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

        {/* 안내 */}
        <div className="mt-4 text-center text-white/80 text-sm">
          {gameData.status === 'waiting' && <p>3명 이상이 참가하면 시작할 수 있어요</p>}
          {gameData.status === 'question' && <p>모두 투표하면 마감 버튼을 눌러주세요</p>}
          {gameData.status === 'result' && <p>결과 확인 후 다음 라운드를 시작하세요</p>}
          {gameData.status === 'finished' && <p>게임이 종료되었습니다!</p>}
        </div>
      </div>
    </div>
  );
}

export default MinorityGameTeacher;
