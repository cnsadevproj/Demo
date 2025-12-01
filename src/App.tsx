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

// 메인 앱 콘텐츠
function AppContent() {
  const { role, isAuthenticated, isLoading, logout } = useAuth();

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