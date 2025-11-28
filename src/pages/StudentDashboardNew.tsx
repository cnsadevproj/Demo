import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { getStudentInfo, StudentInfo } from '../services/api';
import {
  Cookie,
  RefreshCw,
  Loader2,
  LogOut,
  Award,
  User,
  KeyRound,
  AlertCircle,
} from 'lucide-react';

interface StudentDashboardNewProps {
  onLogout?: () => void;
}

// 학생용 API 키 저장 키
const STUDENT_API_KEY_STORAGE = 'dahandin_student_api_key';

export function StudentDashboardNew({ onLogout }: StudentDashboardNewProps) {
  const { studentCode, logout } = useAuth();

  // 상태
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // 초기 로드: 저장된 API 키 복원
  useEffect(() => {
    const savedApiKey = localStorage.getItem(STUDENT_API_KEY_STORAGE);
    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      setShowApiKeyInput(true);
    }
  }, []);

  // API 키가 있으면 학생 정보 로드
  useEffect(() => {
    if (apiKey && studentCode) {
      loadStudentInfo();
    }
  }, [apiKey, studentCode]);

  // 학생 정보 로드
  const loadStudentInfo = async () => {
    if (!apiKey || !studentCode) return;

    setLoading(true);
    setError('');

    try {
      const response = await getStudentInfo(apiKey, studentCode);
      if (response.result && response.data) {
        setStudentInfo(response.data);
        setShowApiKeyInput(false);
      } else {
        setError(response.message || '학생 정보를 불러올 수 없습니다.');
        setStudentInfo(null);
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // API 키 저장
  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      const key = apiKeyInput.trim();
      setApiKey(key);
      localStorage.setItem(STUDENT_API_KEY_STORAGE, key);
      setApiKeyInput('');
    }
  };

  // API 키 변경
  const handleChangeApiKey = () => {
    setShowApiKeyInput(true);
    setApiKeyInput(apiKey);
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    logout();
    onLogout?.();
  };

  // 뱃지 목록 (보유한 것만)
  const earnedBadges = studentInfo
    ? Object.values(studentInfo.badges).filter(b => b.hasBadge)
    : [];

  return (
    <PageLayout title="내 정보" role="student">
      <div className="space-y-6">
        {/* 헤더 */}
        <Card className="p-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-full">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-white mb-1">
                  {studentInfo ? studentInfo.name : '학생'} 님
                </h2>
                <p className="text-green-100">
                  학생 코드: <code className="bg-white/20 px-2 py-1 rounded">{studentCode}</code>
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>
        </Card>

        {/* API 키 입력 (필요시) */}
        {showApiKeyInput && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                API 키 입력
              </CardTitle>
              <CardDescription>
                선생님께 받은 API 키를 입력하면 실시간 정보를 확인할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  type="password"
                  placeholder="API 키 입력"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSaveApiKey}>
                  저장
                </Button>
                {apiKey && (
                  <Button variant="outline" onClick={() => setShowApiKeyInput(false)}>
                    취소
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 에러 메시지 */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleChangeApiKey}
                className="ml-auto"
              >
                API 키 변경
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 로딩 */}
        {loading && (
          <Card className="p-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-gray-400" />
            <p className="mt-4 text-gray-500">정보를 불러오는 중...</p>
          </Card>
        )}

        {/* 학생 정보 */}
        {studentInfo && !loading && (
          <>
            {/* 쿠키 현황 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <Cookie className="w-8 h-8 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">총 쿠키</p>
                    <p className="text-3xl font-bold">{studentInfo.cookie}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Cookie className="w-8 h-8 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">사용한 쿠키</p>
                    <p className="text-3xl font-bold text-orange-600">{studentInfo.usedCookie}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Cookie className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">남은 쿠키</p>
                    <p className="text-3xl font-bold text-green-600">{studentInfo.totalCookie}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* 뱃지 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    내 뱃지
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadStudentInfo}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    새로고침
                  </Button>
                </div>
                <CardDescription>
                  획득한 뱃지: {earnedBadges.length}개
                </CardDescription>
              </CardHeader>
              <CardContent>
                {earnedBadges.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {earnedBadges.map((badge, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col items-center p-4 bg-gray-50 rounded-lg"
                      >
                        <img
                          src={badge.imgUrl}
                          alt={badge.title}
                          className="w-16 h-16 rounded-full mb-2"
                        />
                        <span className="text-sm font-medium text-center">{badge.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>아직 획득한 뱃지가 없습니다</p>
                  </div>
                )}

                {/* 미획득 뱃지 */}
                {studentInfo.badges && Object.values(studentInfo.badges).some(b => !b.hasBadge) && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-3">도전할 수 있는 뱃지</h4>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {Object.values(studentInfo.badges)
                        .filter(b => !b.hasBadge)
                        .map((badge, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col items-center p-2 opacity-40"
                          >
                            <img
                              src={badge.imgUrl}
                              alt={badge.title}
                              className="w-10 h-10 rounded-full mb-1 grayscale"
                            />
                            <span className="text-xs text-center">{badge.title}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API 키 변경 버튼 */}
            {!showApiKeyInput && (
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleChangeApiKey}
                  className="text-gray-500"
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  API 키 변경
                </Button>
              </div>
            )}
          </>
        )}

        {/* API 키 없고 정보도 없을 때 */}
        {!apiKey && !loading && !showApiKeyInput && (
          <Card className="p-12 text-center">
            <KeyRound className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">API 키가 필요합니다</h3>
            <p className="text-gray-500 mb-4">
              실시간 정보를 보려면 선생님께 API 키를 요청하세요
            </p>
            <Button onClick={() => setShowApiKeyInput(true)}>
              API 키 입력하기
            </Button>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
