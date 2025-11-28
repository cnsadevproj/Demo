import React from 'react';
import { GrassData } from '../types';

interface GrassCalendarProps {
  data: GrassData[];
  mini?: boolean;
  onDateClick?: (date: string) => void;
}

export function GrassCalendar({ data, mini = false, onDateClick }: GrassCalendarProps) {
  // 주차별로 데이터 그룹화
  const groupByWeeks = (grassData: GrassData[]) => {
    const weeks: GrassData[][] = [];
    let currentWeek: GrassData[] = [];

    grassData.forEach((item, index) => {
      currentWeek.push(item);
      
      const date = new Date(item.date);
      const dayOfWeek = date.getDay();
      
      // 일요일이거나 마지막 항목이면 주 종료
      if (dayOfWeek === 0 || index === grassData.length - 1) {
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

    // refreshCount 기반 색상 (2회 이상 = 진한 초록)
    if (item.refreshCount !== undefined) {
      if (item.refreshCount >= 2) return 'bg-green-600';
      if (item.refreshCount === 1) return 'bg-green-400';
    }

    // 쿠키 변화량 기반 색상 (2개 이상 = 진한 초록)
    if (item.cookieChange !== undefined) {
      if (item.cookieChange >= 2) return 'bg-green-600';
      if (item.cookieChange === 1) return 'bg-green-400';
    }

    // 기존 로직: 팀 미션은 진한 초록색
    if (item.missionType === 'team') {
      return 'bg-green-600';
    }
    return 'bg-green-400';
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
          <span>적음</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-sm" />
            <div className="w-3 h-3 bg-green-400 rounded-sm" />
            <div className="w-3 h-3 bg-green-600 rounded-sm" />
          </div>
          <span>많음</span>
        </div>
      </div>
    </div>
  );
}
