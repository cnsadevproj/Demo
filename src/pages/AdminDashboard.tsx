import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { mockTeams, mockWeekReport } from '../utils/mockData';
import { 
  Users, 
  Calendar, 
  Cookie, 
  TrendingUp, 
  Settings,
  Camera,
  BarChart3,
  Shield
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate?: (page: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const totalStudents = mockTeams.reduce((sum, team) => sum + team.members.length, 0);
  const totalCookies = mockTeams.reduce((sum, team) => sum + team.earnedRound, 0);
  const avgCookies = Math.round(totalCookies / totalStudents);
  const weekNumber = 12;

  return (
    <PageLayout title="관리자 대시보드" role="admin">
      <div className="space-y-6">
        {/* 헤더 */}
        <Card className="p-6 bg-gradient-to-r from-red-500 to-pink-600 text-white">
          <h2 className="text-white mb-2">학습 게임화 시스템 관리</h2>
          <p className="text-red-100">Week {weekNumber} 운영 현황</p>
        </Card>

        {/* 주요 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">전체 학생</p>
                <p className="text-2xl">{totalStudents}명</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">팀 수</p>
                <p className="text-2xl">{mockTeams.length}팀</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Cookie className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">평균 쿠키</p>
                <p className="text-2xl">{avgCookies}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">미션 참여율</p>
                <p className="text-2xl">{mockWeekReport.personalMissionRate}%</p>
              </div>
            </div>
          </Card>
        </div>

        {/* 빠른 작업 */}
        <div>
          <h3 className="mb-4">빠른 작업</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onNavigate?.('team-assign')}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h4 className="mb-1">팀 배정</h4>
                  <p className="text-sm text-gray-600">
                    새로운 주간 팀을 랜덤으로 배정합니다
                  </p>
                  <Badge variant="default" className="mt-2">월요일</Badge>
                </div>
              </div>
            </Card>

            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onNavigate?.('snapshot')}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Camera className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h4 className="mb-1">스냅샷 관리</h4>
                  <p className="text-sm text-gray-600">
                    쿠키 잔액 스냅샷을 기록하고 확인합니다
                  </p>
                  <Badge variant="secondary" className="mt-2">월·수요일</Badge>
                </div>
              </div>
            </Card>

            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onNavigate?.('report')}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <BarChart3 className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h4 className="mb-1">주간 리포트</h4>
                  <p className="text-sm text-gray-600">
                    팀 미션 결과와 참여율을 확인합니다
                  </p>
                  <Badge variant="destructive" className="mt-2">다음 월요일</Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gray-50">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-200 rounded-lg">
                  <Settings className="w-8 h-8 text-gray-600" />
                </div>
                <div>
                  <h4 className="mb-1">시스템 설정</h4>
                  <p className="text-sm text-gray-600">
                    미션, 규칙 등 시스템 설정을 관리합니다
                  </p>
                  <Badge variant="outline" className="mt-2">개발 예정</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* 이번주 팀 미션 현황 */}
        <div>
          <h3 className="mb-4">이번주 팀 미션 현황</h3>
          <Card className="p-6">
            <div className="space-y-4">
              {mockTeams.map((team) => (
                <div key={team.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{team.flag}</span>
                    <div>
                      <h4>{team.name}</h4>
                      <p className="text-sm text-gray-500">{team.members.length}명</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {team.receivedMission ? (
                      <Badge variant="destructive">팀 미션 수행 중</Badge>
                    ) : (
                      <Badge variant="secondary">개인 미션</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 주간 일정 */}
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            주간 운영 일정
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Badge variant="default">월</Badge>
              <div>
                <p>팀 랜덤 배정 + 월요일 스냅샷(B_mon)</p>
                <p className="text-sm text-gray-600 mt-1">새로운 주차 시작</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <Badge variant="secondary">수</Badge>
              <div>
                <p>수요일 스냅샷(B_wed) + 공격/방어</p>
                <p className="text-sm text-gray-600 mt-1">라운드 쿠키 확정 및 팀 전투</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <Badge variant="outline">목·금</Badge>
              <div>
                <p>팀/개인 미션 수행</p>
                <p className="text-sm text-gray-600 mt-1">학생들이 미션을 수행하고 잔디를 심습니다</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
