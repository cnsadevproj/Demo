import React, { useState } from 'react';
import { PageLayout } from '../components/PageLayout';
import { GrassCalendar } from '../components/GrassCalendar';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { mockGrassData, currentUser } from '../utils/mockData';
import { Calendar, TrendingUp, Flame, Award } from 'lucide-react';

interface StudentGrassProps {
  onNavigate?: (page: string) => void;
}

export function StudentGrass({ onNavigate }: StudentGrassProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 통계 계산
  const totalDays = mockGrassData.length;
  const completedDays = mockGrassData.filter(d => d.completed).length;
  const completionRate = ((completedDays / totalDays) * 100).toFixed(1);

  // 최대 연속 일수 계산
  let maxStreak = 0;
  let currentStreak = 0;
  mockGrassData.forEach(day => {
    if (day.completed) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  // 현재 연속 일수 (최근부터 역순으로)
  let recentStreak = 0;
  for (let i = mockGrassData.length - 1; i >= 0; i--) {
    if (mockGrassData[i].completed) {
      recentStreak++;
    } else {
      break;
    }
  }

  // 선택된 날짜 정보
  const selectedDayData = selectedDate ? mockGrassData.find(d => d.date === selectedDate) : null;

  return (
    <PageLayout 
      title="학습 잔디" 
      role="student"
      showBack
      onBack={() => onNavigate?.('dashboard')}
    >
      <div className="space-y-6">
        {/* 사용자 정보 */}
        <Card className="p-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <h2 className="text-white mb-1">{currentUser.name}님의 학습 기록</h2>
          <p className="text-green-100">꾸준함이 가장 큰 힘입니다 💪</p>
        </Card>

        {/* 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-gray-500">총 일수</p>
            </div>
            <p className="text-2xl">{totalDays}일</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-sm text-gray-500">완료</p>
            </div>
            <p className="text-2xl">{completedDays}일</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-purple-600" />
              <p className="text-sm text-gray-500">달성률</p>
            </div>
            <p className="text-2xl">{completionRate}%</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-600" />
              <p className="text-sm text-gray-500">최고 연속</p>
            </div>
            <p className="text-2xl">{maxStreak}일</p>
          </Card>
        </div>

        {/* 현재 연속 일수 */}
        {recentStreak > 0 && (
          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="flex items-center gap-2">
              <Flame className="w-6 h-6 text-orange-600" />
              <div>
                <p className="text-sm text-orange-900">현재 연속</p>
                <p className="text-orange-600">{recentStreak}일 연속 달성 중! 🔥</p>
              </div>
            </div>
          </Card>
        )}

        {/* 잔디 캘린더 */}
        <Card className="p-6">
          <h3 className="mb-6">학기 전체 활동</h3>
          <GrassCalendar 
            data={mockGrassData} 
            onDateClick={setSelectedDate}
          />
        </Card>

        {/* 선택된 날짜 상세 */}
        {selectedDayData && (
          <Card className="p-6">
            <h3 className="mb-4">선택한 날짜 상세</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">날짜</span>
                <span>{new Date(selectedDayData.date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">상태</span>
                <Badge variant={selectedDayData.completed ? 'default' : 'secondary'}>
                  {selectedDayData.completed ? '완료 ✓' : '미완료'}
                </Badge>
              </div>
              {selectedDayData.completed && (
                <div className="flex justify-between">
                  <span className="text-gray-600">미션 유형</span>
                  <Badge variant={selectedDayData.missionType === 'team' ? 'destructive' : 'default'}>
                    {selectedDayData.missionType === 'team' ? '팀 미션' : '개인 미션'}
                  </Badge>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 격려 메시지 */}
        <Card className="p-6 bg-gradient-to-r from-purple-100 to-pink-100">
          <h3 className="mb-2">💡 꾸준함의 힘</h3>
          <p className="text-gray-700">
            매일 조금씩이라도 꾸준히 하는 것이 가장 중요합니다.
            오늘도 작은 한 걸음을 내딛어보세요!
          </p>
        </Card>

        {/* 돌아가기 */}
        <button
          onClick={() => onNavigate?.('dashboard')}
          className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          대시보드로 돌아가기
        </button>
      </div>
    </PageLayout>
  );
}
