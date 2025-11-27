import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { TeamCard } from '../components/TeamCard';
import { MissionCard } from '../components/MissionCard';
import { GrassCalendar } from '../components/GrassCalendar';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { currentUser, currentTeam, mockPersonalMission, mockGrassData } from '../utils/mockData';
import { Cookie, Calendar, Trophy } from 'lucide-react';

interface StudentDashboardProps {
  onNavigate?: (page: string) => void;
}

export function StudentDashboard({ onNavigate }: StudentDashboardProps) {
  const today = new Date().toISOString().split('T')[0];
  const todayGrass = mockGrassData.find(g => g.date === today);

  return (
    <PageLayout title="학습 대시보드" role="student">
      <div className="space-y-6">
        {/* 환영 메시지 */}
        <Card className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <h2 className="text-white mb-2">안녕하세요, {currentUser.name}님!</h2>
          <p className="text-blue-100">오늘도 함께 성장해요 🌱</p>
        </Card>

        {/* 주요 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Cookie className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">이번주 쿠키</p>
                <p className="text-xl">{currentTeam.earnedRound.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">오늘 잔디</p>
                <p className="text-xl">
                  {todayGrass?.completed ? (
                    <Badge variant="default">완료 ✓</Badge>
                  ) : (
                    <Badge variant="secondary">미완료</Badge>
                  )}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">학기 미션</p>
                <p className="text-xl">54회</p>
              </div>
            </div>
          </Card>
        </div>

        {/* 이번주 팀 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3>이번주 팀</h3>
            <button
              onClick={() => onNavigate?.('team')}
              className="text-sm text-blue-600 hover:underline"
            >
              팀 전체 보기 →
            </button>
          </div>
          <TeamCard team={currentTeam} isCurrentTeam showMission />
        </div>

        {/* 오늘의 미션 */}
        <div>
          <h3 className="mb-4">오늘의 미션</h3>
          <MissionCard
            mission={{
              ...mockPersonalMission,
              completed: todayGrass?.completed,
            }}
            showCompleteButton
            onComplete={() => onNavigate?.('mission')}
          />
        </div>

        {/* 미니 잔디 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3>최근 활동</h3>
            <button
              onClick={() => onNavigate?.('grass')}
              className="text-sm text-blue-600 hover:underline"
            >
              전체 잔디 보기 →
            </button>
          </div>
          <Card className="p-6">
            <GrassCalendar data={mockGrassData} mini />
          </Card>
        </div>

        {/* 빠른 메뉴 */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onNavigate?.('battle')}
            className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <h4 className="mb-1">공격/방어</h4>
            <p className="text-sm text-gray-500">수요일 팀 전투</p>
          </button>

          <button
            onClick={() => onNavigate?.('ranking')}
            className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <h4 className="mb-1">랭킹</h4>
            <p className="text-sm text-gray-500">학기 성실도 순위</p>
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
