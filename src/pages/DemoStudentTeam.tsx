import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { TeamCard } from '../components/TeamCard';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { mockTeams, currentTeam } from '../utils/mockData';
import { Calendar, Cookie, Info } from 'lucide-react';

export function DemoStudentTeam() {
  const weekNumber = 12;
  const totalCookies = mockTeams.reduce((sum, team) => sum + team.earnedRound, 0);
  const avgCookies = Math.round(totalCookies / mockTeams.length);

  return (
    <PageLayout title="팀 현황 (데모)" role="demo">
      <div className="space-y-6">
        {/* 데모 안내 */}
        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-purple-900">
                <strong>데모 모드</strong> - 가짜 팀 데이터를 표시합니다.
                실제 시스템에서는 매주 월요일 랜덤으로 팀이 구성됩니다.
              </p>
            </div>
          </div>
        </Card>

        {/* 주차 정보 */}
        <Card className="p-6 bg-gradient-to-r from-purple-500 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5" />
                <h2 className="text-white">Week {weekNumber}</h2>
              </div>
              <p className="text-purple-100">이번주 팀 구성 및 현황</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-100">전체 평균 쿠키</p>
              <div className="flex items-center gap-1 justify-end mt-1">
                <Cookie className="w-5 h-5" />
                <span className="text-xl">{avgCookies.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 전체 팀 목록 */}
        <div>
          <h3 className="mb-4">전체 팀 ({mockTeams.length}팀)</h3>
          <div className="grid grid-cols-1 gap-4">
            {mockTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                isCurrentTeam={team.id === currentTeam.id}
                showBattle
                showMission
              />
            ))}
          </div>
        </div>

        {/* 공격/방어 안내 */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="mb-2">⚔️ 공격/방어 안내</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• 수요일 오전에 각 팀이 공격할 팀과 방어 포인트를 선택합니다</li>
            <li>• 공격이 성공하면 상대 팀이 팀 미션을 받게 됩니다</li>
            <li>• 팀 미션은 목·금 이틀간 수행하며, 완료 여부는 다음 주 월요일에 공개됩니다</li>
            <li>• 팀 미션을 받지 않은 팀은 공통 개인 미션을 수행합니다</li>
          </ul>
        </Card>
      </div>
    </PageLayout>
  );
}
