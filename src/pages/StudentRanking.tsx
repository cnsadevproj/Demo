import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { getCookieRanking, getGrass, SheetStudent } from '../services/sheetsApi';
import { Trophy, Info, Loader2, Cookie } from 'lucide-react';

interface StudentRankingProps {
  onNavigate?: (page: string) => void;
}

interface RankedStudent extends SheetStudent {
  rank: number;
}

export function StudentRanking({ onNavigate }: StudentRankingProps) {
  const { studentCode, studentClassName } = useAuth();

  const [ranking, setRanking] = useState<RankedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myStats, setMyStats] = useState({ totalGrass: 0, streak: 0 });

  useEffect(() => {
    const loadRanking = async () => {
      if (!studentClassName) {
        setLoading(false);
        return;
      }

      try {
        // 쿠키 랭킹 가져오기
        const rankedStudents = await getCookieRanking(studentClassName);
        setRanking(rankedStudents);

        // 내 순위 찾기
        if (studentCode) {
          const myStudent = rankedStudents.find(s => s.code === studentCode);
          if (myStudent) {
            setMyRank(myStudent.rank);
          }

          // 내 잔디 통계 가져오기
          const grassData = await getGrass(studentClassName, studentCode);
          setMyStats({
            totalGrass: grassData.length,
            streak: calculateStreak(grassData.map(g => g.date))
          });
        }
      } catch (error) {
        console.error('랭킹 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRanking();
  }, [studentClassName, studentCode]);

  // 연속 일수 계산
  const calculateStreak = (dates: string[]): number => {
    if (dates.length === 0) return 0;

    const sortedDates = [...new Set(dates)].sort().reverse();
    const today = new Date().toISOString().split('T')[0];

    let streak = 0;
    let checkDate = new Date(today);

    for (let i = 0; i < 30; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (sortedDates.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  };

  const totalStudents = ranking.length;
  const top3 = ranking.slice(0, 3);

  if (loading) {
    return (
      <PageLayout
        title="학기 성실도 랭킹"
        role="student"
        showBack
        onBack={() => onNavigate?.('dashboard')}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          랭킹 로딩 중...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title="학기 성실도 랭킹" 
      role="student"
      showBack
      onBack={() => onNavigate?.('dashboard')}
    >
      <div className="space-y-6">
        {/* 헤더 */}
        <Card className="p-6 bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8" />
            <h2 className="text-white">학기 성실도 TOP 3</h2>
          </div>
          <p className="text-yellow-100">
            개인 미션 수행 기록을 기준으로 한 순위입니다
          </p>
        </Card>

        {/* 안내 */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="mb-2">
                <strong>공정성을 위해 상위 3명만 공개됩니다.</strong>
              </p>
              <ul className="space-y-1 text-blue-800">
                <li>• 팀 운에 영향받지 않는 개인 미션 수행 기록으로 평가</li>
                <li>• 미션 수행 횟수, 성공률, 최고 연속일 등을 종합</li>
                <li>• 본인의 순위는 별도로 확인 가능</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* TOP 3 */}
        <div>
          <h3 className="mb-4">🏆 TOP 3</h3>
          {top3.length === 0 ? (
            <Card className="p-6 text-center text-gray-500">
              아직 랭킹 데이터가 없습니다.
            </Card>
          ) : (
            <div className="space-y-3">
              {top3.map((student, index) => (
                <Card
                  key={student.code}
                  className={`p-4 ${
                    student.code === studentCode
                      ? 'bg-blue-50 border-blue-300'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {student.name}
                        {student.code === studentCode && (
                          <Badge className="ml-2 bg-blue-500">나</Badge>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {student.title || '칭호 없음'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-600">
                        <Cookie className="w-5 h-5" />
                        <span className="font-bold text-lg">{student.cookie}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 내 순위 */}
        {myRank !== null && (
          <Card className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <h3 className="text-white mb-4">내 순위</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">전체 {totalStudents}명 중</p>
                <p className="text-3xl text-white">{myRank}등</p>
              </div>
              <Badge className="bg-white text-blue-600 px-4 py-2">
                상위 {totalStudents > 0 ? ((myRank / totalStudents) * 100).toFixed(0) : 0}%
              </Badge>
            </div>
          </Card>
        )}

        {/* 나의 상세 기록 */}
        <Card className="p-6">
          <h3 className="mb-4">나의 상세 기록</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">잔디 개수</p>
              <p className="text-2xl">{myStats.totalGrass}개</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">현재 연속</p>
              <p className="text-2xl">{myStats.streak}일</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">내 쿠키</p>
              <p className="text-2xl">
                {ranking.find(s => s.code === studentCode)?.cookie || 0}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">총 획득</p>
              <p className="text-2xl">
                {ranking.find(s => s.code === studentCode)?.totalCookie || 0}
              </p>
            </div>
          </div>
        </Card>

        {/* 격려 메시지 */}
        <Card className="p-6 bg-gradient-to-r from-green-100 to-emerald-100">
          <h3 className="mb-2">💪 계속 성장 중!</h3>
          <p className="text-gray-700">
            순위보다 중요한 것은 어제의 나보다 오늘의 내가 성장하는 것입니다.
            꾸준히 노력하는 모습이 멋집니다!
          </p>
        </Card>

        {/* CTA */}
        <div className="flex gap-4">
          <button
            onClick={() => onNavigate?.('grass')}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            내 잔디 보기
          </button>
          <button
            onClick={() => onNavigate?.('dashboard')}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            대시보드
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
