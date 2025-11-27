import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { mockWeekReport, mockTeams } from '../utils/mockData';
import { 
  BarChart3, 
  Download, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Users,
  Cookie
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface AdminReportProps {
  onNavigate?: (page: string) => void;
}

export function AdminReport({ onNavigate }: AdminReportProps) {
  const report = mockWeekReport;

  const handleDownload = () => {
    toast.success('리포트가 다운로드되었습니다');
  };

  const handleDownloadSheets = () => {
    toast.success('Sheets 데이터가 다운로드되었습니다');
  };

  const successCount = report.teamResults.filter(t => t.missionSuccess).length;
  const failCount = report.teamResults.length - successCount;

  return (
    <PageLayout 
      title="주간 리포트" 
      role="admin"
      showBack
      onBack={() => onNavigate?.('admin')}
    >
      <div className="space-y-6">
        {/* 헤더 */}
        <Card className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white mb-2">주간 리포트</h2>
              <p className="text-blue-100">Week {report.weekId.split('-')[1]}</p>
            </div>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              리포트 다운로드
            </button>
          </div>
        </Card>

        {/* 주요 지표 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">미션 성공</p>
                <p className="text-2xl">{successCount}팀</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">미션 실패</p>
                <p className="text-2xl">{failCount}팀</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">개인 미션</p>
                <p className="text-2xl">{report.personalMissionRate}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Cookie className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">평균 증가</p>
                <p className="text-2xl">+{report.avgCookieChange}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* 팀별 미션 결과 */}
        <div>
          <h3 className="mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            팀별 미션 결과
          </h3>
          <div className="space-y-4">
            {report.teamResults.map((result, index) => {
              const team = mockTeams.find(t => t.id === result.teamId);
              
              return (
                <Card key={result.teamId} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-3xl">{team?.flag}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4>{result.teamName}</h4>
                          {result.missionSuccess ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              성공
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="w-3 h-3 mr-1" />
                              실패
                            </Badge>
                          )}
                        </div>

                        {/* 참여율 바 */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">참여율</span>
                            <span>{result.participationRate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                result.participationRate >= 80
                                  ? 'bg-green-600'
                                  : result.participationRate >= 50
                                  ? 'bg-yellow-600'
                                  : 'bg-red-600'
                              }`}
                              style={{ width: `${result.participationRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 쿠키 변화 그래프 (시각화) */}
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            쿠키 변화 추이
          </h3>
          <div className="h-64 flex items-end justify-around gap-2 border-b border-l p-4">
            {mockTeams.map((team, index) => {
              const height = (team.earnedRound / 3500) * 100;
              return (
                <div key={team.id} className="flex flex-col items-center flex-1">
                  <div className="flex flex-col items-center justify-end h-48 w-full">
                    <div className="text-sm text-gray-600 mb-2">
                      {team.earnedRound.toLocaleString()}
                    </div>
                    <div
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all hover:opacity-80"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <div className="text-center mt-2">
                    <div className="text-xl">{team.flag}</div>
                    <div className="text-xs text-gray-500">{team.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 잔디 변화 통계 */}
        <Card className="p-6">
          <h3 className="mb-4">잔디 변화 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">이번주 완료</p>
              <p className="text-2xl text-green-600">78.2%</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">지난주 대비</p>
              <p className="text-2xl text-blue-600">+5.3%</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">평균 연속</p>
              <p className="text-2xl text-purple-600">4.2일</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">최고 연속</p>
              <p className="text-2xl text-orange-600">23일</p>
            </div>
          </div>
        </Card>

        {/* Sheets 데이터 */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3>Sheets 데이터 다운로드</h3>
            <button
              onClick={handleDownloadSheets}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV 다운로드
            </button>
          </div>
          <p className="text-sm text-gray-600">
            전체 학생의 스냅샷 데이터, 미션 수행 기록, 잔디 데이터를 CSV 파일로 다운로드할 수 있습니다.
          </p>
        </Card>

        {/* 돌아가기 */}
        <button
          onClick={() => onNavigate?.('admin')}
          className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          대시보드로 돌아가기
        </button>
      </div>
    </PageLayout>
  );
}
