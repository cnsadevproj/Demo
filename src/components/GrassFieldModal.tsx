import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ClassGrassData {
  classId: string;
  className: string;
  grassByDate: Record<string, number>; // date -> total grass count
}

interface GrassFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  classesData: ClassGrassData[];
}

const GrassFieldModal: React.FC<GrassFieldModalProps> = ({
  isOpen,
  onClose,
  classesData
}) => {
  // 시작 날짜 (기본: 2주 전)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 14);
    return date.toISOString().split('T')[0];
  });

  const [currentDate, setCurrentDate] = useState(startDate);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // 어제 날짜 계산
  const getYesterday = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };

  const endDate = getYesterday();

  // 특정 날짜까지의 누적 잔디 수 계산
  const getCumulativeGrass = useCallback((classData: ClassGrassData, upToDate: string) => {
    let total = 0;
    const dates = Object.keys(classData.grassByDate).sort();

    for (const date of dates) {
      if (date <= upToDate && date >= startDate) {
        total += classData.grassByDate[date] || 0;
      }
    }
    return total;
  }, [startDate]);

  // 애니메이션 시작/정지
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      let current = new Date(startDate);
      const end = new Date(endDate);

      animationRef.current = setInterval(() => {
        if (current > end) {
          if (animationRef.current) {
            clearInterval(animationRef.current);
            animationRef.current = null;
          }
          setIsPlaying(false);
          return;
        }

        const dateStr = current.toISOString().split('T')[0];
        setCurrentDate(dateStr);
        current.setDate(current.getDate() + 1);
      }, speed);
    }
  }, [isPlaying, startDate, endDate, speed]);

  // 처음으로 리셋
  const handleReset = useCallback(() => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
    setCurrentDate(startDate);
  }, [startDate]);

  // 시작 날짜 변경 시
  useEffect(() => {
    setCurrentDate(startDate);
  }, [startDate]);

  // 모달 닫힐 때 정리
  const handleClose = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
    onClose();
  };

  // cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, []);

  // 반별 현재 잔디 수 계산
  const getCurrentTotals = () => {
    return classesData.map(c => ({
      className: c.className,
      total: getCumulativeGrass(c, currentDate)
    })).sort((a, b) => b.total - a.total);
  };

  // 반별 최종 합계 계산
  const getFinalTotals = () => {
    return classesData.map(c => ({
      className: c.className,
      total: getCumulativeGrass(c, endDate)
    })).sort((a, b) => b.total - a.total);
  };

  // 최대값 (프로그레스바 계산용)
  const maxTotal = Math.max(...getCurrentTotals().map(t => t.total), 1);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            🌱 반별 잔디밭 비교
          </DialogTitle>
          <DialogDescription>
            시작 날짜부터 어제까지 반별 잔디 성장을 비교합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 날짜 설정 */}
          <div className="flex flex-wrap items-end gap-4 p-4 bg-green-50 rounded-lg">
            <div className="flex flex-col gap-1">
              <Label htmlFor="startDate" className="text-sm text-green-700">시작 날짜</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                className="w-40"
                disabled={isPlaying}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-sm text-green-700">종료 날짜</Label>
              <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-600">
                {endDate} (어제)
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="speed" className="text-sm text-green-700">속도</Label>
              <select
                id="speed"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="px-3 py-2 border rounded-md text-sm"
                disabled={isPlaying}
              >
                <option value={1200}>느리게</option>
                <option value={800}>보통</option>
                <option value={400}>빠르게</option>
                <option value={200}>매우 빠르게</option>
              </select>
            </div>
          </div>

          {/* 컨트롤 버튼 */}
          <div className="flex items-center gap-2">
            <Button
              onClick={togglePlay}
              variant={isPlaying ? "destructive" : "default"}
              className={isPlaying ? "" : "bg-green-600 hover:bg-green-700"}
            >
              {isPlaying ? '⏸️ 일시정지' : '▶️ 재생'}
            </Button>
            <Button onClick={handleReset} variant="outline">
              ⏮️ 처음으로
            </Button>
            <span className="ml-4 text-sm text-gray-600">
              현재 날짜: <strong className="text-green-700">{currentDate}</strong>
            </span>
          </div>

          {/* 잔디밭 비교 (프로그레스바 형태) */}
          <div className="space-y-3 p-4 bg-gradient-to-b from-green-50 to-green-100 rounded-lg min-h-[300px]">
            <h3 className="font-semibold text-green-800 text-center mb-4">
              📊 {currentDate} 기준 누적 잔디
            </h3>
            {getCurrentTotals().map((item, idx) => (
              <div key={item.className} className="flex items-center gap-3">
                <div className="w-20 text-sm font-medium text-right">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                  {' '}{item.className}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                    style={{ width: `${Math.max((item.total / maxTotal) * 100, 5)}%` }}
                  >
                    <span className="text-white text-sm font-bold drop-shadow">
                      {item.total}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {classesData.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                비교할 학급 데이터가 없습니다.
              </div>
            )}
          </div>

          {/* 최종 순위 */}
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">🏆 최종 순위 ({endDate} 기준)</h3>
            <div className="flex flex-wrap gap-4">
              {getFinalTotals().map((item, idx) => (
                <div
                  key={item.className}
                  className={`px-4 py-2 rounded-lg ${
                    idx === 0 ? 'bg-yellow-100 border-2 border-yellow-400' :
                    idx === 1 ? 'bg-gray-100 border-2 border-gray-400' :
                    idx === 2 ? 'bg-orange-100 border-2 border-orange-400' :
                    'bg-white border border-gray-200'
                  }`}
                >
                  <span className="font-medium">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                    {' '}{item.className}
                  </span>
                  <span className="ml-2 text-green-700 font-bold">{item.total}개</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GrassFieldModal;
