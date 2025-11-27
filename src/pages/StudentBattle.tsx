import React, { useState } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { mockTeams, currentTeam } from '../utils/mockData';
import { Swords, Shield, Cookie, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface StudentBattleProps {
  onNavigate?: (page: string) => void;
}

export function StudentBattle({ onNavigate }: StudentBattleProps) {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [attackBet, setAttackBet] = useState<number>(0);
  const [defenseBet, setDefenseBet] = useState<number>(0);

  const availableCookies = currentTeam.earnedRound;
  const otherTeams = mockTeams.filter(t => t.id !== currentTeam.id);

  const handleSubmit = () => {
    if (!selectedTarget) {
      toast.error('공격할 팀을 선택해주세요');
      return;
    }

    if (attackBet + defenseBet > availableCookies) {
      toast.error('보유한 쿠키보다 많이 배팅할 수 없습니다');
      return;
    }

    if (attackBet < 0 || defenseBet < 0) {
      toast.error('배팅 금액은 0 이상이어야 합니다');
      return;
    }

    toast.success('공격/방어 설정이 완료되었습니다!');
    setTimeout(() => {
      onNavigate?.('dashboard');
    }, 1500);
  };

  const remainingCookies = availableCookies - attackBet - defenseBet;

  return (
    <PageLayout 
      title="공격/방어" 
      role="student"
      showBack
      onBack={() => onNavigate?.('team')}
    >
      <div className="space-y-6">
        {/* 안내 메시지 */}
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="mb-2 text-yellow-900">수요일 공격/방어</h3>
              <p className="text-sm text-yellow-800">
                이번 주에 획득한 쿠키를 사용하여 다른 팀을 공격하거나 방어할 수 있습니다.
                공격에 성공하면 상대 팀이 팀 미션을 받게 됩니다.
              </p>
            </div>
          </div>
        </Card>

        {/* 현재 팀 쿠키 */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">내 팀</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentTeam.flag}</span>
                <h3>{currentTeam.name}</h3>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">보유 쿠키</p>
              <div className="flex items-center gap-1 text-amber-600">
                <Cookie className="w-5 h-5" />
                <span className="text-xl">{availableCookies.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 공격 설정 */}
        <div>
          <h3 className="mb-4 flex items-center gap-2">
            <Swords className="w-5 h-5 text-red-600" />
            공격 설정
          </h3>
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">공격할 팀 선택</label>
                <select
                  value={selectedTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">팀을 선택하세요</option>
                  {otherTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.flag} {team.name} ({team.members.length}명)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">공격 배팅 쿠키</label>
                <input
                  type="number"
                  value={attackBet}
                  onChange={(e) => setAttackBet(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  max={availableCookies}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="0"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* 방어 설정 */}
        <div>
          <h3 className="mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            방어 설정
          </h3>
          <Card className="p-6">
            <div>
              <label className="block text-sm mb-2">방어 배팅 쿠키</label>
              <input
                type="number"
                value={defenseBet}
                onChange={(e) => setDefenseBet(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
                max={availableCookies - attackBet}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </Card>
        </div>

        {/* 요약 */}
        <Card className="p-6 bg-gray-50">
          <h4 className="mb-4">배팅 요약</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">공격 배팅</span>
              <span className="text-red-600">{attackBet.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">방어 배팅</span>
              <span className="text-blue-600">{defenseBet.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span>남은 쿠키</span>
              <span className={remainingCookies < 0 ? 'text-red-600' : ''}>
                {remainingCookies.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        {/* 제출 버튼 */}
        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={remainingCookies < 0}
            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            제출하기
          </button>
          <button
            onClick={() => onNavigate?.('team')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
