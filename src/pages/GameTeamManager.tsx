import React, { useState } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { TEAM_FLAGS, GameTeam } from '../types/game';
import {
  Users,
  Plus,
  Trash2,
  Cookie,
  Edit2,
  Save,
  X,
  Shuffle,
  Gift,
} from 'lucide-react';

interface GameTeamManagerProps {
  onBack?: () => void;
}

export function GameTeamManager({ onBack }: GameTeamManagerProps) {
  const { teams, createTeam, updateTeam, deleteTeam, addBonusCookies, clearTeams } = useGame();
  const { selectedClass, getClassStudents } = useAuth();

  const [isCreating, setIsCreating] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamFlag, setNewTeamFlag] = useState(TEAM_FLAGS[0]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [bonusAmount, setBonusAmount] = useState(100);
  const [showBonusModal, setShowBonusModal] = useState<string | null>(null);

  // 클래스 학생 목록
  const classStudents = selectedClass ? getClassStudents(selectedClass) : [];

  // 이미 팀에 배정된 학생 코드
  const assignedStudentCodes = teams.flatMap(t => t.memberCodes);

  // 미배정 학생
  const unassignedStudents = classStudents.filter(
    s => !assignedStudentCodes.includes(s.code)
  );

  // 팀 생성
  const handleCreateTeam = () => {
    if (!newTeamName.trim() || selectedMembers.length === 0) return;

    const memberNames = selectedMembers.map(code => {
      const student = classStudents.find(s => s.code === code);
      return student?.name || code;
    });

    createTeam(newTeamName, newTeamFlag, selectedMembers, memberNames);

    // 초기화
    setNewTeamName('');
    setNewTeamFlag(TEAM_FLAGS[0]);
    setSelectedMembers([]);
    setIsCreating(false);
  };

  // 랜덤 팀 생성
  const handleRandomTeams = (teamCount: number) => {
    if (unassignedStudents.length === 0) return;

    // 기존 팀 초기화
    clearTeams();

    // 학생 섞기
    const shuffled = [...classStudents].sort(() => Math.random() - 0.5);
    const studentsPerTeam = Math.ceil(shuffled.length / teamCount);

    for (let i = 0; i < teamCount; i++) {
      const start = i * studentsPerTeam;
      const members = shuffled.slice(start, start + studentsPerTeam);

      if (members.length > 0) {
        createTeam(
          `${i + 1}팀`,
          TEAM_FLAGS[i % TEAM_FLAGS.length],
          members.map(m => m.code),
          members.map(m => m.name)
        );
      }
    }
  };

  // 보너스 쿠키 추가
  const handleAddBonus = (teamId: string) => {
    addBonusCookies(teamId, bonusAmount);
    setShowBonusModal(null);
    setBonusAmount(100);
  };

  // 멤버 토글
  const toggleMember = (code: string) => {
    setSelectedMembers(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  return (
    <PageLayout title="팀 관리" role="admin" showBack onBack={onBack}>
      <div className="space-y-6">
        {/* 헤더 */}
        <Card className="p-6 bg-gradient-to-r from-purple-500 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white mb-2">쿠키 배틀 팀 관리</h2>
              <p className="text-purple-100">
                {selectedClass || '클래스를 먼저 선택하세요'} - {teams.length}팀
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-8 h-8" />
              <span className="text-2xl">{assignedStudentCodes.length}/{classStudents.length}</span>
            </div>
          </div>
        </Card>

        {/* 빠른 팀 생성 */}
        {classStudents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="w-5 h-5" />
                빠른 팀 생성
              </CardTitle>
              <CardDescription>
                학생들을 랜덤으로 팀에 배정합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[2, 3, 4, 5, 6].map(count => (
                  <Button
                    key={count}
                    variant="outline"
                    onClick={() => {
                      if (window.confirm(`${count}개 팀으로 랜덤 배정하시겠습니까? 기존 팀은 삭제됩니다.`)) {
                        handleRandomTeams(count);
                      }
                    }}
                  >
                    {count}팀으로 나누기
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 팀 목록 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3>팀 목록</h3>
            <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
              <Plus className="w-4 h-4 mr-2" />
              팀 추가
            </Button>
          </div>

          {/* 새 팀 생성 폼 */}
          {isCreating && (
            <Card className="border-2 border-dashed border-purple-300">
              <CardHeader>
                <CardTitle>새 팀 만들기</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  {/* 팀 이모지 선택 */}
                  <div>
                    <label className="block text-sm mb-2">팀 아이콘</label>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {TEAM_FLAGS.map(flag => (
                        <button
                          key={flag}
                          onClick={() => setNewTeamFlag(flag)}
                          className={`text-2xl p-1 rounded ${
                            newTeamFlag === flag
                              ? 'bg-purple-100 ring-2 ring-purple-500'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {flag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 팀 이름 */}
                  <div className="flex-1">
                    <label className="block text-sm mb-2">팀 이름</label>
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={e => setNewTeamName(e.target.value)}
                      placeholder="예: 불꽃 피닉스"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* 멤버 선택 */}
                <div>
                  <label className="block text-sm mb-2">
                    팀원 선택 ({selectedMembers.length}명)
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                    {unassignedStudents.map(student => (
                      <Badge
                        key={student.code}
                        variant={selectedMembers.includes(student.code) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleMember(student.code)}
                      >
                        {student.number}. {student.name}
                      </Badge>
                    ))}
                    {unassignedStudents.length === 0 && (
                      <p className="text-gray-500 text-sm">모든 학생이 팀에 배정되었습니다</p>
                    )}
                  </div>
                </div>

                {/* 버튼 */}
                <div className="flex gap-2">
                  <Button onClick={handleCreateTeam} disabled={!newTeamName.trim() || selectedMembers.length === 0}>
                    <Save className="w-4 h-4 mr-2" />
                    팀 생성
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setIsCreating(false);
                    setNewTeamName('');
                    setSelectedMembers([]);
                  }}>
                    <X className="w-4 h-4 mr-2" />
                    취소
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 기존 팀 목록 */}
          {teams.map(team => (
            <Card key={team.id} className="relative">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{team.flag}</span>
                    <div>
                      <h3 className="text-lg font-semibold">{team.name}</h3>
                      <p className="text-sm text-gray-500">{team.memberNames.length}명</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* 쿠키 정보 */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-600">
                        <Cookie className="w-5 h-5" />
                        <span className="text-xl font-bold">{team.totalCookies}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        기본 {team.baseCookies} + 보너스 {team.bonusCookies}
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowBonusModal(team.id)}
                        title="보너스 쿠키"
                      >
                        <Gift className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (window.confirm('이 팀을 삭제하시겠습니까?')) {
                            deleteTeam(team.id);
                          }
                        }}
                        title="팀 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 팀원 목록 */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {team.memberNames.map((name, idx) => (
                    <Badge key={idx} variant="secondary">
                      {name}
                    </Badge>
                  ))}
                </div>
              </CardContent>

              {/* 보너스 모달 */}
              {showBonusModal === team.id && (
                <div className="absolute inset-0 bg-white/95 rounded-lg flex items-center justify-center">
                  <div className="p-6 text-center">
                    <h4 className="mb-4">보너스 쿠키 추가</h4>
                    <div className="flex items-center gap-2 justify-center mb-4">
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
                        className="w-24 text-center px-2 py-1 border rounded"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBonusAmount(prev => prev + 50)}
                      >
                        +50
                      </Button>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => handleAddBonus(team.id)}>
                        <Cookie className="w-4 h-4 mr-2" />
                        추가
                      </Button>
                      <Button variant="outline" onClick={() => setShowBonusModal(null)}>
                        취소
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}

          {teams.length === 0 && !isCreating && (
            <Card className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">팀이 없습니다</h3>
              <p className="text-gray-500 mb-4">
                위의 "빠른 팀 생성"을 사용하거나 수동으로 팀을 만드세요
              </p>
            </Card>
          )}
        </div>

        {/* 미배정 학생 */}
        {unassignedStudents.length > 0 && teams.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-700">
                미배정 학생 ({unassignedStudents.length}명)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {unassignedStudents.map(student => (
                  <Badge key={student.code} variant="outline" className="bg-white">
                    {student.number}. {student.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
