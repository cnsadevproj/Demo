import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { getStudentFromSheets, getGrass, SheetsStudentData, SheetsGrassData } from '../services/sheets';
import {
  Cookie,
  RefreshCw,
  Loader2,
  LogOut,
  Award,
  User,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface StudentDashboardNewProps {
  onLogout?: () => void;
}

export function StudentDashboardNew({ onLogout }: StudentDashboardNewProps) {
  const { studentCode, studentClassName, logout } = useAuth();

  // 상태
  const [studentInfo, setStudentInfo] = useState<SheetsStudentData | null>(null);
  const [grassData, setGrassData] = useState<SheetsGrassData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 학생 정보 로드
  useEffect(() => {
    if (studentCode && studentClassName) {
      loadStudentData();
    }
  }, [studentCode, studentClassName]);

  // 학생 데이터 로드
  const loadStudentData = async () => {
    if (!studentCode || !studentClassName) return;

    setLoading(true);
    setError('');

    try {
      // 학생 정보 조회
      const studentResponse = await getStudentFromSheets(studentCode, studentClassName);

      if (studentResponse.success && studentResponse.data) {
        setStudentInfo(studentResponse.data);

        // 잔디 데이터 조회
        const grassResponse = await getGrass(studentCode, studentClassName);
        if (grassResponse.success && grassResponse.data) {
          setGrassData(grassResponse.data);
        }
      } else {
        setError(studentResponse.message || '학생 정보를 불러올 수 없습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    logout();
    onLogout?.();
  };

  // 최근 7일 잔디 데이터
  const recentGrass = grassData
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 7);

  // 오늘 날짜
  const today = new Date().toISOString().split('T')[0];
  const todayGrass = grassData.find(g => g.date === today);

  // 로딩 중
  if (loading && !studentInfo) {
    return (
      <PageLayout title="학생 대시보드" role="student">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
            <p className="text-gray-600">학생 정보를 불러오는 중...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // 오류 발생
  if (error && !studentInfo) {
    return (
      <PageLayout title="학생 대시보드" role="student">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-900 font-medium">오류가 발생했습니다</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <Button onClick={loadStudentData} className="mt-4" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  다시 시도
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  // 뱃지 목록
  const earnedBadges = studentInfo?.badges
    ? Object.values(studentInfo.badges).filter(b => b.hasBadge)
    : [];

  return (
    <PageLayout title="학습 대시보드" role="student">
      <div className="space-y-6">
        {/* 헤더 */}
        <Card className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white mb-2">안녕하세요, {studentInfo?.name || '학생'}님!</h2>
              <p className="text-blue-100">
                {studentClassName} | 번호: {studentInfo?.number}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadStudentData} variant="secondary" size="sm" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
              <Button onClick={handleLogout} variant="secondary" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </Card>

        {/* 주요 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Cookie className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">보유 쿠키</p>
                  <p className="text-2xl font-bold">{studentInfo?.cookie || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">오늘 잔디</p>
                  <p className="text-xl font-bold">
                    {todayGrass?.completed ? (
                      <Badge variant="default" className="bg-green-600">완료 ✓</Badge>
                    ) : (
                      <Badge variant="secondary">미완료</Badge>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Award className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">초코칩</p>
                  <p className="text-2xl font-bold">{studentInfo?.chocoChips || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 쿠키 상세 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5" />
              쿠키 상세
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">전체 쿠키</span>
                <span className="font-medium">{studentInfo?.cookie || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">사용한 쿠키</span>
                <span className="font-medium text-red-600">-{studentInfo?.usedCookie || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600 font-bold">남은 쿠키</span>
                <span className="text-xl font-bold text-green-600">{studentInfo?.totalCookie || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 뱃지 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                내 뱃지
              </CardTitle>
              <Badge variant="outline">
                {earnedBadges.length}개 획득
              </Badge>
            </div>
            <CardDescription>
              미션을 완료하고 뱃지를 모아보세요!
            </CardDescription>
          </CardHeader>
          <CardContent>
            {earnedBadges.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {earnedBadges.map((badge, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center p-3 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border border-amber-200"
                  >
                    <img
                      src={badge.imgUrl}
                      alt={badge.title}
                      className="w-12 h-12 rounded-full mb-2"
                    />
                    <span className="text-xs text-center font-medium text-gray-700">
                      {badge.title}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>아직 획득한 뱃지가 없습니다</p>
                <p className="text-sm mt-1">미션을 완료하고 뱃지를 획득해보세요!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 최근 활동 (잔디) */}
        <Card>
          <CardHeader>
            <CardTitle>최근 활동 (최근 7일)</CardTitle>
            <CardDescription>
              미션 완료 여부를 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentGrass.length === 0 ? (
              <p className="text-center text-gray-500 py-8">아직 활동 기록이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {recentGrass.map((grass, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          grass.completed ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-sm font-medium">{grass.date}</span>
                      <Badge variant="outline" className="text-xs">
                        {grass.missionType === 'team' ? '팀 미션' : '개인 미션'}
                      </Badge>
                    </div>
                    {grass.completed ? (
                      <Badge variant="default" className="bg-green-600">완료</Badge>
                    ) : (
                      <Badge variant="secondary">미완료</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 학생 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              내 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">학생 코드</span>
                <span className="font-mono font-medium">{studentCode}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">이름</span>
                <span className="font-medium">{studentInfo?.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">번호</span>
                <span className="font-medium">{studentInfo?.number}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">마지막 업데이트</span>
                <span className="text-xs text-gray-500">{studentInfo?.lastUpdate || '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
