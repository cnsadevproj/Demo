// src/games/BulletDodge.tsx
// 총알피하기 - 학생용 게임 플레이 페이지
// 우주선을 조종해 총알을 피하는 서바이벌 게임

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface GameData {
  teacherId: string;
  classId: string;
  className?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  speed: number;
  direction: 'left' | 'right' | 'top' | 'bottom';
}

const GAME_WIDTH = 360;
const GAME_HEIGHT = 600;
const PLAYER_SIZE = 16; // 작은 점 플레이어
const BULLET_SIZE = 10; // 총알 시각적 크기
const BULLET_HITBOX = 4; // 총알 히트박스 (시각적 크기보다 작음)
const INITIAL_BULLET_INTERVAL = 1000; // 처음엔 1초마다 총알 생성 (느리게 시작)
const MIN_BULLET_INTERVAL = 100; // 최소 0.1초
const BULLET_SPEED_INCREASE = 0.2; // 시간에 따라 속도 증가
const MAX_SIMULTANEOUS_BULLETS = 7; // 최대 동시 생성 총알 수 (18초 기준)
const STARTING_BULLETS = 1; // 시작 시 동시 총알 수 (1개로 시작)
const MAX_DIFFICULTY_TIME = 18; // 난이도 증가 최대 시간 (초) - 이후 고정

