import React, { useState, useMemo } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Crown,
  AlertTriangle,
  Cookie,
  Plus,
  Trash2,
  Calendar,
  User,
  TrendingUp,
  TrendingDown,
  Star,
  Ban,
} from 'lucide-react';

interface ReflectionManagerProps {
  onBack?: () => void;
}

export function ReflectionManager({ onBack }: ReflectionManagerProps) {
  const {
    reflectionKings,
    reflectionPenalties,
    addReflectionKing,
    removeReflectionKing,
    addReflectionPenalty,
    removeReflectionPenalty,
    getReflectionRecords,
    settings,
    teams,
  } = useGame();

  const { selectedClass, getClassStudents } = useAuth();

  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'students'>('today');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [bonusAmount, setBonusAmount] = useState(settings.defaultBonusCookies);
  const [penaltyAmount, setPenaltyAmount] = useState(50);
  const [note, setNote] = useState('');

  // 클래스 학생 목록
  const classStudents = selectedClass ? getClassStudents(selectedClass) : [];

  // 오늘 날짜
  const today = new Date().toISOString().split('T')[0];

  // 오늘의 성찰왕
  const todayKings = reflectionKings.filter(k => k.date === today);

  // 학생별 성찰 기록
  const reflectionRecords = useMemo(() => {
    return getReflectionRecords(
      classStudents.map(s => s.code),
      classStudents.map(s => s.name)
    );
  }, [classStudents, getReflectionRecords]);

  // 미성찰 학생 (한번도 성찰왕이 된 적 없는 학생)
  const neverReflectedStudents = reflectionRecords.filter(r => r.neverReflected);

  // 성찰왕 추가
  const handleAddKing = (studentCode: string, studentName: string) => {
    addReflectionKing(studentCode, studentName, bonusAmount, note || undefined);
    setNote('');
  };

  // 미성찰 페널티 추가
  const handleAddPenalty = (studentCode: string, studentName: string) => {
    addReflectionPenalty(studentCode, studentName, penaltyAmount, '미성찰');
  };

  // 학생이 속한 팀 찾기
  const getStudentTeam = (studentCode: string) => {
    return teams.find(t => t.memberCodes.includes(studentCode));
  };

  return (
    <PageLayout title="성찰 관리" role="admin" showBack onBack={onBack}>
      <div className="space-y-6">
        {/* 헤더 */}
        <Card className="p-6 bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white mb-2">성찰왕 & 미성찰 관리</h2>
              <p className="text-yellow-100">
                {selectedClass || '클래스를 먼저 선택하세요'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <Crown className="w-8 h-8 mx-auto" />
                <span className="text-sm">성찰왕 {reflectionKings.length}회</span>
              </div>
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 mx-auto" />
                <span className="text-sm">페널티 {reflectionPenalties.length}회</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 탭 */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'today' ? 'default' : 'outline'}
            onClick={() => setActiveTab('today')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            오늘
          </Button>
          <Button
            variant={activeTab === 'students' ? 'default' : 'outline'}
            onClick={() => setActiveTab('students')}
          >
            <User className="w-4 h-4 mr-2" />
            학생별 현황
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'outline'}
            onClick={() => setActiveTab('history')}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            전체 기록
          </Button>
        </div>

        {/* 오늘 탭 */}
        {activeTab === 'today' && (
          <div className="space-y-6">
            {/* 오늘의 성찰왕 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  오늘의 성찰왕
                </CardTitle>
                <CardDescription>
                  {today} - 보너스 쿠키: {bonusAmount}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 보너스 설정 */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-500">보너스 쿠키:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBonusAmount(prev => Math.max(10, prev - 50))}
                  >
                    -50
                  </Button>
                  <input
                    type="number"
                    value={bonusAmount}
                    onChange={e => setBonusAmount(parseInt(e.target.value) || 0)}
                    className="w-20 text-center px-2 py-1 border rounded text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBonusAmount(prev => prev + 50)}
                  >
                    +50
                  </Button>
                </div>

                {/* 오늘 성찰왕 목록 */}
                {todayKings.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">선정됨:</h4>
                    <div className="flex flex-wrap gap-2">
                      {todayKings.map(king => (
                        <Badge
                          key={king.id}
                          variant="default"
                          className="bg-yellow-100 text-yellow-800 flex items-center gap-1"
                        >
                          <Crown className="w-3 h-3" />
                          {king.studentName}
                          <span className="text-xs">(+{king.bonusCookies})</span>
                          <button
                            onClick={() => removeReflectionKing(king.id)}
                            className="ml-1 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 학생 선택 */}
                <div>
                  <h4 className="text-sm font-medium mb-2">학생 선택:</h4>
                  <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                    {classStudents.map(student => {
                      const isKingToday = todayKings.some(k => k.studentCode === student.code);
                      const team = getStudentTeam(student.code);

                      return (
                        <Button
                          key={student.code}
                          variant={isKingToday ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            if (!isKingToday) {
                              handleAddKing(student.code, student.name);
                            }
                          }}
                          disabled={isKingToday}
                          className="flex items-center gap-1"
                        >
                          {isKingToday && <Crown className="w-3 h-3" />}
                          {student.number}. {student.name}
                          {team && (
                            <span className="text-xs opacity-70">({team.flag})</span>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 미성찰 페널티 */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  미성찰 페널티
                </CardTitle>
                <CardDescription>
                  한번도 성찰을 안한 학생에게 페널티를 부여합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 페널티 설정 */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-500">페널티 쿠키:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPenaltyAmount(prev => Math.max(10, prev - 10))}
                  >
                    -10
                  </Button>
                  <input
                    type="number"
                    value={penaltyAmount}
                    onChange={e => setPenaltyAmount(parseInt(e.target.value) || 0)}
                    className="w-20 text-center px-2 py-1 border rounded text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPenaltyAmount(prev => prev + 10)}
                  >
                    +10
                  </Button>
                </div>

                {/* 미성찰 학생 목록 */}
                {neverReflectedStudents.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-red-600">
                      성찰 0회 학생 ({neverReflectedStudents.length}명):
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {neverReflectedStudents.map(record => {
                        const team = getStudentTeam(record.studentCode);
                        return (
                          <Button
                            key={record.studentCode}
                            variant="outline"
                            size="sm"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (window.confirm(`${record.studentName}에게 -${penaltyAmount} 페널티를 부여하시겠습니까?`)) {
                                handleAddPenalty(record.studentCode, record.studentName);
                              }
                            }}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            {record.studentName}
                            {team && <span className="text-xs ml-1">({team.flag})</span>}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-green-600 text-sm">
                    모든 학생이 최소 1회 이상 성찰왕에 선정되었습니다!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 학생별 현황 탭 */}
        {activeTab === 'students' && (
          <Card>
            <CardHeader>
              <CardTitle>학생별 성찰 현황</CardTitle>
              <CardDescription>
                성찰왕 횟수와 페널티 기록을 확인합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">학생</th>
                      <th className="text-center p-3">팀</th>
                      <th className="text-center p-3">성찰왕</th>
                      <th className="text-center p-3">보너스</th>
                      <th className="text-center p-3">페널티</th>
                      <th className="text-center p-3">순이익</th>
                      <th className="text-center p-3">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reflectionRecords
                      .sort((a, b) => (b.totalBonus - b.totalPenalty) - (a.totalBonus - a.totalPenalty))
                      .map(record => {
                        const team = getStudentTeam(record.studentCode);
                        const netGain = record.totalBonus - record.totalPenalty;

                        return (
                          <tr key={record.studentCode} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">{record.studentName}</td>
                            <td className="p-3 text-center">
                              {team ? (
                                <span>{team.flag} {team.name}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Crown className="w-4 h-4 text-yellow-500" />
                                {record.kingCount}회
                              </div>
                            </td>
                            <td className="p-3 text-center text-green-600">
                              +{record.totalBonus}
                            </td>
                            <td className="p-3 text-center text-red-600">
                              -{record.totalPenalty}
                            </td>
                            <td className="p-3 text-center font-bold">
                              <span className={netGain >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {netGain >= 0 ? '+' : ''}{netGain}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {record.neverReflected ? (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  미성찰
                                </Badge>
                              ) : record.kingCount >= 3 ? (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  우수
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  정상
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 전체 기록 탭 */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* 성찰왕 기록 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  성찰왕 기록
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reflectionKings.length > 0 ? (
                  <div className="space-y-2">
                    {[...reflectionKings]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map(king => (
                        <div
                          key={king.id}
                          className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Crown className="w-5 h-5 text-yellow-500" />
                            <div>
                              <span className="font-medium">{king.studentName}</span>
                              <span className="text-sm text-gray-500 ml-2">{king.date}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800">
                              +{king.bonusCookies}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeReflectionKing(king.id)}
                            >
                              <Trash2 className="w-4 h-4 text-gray-400" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">기록이 없습니다</p>
                )}
              </CardContent>
            </Card>

            {/* 페널티 기록 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  페널티 기록
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reflectionPenalties.length > 0 ? (
                  <div className="space-y-2">
                    {[...reflectionPenalties]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map(penalty => (
                        <div
                          key={penalty.id}
                          className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <div>
                              <span className="font-medium">{penalty.studentName}</span>
                              <span className="text-sm text-gray-500 ml-2">{penalty.date}</span>
                              <span className="text-sm text-red-600 ml-2">({penalty.reason})</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">
                              -{penalty.penaltyCookies}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeReflectionPenalty(penalty.id)}
                            >
                              <Trash2 className="w-4 h-4 text-gray-400" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">기록이 없습니다</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
