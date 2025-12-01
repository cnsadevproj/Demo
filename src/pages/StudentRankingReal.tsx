import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { getMultipleStudentsInfo, StudentInfo, StoredStudent } from '../services/firestoreApi';
import { StudentRankingTable, convertToRankedStudents, RankedStudent } from '../components/StudentRankingTable';
import { Progress } from '../components/ui/progress';
import {
  Trophy,
  RefreshCw,
  Loader2,
  Cookie,
  Award,
  Info,
  TrendingUp,
} from 'lucide-react';

interface StudentRankingRealProps {
  apiKey: string;
  studentCode: string;
  students: StoredStudent[];
  onBack?: () => void;
}

export function StudentRankingReal({
  apiKey,
  studentCode,
  students,
  onBack,
}: StudentRankingRealProps) {
  const [studentInfoMap, setStudentInfoMap] = useState<Map<string, StudentInfo | null>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [rankedStudents, setRankedStudents] = useState<RankedStudent[]>([]);

  // 학생 정보 로드
  const loadStudentInfo = async () => {
    if (!apiKey || students.length === 0) return;

    setLoading(true);
    setLoadingProgress({ current: 0, total: students.length });

    try {
      const codes = students.map(s => s.code);
      const results = await getMultipleStudentsInfo(apiKey, codes, (current, total) => {
        setLoadingProgress({ current, total });
      });
      setStudentInfoMap(results);

      // 랭킹 계산
      const ranked = convertToRankedStudents(results, students);
      setRankedStudents(ranked);
    } catch (error) {
      console.error('학생 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    loadStudentInfo();
  }, [apiKey, students]);

  // 현재 학생 정보
  const currentStudent = rankedStudents.find(s => s.code === studentCode);
  const totalStudents = rankedStudents.length;

  // 상위 퍼센트 계산
  const topPercent = currentStudent && totalStudents > 0
    ? Math.round((currentStudent.rank / totalStudents) * 100)
    : 0;

  return (
    <PageLayout
      title="쿠키 랭킹"
      role="student"
      showBack
      onBack={onBack}
    >
      <div className="space-y-6">
        {/* 헤더 */}
        <Card className="p-6 bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8" />
            <h2 className="text-white">클래스 쿠키 랭킹</h2>
          </div>
          <p className="text-yellow-100">
            쿠키를 가장 많이 모은 학생들의 순위입니다
          </p>
        </Card>

        {/* 로딩 */}
        {loading && (
          <Card className="p-6">
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">학생 정보를 불러오는 중...</p>
              <Progress value={(loadingProgress.current / loadingProgress.total) * 100} />
              <p className="text-sm text-gray-400 mt-2">
                {loadingProgress.current} / {loadingProgress.total}
              </p>
            </div>
          </Card>
        )}

        {/* 내 순위 */}
        {!loading && currentStudent && (
          <Card className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <h3 className="text-white mb-4">내 순위</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">전체 {totalStudents}명 중</p>
                <p className="text-4xl font-bold text-white">{currentStudent.rank}등</p>
              </div>
              <div className="text-right">
                <Badge className="bg-white text-blue-600 px-4 py-2 text-lg">
                  상위 {topPercent}%
                </Badge>
                <div className="flex items-center gap-1 justify-end mt-2">
                  <Cookie className="w-5 h-5 text-yellow-300" />
                  <span className="text-xl">{currentStudent.cookie.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 안내 */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="mb-2">
                <strong>쿠키 랭킹 안내</strong>
              </p>
              <ul className="space-y-1 text-blue-800">
                <li>• 다했니? 활동을 통해 쿠키를 모을 수 있습니다</li>
                <li>• 쿠키가 많을수록 순위가 높아집니다</li>
                <li>• 동점자는 같은 순위로 표시됩니다</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* TOP 3 */}
        {!loading && rankedStudents.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  TOP 10
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
                상위 10명과 내 순위를 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StudentRankingTable
                students={rankedStudents}
                currentStudentCode={studentCode}
                showTop={10}
              />
            </CardContent>
          </Card>
        )}

        {/* 나의 상세 정보 */}
        {!loading && currentStudent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                나의 쿠키 현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-amber-50 rounded-lg text-center">
                  <Cookie className="w-6 h-6 mx-auto text-amber-600 mb-2" />
                  <p className="text-sm text-gray-500 mb-1">총 쿠키</p>
                  <p className="text-2xl font-bold">{currentStudent.cookie}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg text-center">
                  <TrendingUp className="w-6 h-6 mx-auto text-orange-600 mb-2" />
                  <p className="text-sm text-gray-500 mb-1">사용한 쿠키</p>
                  <p className="text-2xl font-bold text-orange-600">{currentStudent.usedCookie}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <Cookie className="w-6 h-6 mx-auto text-green-600 mb-2" />
                  <p className="text-sm text-gray-500 mb-1">남은 쿠키</p>
                  <p className="text-2xl font-bold text-green-600">{currentStudent.totalCookie}</p>
                </div>
              </div>

              {/* 뱃지 */}
              {currentStudent.badges.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">획득한 뱃지</h4>
                  <div className="flex gap-3 flex-wrap">
                    {currentStudent.badges.map((badge, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <img
                          src={badge.imgUrl}
                          alt={badge.title}
                          className="w-12 h-12 rounded-full mb-2"
                        />
                        <span className="text-xs text-center">{badge.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 격려 메시지 */}
        <Card className="p-6 bg-gradient-to-r from-green-100 to-emerald-100">
          <h3 className="mb-2">계속 성장 중!</h3>
          <p className="text-gray-700">
            순위보다 중요한 것은 꾸준한 노력입니다.
            오늘도 작은 목표를 달성해보세요!
          </p>
        </Card>

        {/* 돌아가기 */}
        <Button
          variant="outline"
          className="w-full"
          onClick={onBack}
        >
          돌아가기
        </Button>
      </div>
    </PageLayout>
  );
}