export function BulletDodge() {
  // URL에서 파라미터 추출
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');
  const studentCode = params.get('studentCode');
  const studentName = params.get('studentName');
  const testMode = params.get('testMode') === 'true';

  // 테스트 모드에서는 바로 playing 상태로 시작
  const [gameData, setGameData] = useState<GameData | null>(testMode ? {
    teacherId: 'test',
    classId: 'test',
    status: 'playing',
    createdAt: new Date()
  } : null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [closeCountdown, setCloseCountdown] = useState<number | null>(null);

  // 게임 상태
  const [playerX, setPlayerX] = useState(GAME_WIDTH / 2 - PLAYER_SIZE / 2);
  const [playerY, setPlayerY] = useState(GAME_HEIGHT / 2 - PLAYER_SIZE / 2);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const bulletIdRef = useRef(0);
  const gameLoopRef = useRef<number | null>(null);
  const bulletSpawnRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  // 에러 상태
  const [error, setError] = useState<string | null>(null);

  // 브라우저 스크롤 비활성화 (모바일 터치 스크롤 방지)
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
    };

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  // 게임 데이터 구독 (테스트 모드에서는 스킵)
  useEffect(() => {
    // 테스트 모드에서는 Firebase 구독 스킵
    if (testMode) return;

    if (!gameId) {
      setError('게임 ID가 없습니다.');
      return;
    }

    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GameData;
        setGameData(data);

        // 게임이 종료되면 카운트다운 시작
        if (data.status === 'finished' && closeCountdown === null) {
          setCloseCountdown(5);
        }
      } else {
        setError('게임을 찾을 수 없습니다.');
      }
    });

    return () => unsubscribe();
  }, [gameId, closeCountdown, testMode]);

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

  // 이전 최고 점수 로드 (테스트 모드에서는 스킵)
  useEffect(() => {
    if (testMode) return;

    const loadHighScore = async () => {
      if (!gameId || !studentCode) return;

      try {
        const playerRef = doc(db, 'games', gameId, 'players', studentCode);
        const playerDoc = await getDoc(playerRef);
        if (playerDoc.exists()) {
          const data = playerDoc.data();
          if (data.highScore) {
            setHighScore(data.highScore);
          }
        }
      } catch (error) {
        console.error('Failed to load high score:', error);
      }
    };

    loadHighScore();
  }, [gameId, studentCode, testMode]);

  // 점수 저장 (테스트 모드에서는 로컬에서만 처리)
  const saveScore = useCallback(async (finalScore: number) => {
    // 테스트 모드에서는 로컬에서만 최고 점수 업데이트
    if (testMode) {
      if (finalScore > highScore) {
        setHighScore(finalScore);
      }
      return;
    }

    if (!gameId || !studentCode || !studentName) return;

    try {
      const playerRef = doc(db, 'games', gameId, 'players', studentCode);
      const playerDoc = await getDoc(playerRef);

      const currentHighScore = playerDoc.exists() ? (playerDoc.data().highScore || 0) : 0;
      const newHighScore = Math.max(currentHighScore, finalScore);

      await setDoc(playerRef, {
        name: studentName,
        lastScore: finalScore,
        highScore: newHighScore,
        lastPlayedAt: serverTimestamp()
      }, { merge: true });

      if (finalScore > highScore) {
        setHighScore(finalScore);
      }
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  }, [gameId, studentCode, studentName, highScore, testMode]);

  // 충돌 감지 (원형 충돌 - 히트박스 기반)
  const checkCollision = useCallback((playerPosX: number, playerPosY: number, bullet: Bullet) => {
    // 플레이어 중심 (히트박스는 시각적 크기보다 약간 작음)
    const playerCenterX = playerPosX + PLAYER_SIZE / 2;
    const playerCenterY = playerPosY + PLAYER_SIZE / 2;
    const playerRadius = PLAYER_SIZE / 2 - 2; // 플레이어 히트박스도 약간 줄임

    // 총알 중심 (히트박스는 시각적 크기보다 훨씬 작음)
    const bulletCenterX = bullet.x + BULLET_SIZE / 2;
    const bulletCenterY = bullet.y + BULLET_SIZE / 2;
    const bulletRadius = BULLET_HITBOX / 2; // 작은 히트박스 사용

    // 원과 원의 충돌 (거리 기반)
    const dx = playerCenterX - bulletCenterX;
    const dy = playerCenterY - bulletCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < (playerRadius + bulletRadius);
  }, []);

  // 게임 시작
  const startGame = useCallback(() => {
    setIsPlaying(true);
    setIsGameOver(false);
    setScore(0);
    setBullets([]);
    setPlayerX(GAME_WIDTH / 2 - PLAYER_SIZE / 2);
    setPlayerY(GAME_HEIGHT / 2 - PLAYER_SIZE / 2);
    startTimeRef.current = Date.now();
    bulletIdRef.current = 0;
  }, []);

  // 게임 종료
  const endGame = useCallback((finalScore: number) => {
    setIsPlaying(false);
    setIsGameOver(true);

    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    if (bulletSpawnRef.current) {
      clearInterval(bulletSpawnRef.current);
      bulletSpawnRef.current = null;
    }

    saveScore(finalScore);
  }, [saveScore]);

  // 총알 생성 (4방향 + 동시 다발)
  useEffect(() => {
    if (!isPlaying) return;

    const createBullet = (direction: 'left' | 'right' | 'top' | 'bottom', speed: number): Bullet => {
      let x: number, y: number;

      // 구석 사각지대 제거 - 전체 범위에서 생성
      switch (direction) {
        case 'left':
          x = -BULLET_SIZE;
          y = Math.random() * GAME_HEIGHT; // 전체 높이 범위
          break;
        case 'right':
          x = GAME_WIDTH;
          y = Math.random() * GAME_HEIGHT; // 전체 높이 범위
          break;
        case 'top':
          x = Math.random() * GAME_WIDTH; // 전체 너비 범위
          y = -BULLET_SIZE;
          break;
        case 'bottom':
          x = Math.random() * GAME_WIDTH; // 전체 너비 범위
          y = GAME_HEIGHT;
          break;
      }

      return {
        id: bulletIdRef.current++,
        x,
        y,
        speed,
        direction
      };
    };

    const spawnBullets = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const directions: Array<'left' | 'right' | 'top' | 'bottom'> = ['left', 'right', 'top', 'bottom'];

      // 18초 이후에는 난이도 고정
      const effectiveElapsed = Math.min(elapsed, MAX_DIFFICULTY_TIME);
      const speed = 3 + effectiveElapsed * BULLET_SPEED_INCREASE;

      // 시간에 따라 동시 생성 총알 수 증가 (1개에서 시작, 3초마다 1개씩 증가, 18초에서 고정)
      const simultaneousCount = Math.min(
        MAX_SIMULTANEOUS_BULLETS,
        STARTING_BULLETS + Math.floor(effectiveElapsed / 3) // 3초마다 1개씩 증가
      );

      const newBullets: Bullet[] = [];

      for (let i = 0; i < simultaneousCount; i++) {
        // 모든 방향에서 랜덤하게 (같은 방향 허용)
        const direction = directions[Math.floor(Math.random() * directions.length)];

        // 약간의 속도 변화 추가
        const bulletSpeed = speed + (Math.random() - 0.5) * 2;
        newBullets.push(createBullet(direction, bulletSpeed));
      }

      setBullets(prev => [...prev, ...newBullets]);
    };

    // 동적 총알 생성 간격 (점진적으로 감소, 18초에서 고정)
    const updateSpawnInterval = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const effectiveElapsed = Math.min(elapsed, MAX_DIFFICULTY_TIME);
      const interval = Math.max(
        MIN_BULLET_INTERVAL,
        INITIAL_BULLET_INTERVAL - effectiveElapsed * 50 // 초당 50ms씩 감소 (18초 후 최소 간격 도달)
      );

      if (bulletSpawnRef.current) {
        clearInterval(bulletSpawnRef.current);
      }

      bulletSpawnRef.current = setInterval(spawnBullets, interval);
    };

    updateSpawnInterval();
    const intervalUpdater = setInterval(updateSpawnInterval, 2000);

    return () => {
      if (bulletSpawnRef.current) {
        clearInterval(bulletSpawnRef.current);
      }
      clearInterval(intervalUpdater);
    };
  }, [isPlaying]);

  // 게임 루프
  useEffect(() => {
    if (!isPlaying) return;

    const gameLoop = () => {
      // 점수 업데이트 (밀리초)
      const currentScore = Date.now() - startTimeRef.current;
      setScore(currentScore);

      // 총알 이동 (4방향)
      setBullets(prev => {
        const newBullets = prev.map(bullet => {
          let newX = bullet.x;
          let newY = bullet.y;

          switch (bullet.direction) {
            case 'left':
              newX = bullet.x + bullet.speed;
              break;
            case 'right':
              newX = bullet.x - bullet.speed;
              break;
            case 'top':
              newY = bullet.y + bullet.speed;
              break;
            case 'bottom':
              newY = bullet.y - bullet.speed;
              break;
          }

          return { ...bullet, x: newX, y: newY };
        }).filter(bullet =>
          bullet.x > -BULLET_SIZE &&
          bullet.x < GAME_WIDTH + BULLET_SIZE &&
          bullet.y > -BULLET_SIZE &&
          bullet.y < GAME_HEIGHT + BULLET_SIZE
        );

        // 충돌 체크
        for (const bullet of newBullets) {
          if (checkCollision(playerX, playerY, bullet)) {
            endGame(currentScore);
            return [];
          }
        }

        return newBullets;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isPlaying, playerX, playerY, checkCollision, endGame]);

  // 터치/마우스 컨트롤
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isPlaying || !gameAreaRef.current) return;

    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = clientX - rect.left - PLAYER_SIZE / 2;
    const y = clientY - rect.top - PLAYER_SIZE / 2;

    setPlayerX(Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, x)));
    setPlayerY(Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, y)));
  }, [isPlaying]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  // 포맷팅
  const formatScore = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const millis = Math.floor((ms % 1000) / 10);
    return `${seconds}.${millis.toString().padStart(2, '0')}초`;
  };

  // 에러 화면
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

  // 카운트다운 오버레이
  if (closeCountdown !== null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🏁</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">게임이 종료되었습니다</h1>
          <p className="text-gray-600 mb-4">
            {closeCountdown}초 후 창이 닫힙니다...
          </p>
          <button
            onClick={() => window.close()}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            바로 닫기
          </button>
        </div>
      </div>
    );
  }

  // 대기 화면
  if (!gameData || gameData.status === 'waiting') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white shadow-lg shadow-white/50" />
          <h1 className="text-2xl font-bold text-white mb-2 tracking-widest">DODGE</h1>
          <p className="text-gray-400 mb-6">{studentName}님</p>
          <div className="animate-pulse text-gray-500">
            대기중...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* 헤더 */}
      <div className="mb-4 text-center">
        <h1 className="text-xl font-bold text-white mb-1">DODGE</h1>
        <p className="text-gray-400 text-sm">{studentName}</p>
      </div>

      {/* 점수 표시 */}
      <div className="flex gap-6 mb-4 font-mono">
        <div className="text-center">
          <span className="text-gray-600 text-xs block">TIME</span>
          <span className="text-white font-bold text-lg">{formatScore(score)}</span>
        </div>
        <div className="text-center">
          <span className="text-gray-600 text-xs block">BEST</span>
          <span className="text-yellow-400 font-bold text-lg">{formatScore(highScore)}</span>
        </div>
      </div>

      {/* 게임 영역 */}
      <div
        ref={gameAreaRef}
        className="relative bg-gray-950 overflow-hidden border border-gray-800"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        onTouchMove={handleTouchMove}
        onTouchStart={(e) => e.preventDefault()}
        onMouseMove={handleMouseMove}
      >
        {/* 플레이어 (흰색 작은 점) */}
        {isPlaying && (
          <div
            className="absolute rounded-full bg-white shadow-lg shadow-white/50"
            style={{
              left: playerX,
              top: playerY,
              width: PLAYER_SIZE,
              height: PLAYER_SIZE
            }}
          />
        )}

        {/* 총알들 (빨간색 작은 점) */}
        {bullets.map(bullet => (
          <div
            key={bullet.id}
            className="absolute rounded-full bg-red-500 shadow-md shadow-red-500/50"
            style={{
              left: bullet.x,
              top: bullet.y,
              width: BULLET_SIZE,
              height: BULLET_SIZE
            }}
          />
        ))}

        {/* 시작 화면 */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-4 rounded-full bg-white shadow-lg shadow-white/50" />
              <h2 className="text-2xl font-bold text-white mb-4 tracking-widest">DODGE</h2>
              <p className="text-gray-400 text-sm mb-6">
                터치하거나 마우스로<br/>빨간 점을 피하세요!
              </p>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-all"
              >
                START
              </button>
            </div>
          </div>
        )}

        {/* 게임 오버 화면 */}
        {isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-500 mb-4 tracking-widest">GAME OVER</h2>
              <div className="mb-4">
                <p className="text-gray-500 text-sm">TIME</p>
                <p className="text-3xl font-bold text-white font-mono">{formatScore(score)}</p>
              </div>
              {score >= highScore && score > 0 && (
                <p className="text-yellow-400 font-bold mb-4 animate-pulse">NEW RECORD!</p>
              )}
              <button
                onClick={startGame}
                className="px-8 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-all"
              >
                RETRY
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 조작 안내 */}
      <p className="mt-4 text-gray-600 text-sm text-center">
        터치 또는 마우스로 흰색 점을 이동하세요
      </p>
    </div>
  );
}
