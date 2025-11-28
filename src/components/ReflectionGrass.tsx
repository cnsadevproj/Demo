import React, { useState, useMemo } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ReflectionKing, ReflectionRecord } from '../types/game';
import { Crown, Calendar, TrendingUp, Flame, Award } from 'lucide-react';

interface ReflectionGrassProps {
  reflectionKings: ReflectionKing[];
  studentCode?: string;  // 특정 학생만 표시할 때
  mini?: boolean;
  onDateClick?: (date: string) => void;
}

interface DayData {
  date: string;
  count: number;  // 해당 날짜 성찰왕 횟수
  students: { name: string; cookies: number }[];
}

export function ReflectionGrass({
  reflectionKings,
  studentCode,
  mini = false,
  onDateClick,
}: ReflectionGrassProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 날짜별 데이터 그룹화
  const dateData = useMemo(() => {
    const data = new Map<string, DayData>();

    // 필터링 (특정 학생 또는 전체)
    const filteredKings = studentCode
      ? reflectionKings.filter(k => k.studentCode === studentCode)
      : reflectionKings;

    filteredKings.forEach(king => {
      const existing = data.get(king.date);
      if (existing) {
        existing.count++;
        existing.students.push({ name: king.studentName, cookies: king.bonusCookies });
      } else {
        data.set(king.date, {
          date: king.date,
          count: 1,
          students: [{ name: king.studentName, cookies: king.bonusCookies }],
        });
      }
    });

    return data;
  }, [reflectionKings, studentCode]);

  // 최근 N일 데이터 생성
  const generateRecentDays = (days: number): DayData[] => {
    const result: DayData[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      result.push(dateData.get(dateStr) || {
        date: dateStr,
        count: 0,
        students: [],
      });
    }

    return result;
  };

  // 주차별로 그룹화
  const groupByWeeks = (days: DayData[]): DayData[][] => {
    const weeks: DayData[][] = [];
    let currentWeek: DayData[] = [];

    days.forEach((day, index) => {
      currentWeek.push(day);
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();

      if (dayOfWeek === 0 || index === days.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });

    return weeks;
  };

  // 색상 결정
  const getColor = (count: number): string => {
    if (count === 0) return 'bg-gray-200 dark:bg-gray-700';
    if (count === 1) return 'bg-green-400';  // 연한 초록
    return 'bg-green-600';  // 진한 초록 (2개 이상)
  };

  // 통계 계산
  const stats = useMemo(() => {
    const days = generateRecentDays(90);  // 최근 90일
    const completedDays = days.filter(d => d.count > 0).length;
    const totalCount = days.reduce((sum, d) => sum + d.count, 0);

    // 최대 연속 일수
    let maxStreak = 0;
    let currentStreak = 0;
    days.forEach(day => {
      if (day.count > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    // 현재 연속 일수
    let recentStreak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].count > 0) {
        recentStreak++;
      } else {
        break;
      }
    }

    return {
      totalDays: days.length,
      completedDays,
      totalCount,
      maxStreak,
      recentStreak,
    };
  }, [dateData]);

  const recentDays = generateRecentDays(mini ? 56 : 90);  // 미니: 8주, 전체: ~13주
  const weeks = groupByWeeks(recentDays);

  const cellSize = mini ? 'w-2 h-2' : 'w-3 h-3';
  const gap = mini ? 'gap-0.5' : 'gap-1';

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    onDateClick?.(date);
  };

  // 선택된 날짜 데이터
  const selectedDayData = selectedDate ? dateData.get(selectedDate) : null;

  if (mini) {
    return (
      <div className="flex flex-col gap-1">
        <div className={`flex ${gap}`}>
          {weeks.slice(-8).map((week, weekIndex) => (
            <div key={weekIndex} className={`flex flex-col ${gap}`}>
              {week.map((day) => (
                <div
                  key={day.date}
                  className={`${cellSize} ${getColor(day.count)} rounded-sm`}
                  title={`${day.date}: ${day.count}회`}
                />
              ))}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">최근 8주 성찰 기록</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-gray-500">성찰한 날</p>
          </div>
          <p className="text-2xl font-bold">{stats.completedDays}일</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-yellow-600" />
            <p className="text-sm text-gray-500">총 성찰왕</p>
          </div>
          <p className="text-2xl font-bold">{stats.totalCount}회</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-purple-600" />
            <p className="text-sm text-gray-500">달성률</p>
          </div>
          <p className="text-2xl font-bold">
            {stats.totalDays > 0
              ? ((stats.completedDays / stats.totalDays) * 100).toFixed(1)
              : 0}%
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-orange-600" />
            <p className="text-sm text-gray-500">최고 연속</p>
          </div>
          <p className="text-2xl font-bold">{stats.maxStreak}일</p>
        </Card>
      </div>

      {/* 현재 연속 */}
      {stats.recentStreak > 0 && (
        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-600" />
            <div>
              <p className="text-sm text-orange-900">현재 연속</p>
              <p className="font-bold text-orange-600">
                {stats.recentStreak}일 연속 성찰 중!
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 잔디 캘린더 */}
      <Card className="p-6">
        <h3 className="mb-6 font-medium">성찰 기록</h3>
        <div className="w-full overflow-x-auto">
          <div className="inline-flex flex-col gap-2 min-w-fit">
            {/* 월 라벨 */}
            <div className="flex gap-1 ml-8">
              {weeks.map((week, index) => {
                if (week.length === 0) return null;
                const firstDate = new Date(week[0].date);
                const isFirstWeekOfMonth = firstDate.getDate() <= 7;

                if (isFirstWeekOfMonth) {
                  return (
                    <div key={index} className="text-xs text-gray-500" style={{ width: '12px' }}>
                      {firstDate.toLocaleDateString('ko-KR', { month: 'short' })}
                    </div>
                  );
                }
                return <div key={index} style={{ width: '12px' }} />;
              })}
            </div>

            {/* 요일 + 잔디 */}
            <div className="flex gap-2">
              <div className="flex flex-col gap-1 justify-around text-xs text-gray-500">
                <div>월</div>
                <div>수</div>
                <div>금</div>
              </div>

              <div className={`flex ${gap}`}>
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className={`flex flex-col ${gap}`}>
                    {week.map((day) => (
                      <div
                        key={day.date}
                        className={`${cellSize} ${getColor(day.count)} rounded-sm cursor-pointer hover:ring-2 hover:ring-green-600 transition-all`}
                        title={`${day.date}: ${day.count}회`}
                        onClick={() => handleDateClick(day.date)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* 범례 */}
            <div className="flex items-center gap-2 text-xs text-gray-500 ml-8">
              <span>없음</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-gray-200 rounded-sm" />
                <div className="w-3 h-3 bg-green-400 rounded-sm" />
                <div className="w-3 h-3 bg-green-600 rounded-sm" />
              </div>
              <span>2회+</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 선택된 날짜 상세 */}
      {selectedDate && (
        <Card className="p-6">
          <h3 className="mb-4 font-medium">
            {new Date(selectedDate).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </h3>
          {selectedDayData && selectedDayData.count > 0 ? (
            <div className="space-y-2">
              {selectedDayData.students.map((student, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <span>{student.name}</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    +{student.cookies}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">이 날은 성찰왕이 없습니다</p>
          )}
        </Card>
      )}
    </div>
  );
}
