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
  Shield,
  Info
} from 'lucide-react';

export function DemoAdmin() {
  const totalStudents = mockTeams.reduce((sum, team) => sum + team.members.length, 0);
  const totalCookies = mockTeams.reduce((sum, team) => sum + team.earnedRound, 0);
  const avgCookies = Math.round(totalCookies / totalStudents);
  const weekNumber = 12;

  return (
    <PageLayout title="관리자 대시보드 (데모)" role="demo">
      <div className="space-y-6">
        {/* 데모 안내 */}
        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-purple-900">
                <strong>데모 모드</strong> - 관리자 기능의 UI를 미리 확인할 수 있습니다.
                실제 시스템에서는 교사 계정으로 로그인하여 사용할 수 있습니다.
              </p>
            </div>
          </div>
        </Card>

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

        {/* 빠른 작업 (비활성) */}
        <div>
          <h3 className="mb-4">빠른 작업</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 opacity-60">
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

            <Card className="p-6 opacity-60">
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

            <Card className="p-6 opacity-60">
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

            <Card className="p-6 bg-gray-50 opacity-60">
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

        {/* 시스템 구조 요약 */}
        <Card className="p-6">
          <h3 className="mb-4">시스템 구조 요약</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h4>주간 루프</h4>
              </div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• 월요일: 팀 랜덤 배정 + B_mon 스냅샷</li>
                <li>• 수요일: B_wed 스냅샷 + 공격/방어</li>
                <li>• 목·금: 팀/개인 미션 수행</li>
                <li>• 다음 월요일: 결과 리포트</li>
              </ul>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Cookie className="w-5 h-5 text-purple-600" />
                <h4>라운드 쿠키 시스템</h4>
              </div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• earned_round = max(0, B_wed - B_mon)</li>
                <li>• 팀 평균 라운드 쿠키로 공정성 보정</li>
                <li>• 공격/방어에 라운드 쿠키 사용</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h4>개인 꾸준함 기록</h4>
              </div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• 학기 전체 잔디(GitHub 스타일)</li>
                <li>• 팀과 무관한 개인 성장 기록</li>
                <li>• 누적 성실도 랭킹 (상위 3명 공개)</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
