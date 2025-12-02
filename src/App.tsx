// src/App.tsx
// 메인 앱 - Firebase 버전

import React from 'react';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import Login from './pages/Login';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { StudentDashboardNew } from './pages/StudentDashboardNew';
import { Loading } from './pages/Loading';

// Games
import { NumberBaseball } from './games/NumberBaseball';

// URL 경로 기반 라우팅
function getRoutePath(): string {
  const path = window.location.pathname;
  const search = window.location.search;

  // /game/baseball 경로 체크
  if (path === '/game/baseball' || path.startsWith('/game/baseball')) {
    return 'game-baseball';
  }

  // 쿼리 파라미터로도 게임 접근 가능 (?game=baseball)
  const params = new URLSearchParams(search);
  if (params.get('game') === 'baseball') {
    return 'game-baseball';
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
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}