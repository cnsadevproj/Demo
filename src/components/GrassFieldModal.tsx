import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

// 잔디 이미지 (녹색 잔디)
const grassDataURI = 'data:image/svg+xml;base64,' + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 40">
  <path d="M15 40 Q10 30 8 20 Q6 10 15 0 Q24 10 22 20 Q20 30 15 40" fill="#22c55e"/>
  <path d="M5 40 Q3 32 5 25 Q7 18 12 12" stroke="#16a34a" stroke-width="2" fill="none"/>
  <path d="M25 40 Q27 32 25 25 Q23 18 18 12" stroke="#16a34a" stroke-width="2" fill="none"/>
</svg>
`);

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
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // 시작 날짜 (기본: 2주 전)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 14);
    return date.toISOString().split('T')[0];
  });

  const [currentDate, setCurrentDate] = useState(startDate);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(800); // 애니메이션 속도 (ms)

  // 어제 날짜 계산
  const getYesterday = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };

  const endDate = getYesterday();

  // 날짜 범위 내의 모든 날짜 생성
  const getDateRange = useCallback((start: string, end: string) => {
    const dates: string[] = [];
    const startD = new Date(start);
    const endD = new Date(end);

    while (startD <= endD) {
      dates.push(startD.toISOString().split('T')[0]);
      startD.setDate(startD.getDate() + 1);
    }
    return dates;
  }, []);

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

  // 차트 초기화 및 업데이트
  const updateChart = useCallback((displayDate: string) => {
    if (!chartRef.current || classesData.length === 0) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const lineCount = 8; // 잔디 줄 수

    // 반별 데이터 생성
    const seriesData = classesData.map((classData, idx) => {
      const cumulativeGrass = getCumulativeGrass(classData, displayDate);
      const grassPerLine = Math.ceil(cumulativeGrass / lineCount);

      const data = [];
      for (let i = 0; i < lineCount; i++) {
        // 각 줄에 분배할 잔디 수 계산
        const remainingGrass = Math.max(0, cumulativeGrass - (i * grassPerLine));
        const lineGrass = Math.min(grassPerLine, remainingGrass);

        const sign = idx % 2 === 0 ? 1 : -1;
        const offset = idx * 15; // 반별 간격

        data.push({
          value: sign * lineGrass + (sign * offset),
          symbolOffset: i % 2 ? ['50%', 0] : undefined
        });
      }
      return data;
    });

    // 반 이름 카테고리
    const categoryData = [];
    for (let i = 0; i < lineCount; i++) {
      categoryData.push(i + 'a');
    }

    // 색상 배열
    const colors = ['#22c55e', '#16a34a', '#15803d', '#14532d', '#86efac', '#4ade80'];

    const option: echarts.EChartsOption = {
      backgroundColor: '#f0fdf4',
      title: {
        text: displayDate,
        left: 'center',
        top: 20,
        textStyle: {
          color: '#166534',
          fontSize: 24,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { seriesIndex: number };
          const classData = classesData[p.seriesIndex];
          const total = getCumulativeGrass(classData, displayDate);
          return `${classData.className}: ${total}개 잔디`;
        }
      },
      legend: {
        data: classesData.map(c => c.className),
        bottom: 10,
        textStyle: { color: '#166534' }
      },
      xAxis: {
        axisLine: { show: false },
        axisLabel: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        min: -500,
        max: 500
      },
      yAxis: {
        data: categoryData,
        show: false
      },
      grid: {
        top: 80,
        bottom: 60,
        left: 50,
        right: 50
      },
      series: classesData.map((classData, idx) => ({
        name: classData.className,
        type: 'pictorialBar',
        symbol: 'image://' + grassDataURI,
        symbolSize: [20, 35],
        symbolRepeat: true,
        symbolClip: true,
        data: seriesData[idx],
        animationEasing: 'elasticOut',
        animationDuration: 500,
        itemStyle: {
          opacity: 0.9
        },
        z: idx
      }))
    };

    chartInstance.current.setOption(option);
  }, [classesData, getCumulativeGrass]);

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
        updateChart(dateStr);
        current.setDate(current.getDate() + 1);
      }, speed);
    }
  }, [isPlaying, startDate, endDate, speed, updateChart]);

  // 처음으로 리셋
  const handleReset = useCallback(() => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
    setCurrentDate(startDate);
    updateChart(startDate);
  }, [startDate, updateChart]);

  // 모달이 열릴 때 차트 초기화
  useEffect(() => {
    if (isOpen && classesData.length > 0) {
      setTimeout(() => {
        updateChart(currentDate);
      }, 100);
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isOpen, classesData]);

  // 시작 날짜 변경 시
  useEffect(() => {
    setCurrentDate(startDate);
    if (isOpen) {
      updateChart(startDate);
    }
  }, [startDate]);

  // 창 크기 변경 시 차트 리사이즈
  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 모달 닫힐 때 정리
  const handleClose = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
    if (chartInstance.current) {
      chartInstance.current.dispose();
      chartInstance.current = null;
    }
    onClose();
  };

  // 반별 최종 합계 계산
  const getFinalTotals = () => {
    return classesData.map(c => ({
      className: c.className,
      total: getCumulativeGrass(c, endDate)
    })).sort((a, b) => b.total - a.total);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            🌱 반별 잔디밭 비교
          </DialogTitle>
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

          {/* 차트 영역 */}
          <div
            ref={chartRef}
            className="w-full h-[400px] border rounded-lg bg-gradient-to-b from-green-50 to-green-100"
          />

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
                    {idx === 0 ? '🥇' : idx === 1 ? '��' : idx === 2 ? '🥉' : `${idx + 1}.`}
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
