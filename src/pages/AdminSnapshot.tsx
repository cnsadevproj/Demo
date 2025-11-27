import React, { useState } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { mockUsers, mockTeams } from '../utils/mockData';
import { Camera, Calendar, Cookie, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface AdminSnapshotProps {
  onNavigate?: (page: string) => void;
}

interface SnapshotData {
  userId: string;
  name: string;
  teamId: string;
  bMon: number;
  bWed?: number;
  earnedRound?: number;
}

export function AdminSnapshot({ onNavigate }: AdminSnapshotProps) {
  const [snapshots, setSnapshots] = useState<SnapshotData[]>([]);
  const [hasMondaySnapshot, setHasMondaySnapshot] = useState(false);
  const [hasWednesdaySnapshot, setHasWednesdaySnapshot] = useState(false);

  const students = mockUsers.filter(u => u.role === 'student');

  const handleMondaySnapshot = () => {
    // 실제로는 API를 호출하여 쿠키 잔액을 가져옴
    const mockData: SnapshotData[] = students.map((student, index) => ({
      userId: student.id,
      name: student.name,
      teamId: mockTeams[index % mockTeams.length].id,
      bMon: Math.floor(Math.random() * 5000) + 3000, // 3000-8000 사이 랜덤값
    }));

    setSnapshots(mockData);
    setHasMondaySnapshot(true);
    toast.success('월요일 스냅샷(B_mon)이 저장되었습니다');
  };

  const handleWednesdaySnapshot = () => {
    if (!hasMondaySnapshot) {
      toast.error('먼저 월요일 스냅샷을 실행해주세요');
      return;
    }

    // 수요일 스냅샷 및 earned_round 계산
    const updatedSnapshots = snapshots.map(snap => {
      const bWed = snap.bMon + Math.floor(Math.random() * 2000) + 500; // 월요일보다 500-2500 증가
      const earnedRound = Math.max(0, bWed - snap.bMon);
      
      return {
        ...snap,
        bWed,
        earnedRound,
      };
    });

    setSnapshots(updatedSnapshots);
    setHasWednesdaySnapshot(true);
    toast.success('수요일 스냅샷(B_wed) 및 라운드 쿠키가 계산되었습니다');
  };

  // 팀별 평균 라운드 쿠키 계산
  const teamAverages = mockTeams.map(team => {
    const teamSnapshots = snapshots.filter(s => s.teamId === team.id);
    const totalEarned = teamSnapshots.reduce((sum, s) => sum + (s.earnedRound || 0), 0);
    const avgEarned = teamSnapshots.length > 0 ? Math.round(totalEarned / teamSnapshots.length) : 0;
    
    return {
      teamId: team.id,
      teamName: team.name,
      teamFlag: team.flag,
      memberCount: teamSnapshots.length,
      totalEarned,
      avgEarned,
    };
  });

  return (
    <PageLayout 
      title="스냅샷 관리" 
      role="admin"
      showBack
      onBack={() => onNavigate?.('admin')}
    >
      <div className="space-y-6">
        {/* 안내 */}
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="mb-2 text-yellow-900">스냅샷 실행 안내</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• <strong>월요일 오전</strong>: B_mon 스냅샷 - 주간 쿠키 기준점 설정</li>
                <li>• <strong>수요일 오전</strong>: B_wed 스냅샷 - 라운드 쿠키 자동 계산</li>
                <li>• 라운드 쿠키 = max(0, B_wed - B_mon)</li>
                <li>• 팀별 평균 라운드 쿠키를 공격/방어에 사용</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* 스냅샷 실행 버튼 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="mb-1">월요일 스냅샷</h3>
                <p className="text-sm text-gray-600">주간 시작 쿠키 잔액 기록</p>
              </div>
            </div>
            
            <button
              onClick={handleMondaySnapshot}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              B_mon 스냅샷 실행
            </button>
            
            {hasMondaySnapshot && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-900 text-center">✓ 실행 완료</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Cookie className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="mb-1">수요일 스냅샷</h3>
                <p className="text-sm text-gray-600">라운드 쿠키 계산</p>
              </div>
            </div>
            
            <button
              onClick={handleWednesdaySnapshot}
              disabled={!hasMondaySnapshot}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              B_wed 스냅샷 실행
            </button>
            
            {hasWednesdaySnapshot && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-900 text-center">✓ 실행 완료</p>
              </div>
            )}
          </Card>
        </div>

        {/* 팀별 평균 라운드 쿠키 */}
        {hasWednesdaySnapshot && (
          <div>
            <h3 className="mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              팀별 평균 라운드 쿠키
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {teamAverages.map(team => (
                <Card key={team.teamId} className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{team.teamFlag}</span>
                    <div>
                      <h4>{team.teamName}</h4>
                      <p className="text-sm text-gray-500">{team.memberCount}명</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">총합</span>
                      <span>{team.totalEarned.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span>평균</span>
                      <span className="text-lg text-amber-600">{team.avgEarned.toLocaleString()}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 개별 학생 데이터 */}
        {snapshots.length > 0 && (
          <div>
            <h3 className="mb-4">개별 학생 스냅샷 데이터</h3>
            <Card className="p-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">학생</th>
                    <th className="text-left py-2 px-3">팀</th>
                    <th className="text-right py-2 px-3">B_mon</th>
                    {hasWednesdaySnapshot && (
                      <>
                        <th className="text-right py-2 px-3">B_wed</th>
                        <th className="text-right py-2 px-3">Earned</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map(snap => {
                    const team = mockTeams.find(t => t.id === snap.teamId);
                    return (
                      <tr key={snap.userId} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3">{snap.name}</td>
                        <td className="py-2 px-3">
                          <Badge variant="secondary" className="text-xs">
                            {team?.flag} {team?.name}
                          </Badge>
                        </td>
                        <td className="text-right py-2 px-3">{snap.bMon.toLocaleString()}</td>
                        {hasWednesdaySnapshot && (
                          <>
                            <td className="text-right py-2 px-3">{snap.bWed?.toLocaleString()}</td>
                            <td className="text-right py-2 px-3 text-green-600">
                              +{snap.earnedRound?.toLocaleString()}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )}

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
