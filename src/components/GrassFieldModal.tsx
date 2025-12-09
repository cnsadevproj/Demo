import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ClassGrassData {
  classId: string;
  className: string;
  grassByDate: Record<string, number>;
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

  // 선택된 학급 (기본: 전체 선택)
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(
    new Set(classesData.map(c => c.classId))
  );

  // classesData 변경 시 selectedClasses 업데이트
  useEffect(() => {
    setSelectedClasses(new Set(classesData.map(c => c.classId)));
  }, [classesData]);

  // 필터된 데이터
  const filteredClassesData = classesData.filter(c => selectedClasses.has(c.classId));

  // 학급 선택/해제 토글
  const toggleClass = (classId: string) => {
    setSelectedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  // 전체 선택/해제
  const toggleAll = () => {
    if (selectedClasses.size === classesData.length) {
      setSelectedClasses(new Set());
    } else {
      setSelectedClasses(new Set(classesData.map(c => c.classId)));
    }
  };

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

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 반별 현재 잔디 수 계산
  const getCurrentTotals = () => {
    return filteredClassesData.map(c => ({
      className: c.className,
      total: getCumulativeGrass(c, currentDate)
    })).sort((a, b) => b.total - a.total);
  };

  // 반별 최종 합계 계산
  const getFinalTotals = () => {
    return filteredClassesData.map(c => ({
      className: c.className,
      total: getCumulativeGrass(c, endDate)
    })).sort((a, b) => b.total - a.total);
  };

  // 최대값 (프로그레스바 계산용)
  const maxTotal = Math.max(...getCurrentTotals().map(t => t.total), 1);

  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={handleClose}
      />

      {/* 모달 */}
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-3xl my-auto flex flex-col max-h-[calc(100vh-2rem)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                🌱 반별 잔디밭 비교
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                시작 날짜부터 어제까지 반별 잔디 성장을 비교합니다.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              &times;
            </button>
          </div>

          {/* 본문 */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
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

            {/* 학급 선택 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-gray-700">비교할 학급 선택</Label>
                <button
                  onClick={toggleAll}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                  disabled={isPlaying}
                >
                  {selectedClasses.size === classesData.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {classesData.map(c => (
                  <label
                    key={c.classId}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                      selectedClasses.has(c.classId)
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-gray-200 text-gray-500 border border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedClasses.has(c.classId)}
                      onChange={() => toggleClass(c.classId)}
                      disabled={isPlaying}
                      className="sr-only"
                    />
                    <span>{selectedClasses.has(c.classId) ? '✓' : ''}</span>
                    {c.className}
                  </label>
                ))}
              </div>
            </div>

            {/* 컨트롤 버튼 */}
            <div className="flex items-center gap-2">
              <Button
                onClick={togglePlay}
                variant={isPlaying ? "destructive" : "default"}
                className={isPlaying ? "" : "bg-green-600 hover:bg-green-700"}
                disabled={selectedClasses.size === 0}
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
                  <div className="w-28 text-sm font-medium text-right truncate">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                    {' '}{item.className}
                  </div>
                  {(() => {
                    const percentage = Math.max((item.total / maxTotal) * 100, 5);
                    return (
                      <div
                        style={{
                          flex: 1,
                          height: '32px',
                          borderRadius: '16px',
                          backgroundColor: '#e5e7eb',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${percentage}%`,
                            background: 'linear-gradient(90deg, #4ade80, #22c55e)',
                            borderRadius: '16px',
                            transition: 'width 0.3s ease'
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            left: `${Math.max(percentage - 7, 1)}%`,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: percentage > 15 ? 'white' : '#16a34a',
                            textShadow: percentage > 15 ? '1px 1px 2px rgba(0,0,0,0.3)' : 'none',
                            transition: 'left 0.3s ease'
                          }}
                        >
                          {item.total}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ))}
              {filteredClassesData.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  {classesData.length === 0 ? '비교할 학급 데이터가 없습니다.' : '비교할 학급을 선택해주세요.'}
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
        </div>
      </div>
    </>
  );
};

export default GrassFieldModal;
