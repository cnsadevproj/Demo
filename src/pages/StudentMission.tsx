import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { mockPersonalMission, currentTeam, mockGrassData } from '../utils/mockData';
import { Timer, Camera, CheckCircle2, Upload } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface StudentMissionProps {
  onNavigate?: (page: string) => void;
}

export function StudentMission({ onNavigate }: StudentMissionProps) {
  const [timerMinutes, setTimerMinutes] = useState(20);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const todayGrass = mockGrassData.find(g => g.date === today);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTimerRunning && (timerMinutes > 0 || timerSeconds > 0)) {
      interval = setInterval(() => {
        if (timerSeconds === 0) {
          if (timerMinutes === 0) {
            setIsTimerRunning(false);
            toast.success('🎉 타이머 완료! 20분 달성했습니다!');
          } else {
            setTimerMinutes(timerMinutes - 1);
            setTimerSeconds(59);
          }
        } else {
          setTimerSeconds(timerSeconds - 1);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isTimerRunning, timerMinutes, timerSeconds]);

  const startTimer = () => {
    setTimerMinutes(20);
    setTimerSeconds(0);
    setIsTimerRunning(true);
    toast.info('타이머 시작! 집중해서 공부하세요 📚');
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    toast.info('타이머 일시정지');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        toast.success('사진이 업로드되었습니다');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = () => {
    if (timerMinutes === 0 && timerSeconds === 0 && !isTimerRunning) {
      setIsCompleted(true);
      toast.success('미션 완료! 오늘의 잔디가 심어졌습니다 🌱');
      setTimeout(() => {
        onNavigate?.('dashboard');
      }, 2000);
    } else if (selectedImage) {
      setIsCompleted(true);
      toast.success('사진 인증 완료! 오늘의 잔디가 심어졌습니다 🌱');
      setTimeout(() => {
        onNavigate?.('dashboard');
      }, 2000);
    } else {
      toast.error('타이머를 완료하거나 사진을 업로드해주세요');
    }
  };

  const hasTeamMission = currentTeam.receivedMission;

  return (
    <PageLayout 
      title="미션 수행" 
      role="student"
      showBack
      onBack={() => onNavigate?.('dashboard')}
    >
      <div className="space-y-6">
        {/* 미션 정보 */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Badge variant={hasTeamMission ? 'destructive' : 'default'} className="mb-2">
                {hasTeamMission ? '팀 미션' : '개인 미션'}
              </Badge>
              <h2>{hasTeamMission ? currentTeam.receivedMission?.title : mockPersonalMission.title}</h2>
              <p className="text-gray-600 mt-2">
                {hasTeamMission ? currentTeam.receivedMission?.description : mockPersonalMission.description}
              </p>
            </div>
            {todayGrass?.completed && (
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            )}
          </div>

          {!hasTeamMission && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                💡 팀 미션이 없으므로 개인 미션을 수행하면 잔디를 심을 수 있습니다.
              </p>
            </div>
          )}
        </Card>

        {/* 타이머 */}
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <Timer className="w-5 h-5 text-purple-600" />
            20분 타이머
          </h3>
          
          <div className="text-center py-8">
            <div className="text-6xl mb-6 tabular-nums">
              {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
            </div>
            
            <div className="flex gap-4 justify-center">
              {!isTimerRunning ? (
                <button
                  onClick={startTimer}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  시작
                </button>
              ) : (
                <button
                  onClick={stopTimer}
                  className="px-8 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  일시정지
                </button>
              )}
              
              <button
                onClick={() => {
                  setTimerMinutes(20);
                  setTimerSeconds(0);
                  setIsTimerRunning(false);
                }}
                className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                초기화
              </button>
            </div>
          </div>

          {timerMinutes === 0 && timerSeconds === 0 && !isTimerRunning && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-900">✅ 타이머 완료! 아래 버튼을 눌러 인증하세요.</p>
            </div>
          )}
        </Card>

        {/* 사진 인증 */}
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            사진 인증
          </h3>
          
          <div className="space-y-4">
            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
                {selectedImage ? (
                  <div>
                    <img src={selectedImage} alt="Uploaded" className="max-h-48 mx-auto mb-4 rounded" />
                    <p className="text-sm text-green-600">✓ 사진이 업로드되었습니다</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">클릭하여 사진 업로드</p>
                    <p className="text-sm text-gray-400 mt-1">공부 인증 사진을 올려주세요</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </Card>

        {/* 완료 버튼 */}
        <div className="flex gap-4">
          <button
            onClick={handleComplete}
            disabled={isCompleted || (!selectedImage && (timerMinutes > 0 || timerSeconds > 0 || isTimerRunning))}
            className="flex-1 px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {isCompleted ? '✓ 완료됨' : '미션 완료하기'}
          </button>
        </div>

        {/* 안내 */}
        <Card className="p-4 bg-gray-50">
          <p className="text-sm text-gray-600">
            💡 타이머를 완료하거나 사진을 업로드한 후 "미션 완료하기" 버튼을 눌러주세요.
            완료하면 오늘의 잔디가 초록색으로 채워집니다!
          </p>
        </Card>
      </div>
    </PageLayout>
  );
}
