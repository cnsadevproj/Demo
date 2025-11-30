import React, { useState } from 'react';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GameProvider } from './contexts/GameContext';

// Auth Pages
import Login from './pages/Login';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { StudentDashboardNew } from './pages/StudentDashboardNew';

// Student Pages (Demo)
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentTeam } from './pages/StudentTeam';
import { StudentBattle } from './pages/StudentBattle';
import { StudentMission } from './pages/StudentMission';
import { StudentGrass } from './pages/StudentGrass';
import { StudentRanking } from './pages/StudentRanking';

// Admin Pages (Demo)
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminTeamAssign } from './pages/AdminTeamAssign';
import { AdminSnapshot } from './pages/AdminSnapshot';
import { AdminReport } from './pages/AdminReport';

// Game Pages (Battle System)
import { GameTeamManager } from './pages/GameTeamManager';
import { ReflectionManager } from './pages/ReflectionManager';
import { BattleGame } from './pages/BattleGame';

// Demo Pages
import { DemoStudent } from './pages/DemoStudent';
import { DemoStudentTeam } from './pages/DemoStudentTeam';
import { DemoAdmin } from './pages/DemoAdmin';
import { DemoAdminReport } from './pages/DemoAdminReport';

// Utility Pages
import { ErrorUnauthorized } from './pages/ErrorUnauthorized';
import { Loading } from './pages/Loading';

