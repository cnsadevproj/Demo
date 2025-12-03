import React from 'react';
import { GrassData } from '../types';

interface GrassCalendarProps {
  data: GrassData[];
  mini?: boolean;
  onDateClick?: (date: string) => void;
}

export function GrassCalendar({ data, mini = false, onDateClick }: GrassCalendarProps) {
  // 주말 제외하고 주차별로 데이터 그룹화 (월~금만)
  const groupByWeeks = (grassData: GrassData[]) => {
    const weeks: GrassData[][] = [];
    let currentWeek: GrassData[] = [];

    // 주말 데이터 필터링
    const weekdayData = grassData.filter(item => {
      const date = new Date(item.date);
      const dayOfWeek = date.getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5; // 월(1)~금(5)만
    });

    weekdayData.forEach((item, index) => {
      currentWeek.push(item);

      const date = new Date(item.date);
      const dayOfWeek = date.getDay();

      // 금요일이거나 마지막 항목이면 주 종료
      if (dayOfWeek === 5 || index === weekdayData.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });

    return weeks;
  };

  const weeks = groupByWeeks(data);
  const cellSize = mini ? 'w-2 h-2' : 'w-3 h-3';
  const gap = mini ? 'gap-0.5' : 'gap-1';

  const getColor = (completed: boolean) => {
    if (completed) {
      return 'bg-green-500';
    }
    return 'bg-gray-200 dark:bg-gray-700';
  };

  const getIntensity = (item: GrassData) => {
    if (!item.completed) return 'bg-gray-200 dark:bg-gray-700';

    // refreshCount 기반 색상 (3단계: 1개, 2개, 3개 이상)
    if (item.refreshCount !== undefined) {
      if (item.refreshCount >= 3) return 'bg-green-700';
      if (item.refreshCount === 2) return 'bg-green-500';
      if (item.refreshCount === 1) return 'bg-green-300';
    }

    // 쿠키 변화량 기반 색상 (3단계: 1개, 2개, 3개 이상)
    if (item.cookieChange !== undefined) {
      if (item.cookieChange >= 3) return 'bg-green-700';
      if (item.cookieChange === 2) return 'bg-green-500';
      if (item.cookieChange === 1) return 'bg-green-300';
    }

    // 기존 로직: 팀 미션은 진한 초록색
    if (item.missionType === 'team') {
      return 'bg-green-700';
    }
    return 'bg-green-300';
  };

  if (mini) {
    // 미니 버전: 최근 8주만 표시
    const recentWeeks = weeks.slice(-8);
    
    return (
      <div className="flex flex-col gap-1">
        <div className={`flex ${gap}`}>
          {recentWeeks.map((week, weekIndex) => (
            <div key={weekIndex} className={`flex flex-col ${gap}`}>
              {week.map((day) => (
                <div
                  key={day.date}
                  className={`${cellSize} ${getIntensity(day)} rounded-sm`}
                  title={day.date}
                />
              ))}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">최근 8주 활동</p>
      </div>
    );
  }

  // 전체 버전: 모든 주 표시
  return (
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
          {/* 요일 라벨 */}
          <div className="flex flex-col gap-1 justify-around text-xs text-gray-500">
            <div>월</div>
            <div>수</div>
            <div>금</div>
          </div>

          {/* 잔디 그리드 */}
          <div className={`flex ${gap}`}>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className={`flex flex-col ${gap}`}>
                {week.map((day) => {
                  const date = new Date(day.date);
                  const dayOfWeek = date.getDay();
                  
                  return (
                    <div
                      key={day.date}
                      className={`${cellSize} ${getIntensity(day)} rounded-sm cursor-pointer hover:ring-2 hover:ring-green-600 transition-all`}
                      title={`${day.date} - ${day.completed ? '완료' : '미완료'}`}
                      onClick={() => onDateClick?.(day.date)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-2 text-xs text-gray-500 ml-8">
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-sm" title="0개" />
            <div className="w-3 h-3 bg-green-300 rounded-sm" title="1개" />
            <div className="w-3 h-3 bg-green-500 rounded-sm" title="2개" />
            <div className="w-3 h-3 bg-green-700 rounded-sm" title="3개+" />
          </div>
        </div>
      </div>
    </div>
  );
}
