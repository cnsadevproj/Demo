// src/App.tsx
// 메인 앱 - Firebase 버전

import React from 'react';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StudentProvider } from './contexts/StudentContext';

// Pages
import Login from './pages/Login';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { StudentDashboardNew } from './pages/StudentDashboardNew';
import { Loading } from './pages/Loading';

// Games
import { NumberBaseball } from './games/NumberBaseball';
import { NumberBaseballTeacher } from './games/NumberBaseballTeacher';
import { MinorityGame } from './games/MinorityGame';
import { MinorityGameTeacher } from './games/MinorityGameTeacher';
import { BulletDodge } from './games/BulletDodge';
import { BulletDodgeTeacher } from './games/BulletDodgeTeacher';
import { RockPaperScissors } from './games/RockPaperScissors';
import { RockPaperScissorsTeacher } from './games/RockPaperScissorsTeacher';
import { CookieBattle } from './games/CookieBattle';
import { CookieBattleTeacher } from './games/CookieBattleTeacher';
import { WordChain } from './games/WordChain';
import { WordChainTeacher } from './games/WordChainTeacher';
import { TeacherWordCloud } from './components/wordcloud/TeacherWordCloud';
import { StudentWordCloud } from './components/wordcloud/StudentWordCloud';

// URL 경로 기반 라우팅
function getRoutePath(): string {
  const path = window.location.pathname;
  const search = window.location.search;
  const params = new URLSearchParams(search);

  // /game/baseball 경로 체크
  if (path === '/game/baseball' || path.startsWith('/game/baseball')) {
    return 'game-baseball';
  }

  // 쿼리 파라미터로 게임 접근
  const gameType = params.get('game');
  if (gameType === 'baseball') {
    return 'game-baseball';
  }
  if (gameType === 'baseball-teacher') {
    return 'game-baseball-teacher';
  }
  if (gameType === 'minority') {
    return 'game-minority';
  }
  if (gameType === 'minority-teacher') {
    return 'game-minority-teacher';
  }
  if (gameType === 'bullet-dodge') {
    return 'game-bullet-dodge';
  }
  if (gameType === 'bullet-dodge-teacher') {
    return 'game-bullet-dodge-teacher';
  }
  if (gameType === 'rps') {
    return 'game-rps';
  }
  if (gameType === 'rps-teacher') {
    return 'game-rps-teacher';
  }
  if (gameType === 'cookie-battle') {
    return 'game-cookie-battle';
  }
  if (gameType === 'cookie-battle-teacher') {
    return 'game-cookie-battle-teacher';
  }
  if (gameType === 'word-chain') {
    return 'game-word-chain';
  }
  if (gameType === 'word-chain-teacher') {
    return 'game-word-chain-teacher';
  }
  if (gameType === 'wordcloud-teacher') {
    return 'game-wordcloud-teacher';
  }
  if (gameType === 'wordcloud-student') {
    return 'game-wordcloud-student';
  }

  return 'main';
}

// 메인 앱 콘텐츠
function AppContent() {
  const { role, isAuthenticated, isLoading, logout } = useAuth();
  const routePath = getRoutePath();

  // 게임 페이지 (인증 불필요 - URL 파라미터로 검증)
  if (routePath === 'game-baseball') {
    return <NumberBaseball />;
  }
  if (routePath === 'game-baseball-teacher') {
    return <NumberBaseballTeacher />;
  }
  if (routePath === 'game-minority') {
    return <MinorityGame />;
  }
  if (routePath === 'game-minority-teacher') {
    return <MinorityGameTeacher />;
  }
  if (routePath === 'game-bullet-dodge') {
    return <BulletDodge />;
  }
  if (routePath === 'game-bullet-dodge-teacher') {
    return <BulletDodgeTeacher />;
  }
  if (routePath === 'game-rps') {
    return <RockPaperScissors />;
  }
  if (routePath === 'game-rps-teacher') {
    return <RockPaperScissorsTeacher />;
  }
  if (routePath === 'game-cookie-battle') {
    return <CookieBattle />;
  }
  if (routePath === 'game-cookie-battle-teacher') {
    return <CookieBattleTeacher />;
  }
  if (routePath === 'game-word-chain') {
    return <WordChain />;
  }
  if (routePath === 'game-word-chain-teacher') {
    return <WordChainTeacher />;
  }
  if (routePath === 'game-wordcloud-teacher') {
    const params = new URLSearchParams(window.location.search);
    const teacherId = params.get('teacherId') || '';
    const classId = params.get('classId') || '';
    return <TeacherWordCloud teacherId={teacherId} classId={classId} />;
  }
  if (routePath === 'game-wordcloud-student') {
    const params = new URLSearchParams(window.location.search);
    const teacherId = params.get('teacherId') || '';
    const classId = params.get('classId') || '';
    const studentCode = params.get('studentCode') || '';
    const studentName = decodeURIComponent(params.get('studentName') || '');
    return <StudentWordCloud teacherId={teacherId} classId={classId} studentCode={studentCode} studentName={studentName} />;
  }

  // 로딩 중
  if (isLoading) {
    return <Loading />;
  }

  // 로그인 안 됨
  if (!isAuthenticated) {
    return <Login />;
  }

  // 선생님 모드
  if (role === 'teacher') {
    return <TeacherDashboard onLogout={logout} />;
  }

  // 학생 모드
  if (role === 'student') {
    return <StudentDashboardNew onLogout={logout} />;
  }

  // 기본: 로그인 페이지
  return <Login />;
}

// 루트 앱
export default function App() {
  return (
    <AuthProvider>
      <StudentProvider>
        <AppContent />
        <Toaster />
      </StudentProvider>
    </AuthProvider>
  );
}