// 데모 모드 네비게이션 메뉴 컴포넌트
function DemoNavigationMenu({ currentPage, onNavigate, onExitDemo }: {
  currentPage: string;
  onNavigate: (page: string) => void;
  onExitDemo: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const studentPages = [
    { id: 'dashboard', label: '대시보드', emoji: '🏠' },
    { id: 'team', label: '팀 현황', emoji: '👥' },
    { id: 'battle', label: '공격/방어', emoji: '⚔️' },
    { id: 'mission', label: '미션 수행', emoji: '🎯' },
    { id: 'grass', label: '학습 잔디', emoji: '🌱' },
    { id: 'ranking', label: '랭킹', emoji: '🏆' },
  ];

  const adminPages = [
    { id: 'admin', label: '관리자 홈', emoji: '⚙️' },
    { id: 'team-assign', label: '팀 배정', emoji: '👥' },
    { id: 'snapshot', label: '스냅샷', emoji: '📸' },
    { id: 'report', label: '리포트', emoji: '📊' },
  ];

  const demoPages = [
    { id: 'demo', label: '데모: 학생', emoji: '👨‍🎓' },
    { id: 'demo-team', label: '데모: 팀', emoji: '👥' },
    { id: 'demo-admin', label: '데모: 관리자', emoji: '⚙️' },
    { id: 'demo-report', label: '데모: 리포트', emoji: '📊' },
  ];

  return (
    <>
      {/* 토글 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 px-6 py-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all"
      >
        {isOpen ? '✕ 닫기' : '🧪 데모 메뉴'}
      </button>

      {/* 메뉴 패널 */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsOpen(false)}>
          <div
            className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="mb-2">데모 페이지 네비게이션</h2>
              <p className="text-sm text-gray-500 mb-6">목업 데이터로 UI를 미리 확인합니다</p>

              {/* 실제 로그인으로 이동 */}
              <button
                onClick={onExitDemo}
                className="w-full mb-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                🚀 실제 로그인 화면으로
              </button>

              {/* 학생 페이지 */}
              <div className="mb-6">
                <h3 className="mb-3 text-blue-600">🟩 학생용 페이지</h3>
                <div className="space-y-2">
                  {studentPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => {
                        onNavigate(page.id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        currentPage === page.id
                          ? 'bg-blue-100 text-blue-900'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {page.emoji} {page.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 관리자 페이지 */}
              <div className="mb-6">
                <h3 className="mb-3 text-red-600">🟥 관리자용 페이지</h3>
                <div className="space-y-2">
                  {adminPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => {
                        onNavigate(page.id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        currentPage === page.id
                          ? 'bg-red-100 text-red-900'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {page.emoji} {page.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 데모 페이지 */}
              <div className="mb-6">
                <h3 className="mb-3 text-purple-600">🟦 데모 페이지</h3>
                <div className="space-y-2">
                  {demoPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => {
                        onNavigate(page.id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        currentPage === page.id
                          ? 'bg-purple-100 text-purple-900'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {page.emoji} {page.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 데모 모드 컴포넌트
function DemoMode({ onExitDemo }: { onExitDemo: () => void }) {
  const [currentPage, setCurrentPage] = useState('demo');

  const renderPage = () => {
    switch (currentPage) {
      // Student Pages
      case 'dashboard':
        return <StudentDashboard onNavigate={setCurrentPage} />;
      case 'team':
        return <StudentTeam onNavigate={setCurrentPage} />;
      case 'battle':
        return <StudentBattle onNavigate={setCurrentPage} />;
      case 'mission':
        return <StudentMission onNavigate={setCurrentPage} />;
      case 'grass':
        return <StudentGrass onNavigate={setCurrentPage} />;
      case 'ranking':
        return <StudentRanking onNavigate={setCurrentPage} />;

      // Admin Pages
      case 'admin':
        return <AdminDashboard onNavigate={setCurrentPage} />;
      case 'team-assign':
        return <AdminTeamAssign onNavigate={setCurrentPage} />;
      case 'snapshot':
        return <AdminSnapshot onNavigate={setCurrentPage} />;
      case 'report':
        return <AdminReport onNavigate={setCurrentPage} />;

      // Demo Pages
      case 'demo':
        return <DemoStudent />;
      case 'demo-team':
        return <DemoStudentTeam />;
      case 'demo-admin':
        return <DemoAdmin />;
      case 'demo-report':
        return <DemoAdminReport />;

      // Utility Pages
      case 'error':
        return <ErrorUnauthorized onNavigate={setCurrentPage} />;
      case 'loading':
        return <Loading />;

      default:
        return <DemoStudent />;
    }
  };

  return (
    <>
      {renderPage()}
      <DemoNavigationMenu
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onExitDemo={onExitDemo}
      />
    </>
  );
}

// 교사 모드 사이드바 메뉴 (항상 표시)
function TeacherSidebarMenu({ currentPage, onNavigate }: {
  currentPage: string;
  onNavigate: (page: string) => void;
}) {
  const { classes, selectedClass, selectClass } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 활성화된 클래스 목록
  const activeClasses = classes.filter(c => c.active !== false);

  // 메인 페이지 (기존 탭들을 메뉴로)
  const mainPages = [
    { id: 'setup', label: '초기설정', emoji: '⚙️' },
    { id: 'students', label: '학생목록', emoji: '👨‍🎓' },
    { id: 'wishes', label: '소원의돌', emoji: '⭐' },
    { id: 'shop', label: '상점', emoji: '🛒' },
  ];

  const gamePages = [
    { id: 'game-teams', label: '팀 관리', emoji: '👥' },
    { id: 'reflection-manager', label: '성찰왕 관리', emoji: '👑' },
    { id: 'battle-game', label: '쿠키 배틀', emoji: '⚔️' },
  ];

  const demoPages = [
    { id: 'demo-admin', label: '관리자 데모', emoji: '⚙️' },
    { id: 'demo-report', label: '리포트 데모', emoji: '📊' },
  ];

  // 클래스 선택 후 페이지 이동
  const handleClassSelect = (className: string, targetPage: string) => {
    selectClass(className);
    onNavigate(targetPage);
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all"
      >
        📱
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-64 bg-white shadow-xl overflow-y-auto z-40 border-l">
      <div className="p-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">교사 메뉴</h2>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-gray-100 rounded text-gray-500"
          >
            ✕
          </button>
        </div>

        {/* 현재 선택된 학급 */}
        <div className="mb-4 p-2 bg-blue-50 rounded-lg text-sm">
          <span className="text-gray-600">선택된 학급: </span>
          <span className="font-medium text-blue-700">{selectedClass || '없음'}</span>
        </div>

        {/* 메인 페이지 */}
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase">메인</h3>
          <div className="space-y-1">
            {mainPages.map((page) => (
              <button
                key={page.id}
                onClick={() => onNavigate(page.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                  currentPage === page.id
                    ? 'bg-blue-100 text-blue-900 font-medium'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {page.emoji} {page.label}
              </button>
            ))}
          </div>
        </div>

        {/* 쿠키 배틀 */}
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase">쿠키 배틀</h3>
          <div className="space-y-1">
            {gamePages.map((page) => (
              <button
                key={page.id}
                onClick={() => onNavigate(page.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                  currentPage === page.id
                    ? 'bg-amber-100 text-amber-900 font-medium'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {page.emoji} {page.label}
              </button>
            ))}
          </div>
        </div>

        {/* 클래스별 바로가기 */}
        {activeClasses.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase">학급 바로가기</h3>
            <div className="space-y-2">
              {activeClasses.slice(0, 5).map((classInfo) => (
                <div key={classInfo.name} className="border rounded-lg p-2">
                  <div className="text-xs font-medium mb-1 flex items-center justify-between">
                    <span>{classInfo.name}</span>
                    {selectedClass === classInfo.name && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">선택</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleClassSelect(classInfo.name, 'game-teams')}
                      className="flex-1 text-xs px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700"
                    >
                      팀
                    </button>
                    <button
                      onClick={() => handleClassSelect(classInfo.name, 'battle-game')}
                      className="flex-1 text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700"
                    >
                      배틀
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 데모 페이지 */}
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase">데모</h3>
          <div className="space-y-1">
            {demoPages.map((page) => (
              <button
                key={page.id}
                onClick={() => onNavigate(page.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                  currentPage === page.id
                    ? 'bg-purple-100 text-purple-900 font-medium'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {page.emoji} {page.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 교사 모드 컴포넌트
function TeacherMode({ onLogout }: { onLogout: () => void }) {
  const [currentPage, setCurrentPage] = useState('setup');

  const renderPage = () => {
    switch (currentPage) {
      // 메인 페이지 (탭별로 분리)
      case 'setup':
      case 'students':
      case 'wishes':
      case 'shop':
        return <TeacherDashboard onLogout={onLogout} activeTab={currentPage} onTabChange={setCurrentPage} />;
      // 쿠키 배틀 게임 페이지
      case 'game-teams':
        return <GameTeamManager onNavigate={setCurrentPage} />;
      case 'reflection-manager':
        return <ReflectionManager onNavigate={setCurrentPage} />;
      case 'battle-game':
        return <BattleGame onNavigate={setCurrentPage} />;
      // 데모/추가 페이지
      case 'demo-admin':
        return <DemoAdmin />;
      case 'demo-report':
        return <DemoAdminReport />;
      default:
        return <TeacherDashboard onLogout={onLogout} activeTab="setup" onTabChange={setCurrentPage} />;
    }
  };

  return (
    <div className="mr-64"> {/* 사이드바 공간 확보 */}
      {renderPage()}
      <TeacherSidebarMenu currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
}

// 메인 앱 콘텐츠
function AppContent() {
  const { role, isAuthenticated, logout } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(false);

  // 로그인 성공 핸들러
  const handleLoginSuccess = () => {
    setIsDemoMode(false);
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    logout();
  };

  // 데모 모드
  if (isDemoMode) {
    return <DemoMode onExitDemo={() => setIsDemoMode(false)} />;
  }

  // 로그인 안 된 경우
  if (!isAuthenticated) {
    return (
      <div>
        <Login onLoginSuccess={handleLoginSuccess} />
        {/* 데모 모드 버튼 */}
        <button
          onClick={() => setIsDemoMode(true)}
          className="fixed bottom-6 right-6 z-50 px-6 py-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all"
        >
          🧪 데모 모드
        </button>
      </div>
    );
  }

  // 역할에 따른 페이지 렌더링
  if (role === 'teacher') {
    return <TeacherMode onLogout={handleLogout} />;
  }

  if (role === 'student') {
    return <StudentDashboardNew onLogout={handleLogout} />;
  }

  // 기본: 로그인 페이지
  return <Login onLoginSuccess={handleLoginSuccess} />;
}

// 루트 앱 컴포넌트
export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <AppContent />
        <Toaster />
      </GameProvider>
    </AuthProvider>
  );
}
