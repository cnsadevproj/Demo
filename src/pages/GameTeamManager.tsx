import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { TEAM_FLAGS, GameTeam } from '../types/game';
import { getClassStudents, SheetStudent } from '../services/sheetsApi';
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
  UserPlus,
  UserMinus,
  RefreshCw,
  Loader2,
} from 'lucide-react';

// 랜덤 팀 이름 생성용 단어
const TEAM_ADJECTIVES = [
  '불꽃', '번개', '천둥', '폭풍', '태양', '달빛', '별빛', '은하', '우주', '빛나는',
  '용감한', '지혜로운', '강철', '황금', '다이아', '전설의', '무적의', '최강', '빠른', '멋진',
];

const TEAM_NOUNS = [
  '드래곤', '피닉스', '유니콘', '타이거', '라이온', '이글', '울프', '베어', '폭스', '팬더',
  '기사단', '탐험대', '전사들', '영웅들', '챔피언', '스타즈', '레전드', '히어로즈', '파이터', '윈너즈',
];

function generateRandomTeamName(): string {
  const adj = TEAM_ADJECTIVES[Math.floor(Math.random() * TEAM_ADJECTIVES.length)];
  const noun = TEAM_NOUNS[Math.floor(Math.random() * TEAM_NOUNS.length)];
  return `${adj} ${noun}`;
}

interface GameTeamManagerProps {
  onNavigate?: (page: string) => void;
}

export function GameTeamManager({ onNavigate }: GameTeamManagerProps) {
  const { teams, createTeam, updateTeam, deleteTeam, addBonusCookies, clearTeams } = useGame();
  const { studentClassName } = useAuth();

  const [isCreating, setIsCreating] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamFlag, setNewTeamFlag] = useState(TEAM_FLAGS[0]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [bonusAmount, setBonusAmount] = useState(100);
  const [showBonusModal, setShowBonusModal] = useState<string | null>(null);
  const [membersPerTeam, setMembersPerTeam] = useState(4);

  // 학생 목록 로드
  const [classStudents, setClassStudents] = useState<SheetStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudents = async () => {
      if (!studentClassName) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const students = await getClassStudents(studentClassName);
        setClassStudents(students);
      } catch (error) {
        console.error('학생 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStudents();
  }, [studentClassName]);

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
    setNewTeamFlag(TEAM_FLAGS[Math.floor(Math.random() * TEAM_FLAGS.length)]);
    setSelectedMembers([]);
    setIsCreating(false);
  };

  // 자동 팀 배정 (3-5명, 기본 4명)
  const handleAutoAssign = () => {
    if (classStudents.length === 0) return;

    // 기존 팀 초기화
    clearTeams();

    // 학생 섞기
    const shuffled = [...classStudents].sort(() => Math.random() - 0.5);

    // 팀 수 계산
    const teamCount = Math.ceil(shuffled.length / membersPerTeam);

    // 팀별 학생 배분
    const teamStudents: SheetStudent[][] = Array.from({ length: teamCount }, () => []);

    shuffled.forEach((student, index) => {
      const teamIndex = index % teamCount;
      teamStudents[teamIndex].push(student);
    });

    // 팀 생성
    teamStudents.forEach((members, index) => {
      if (members.length > 0) {
        createTeam(
          generateRandomTeamName(),
          TEAM_FLAGS[index % TEAM_FLAGS.length],
          members.map(m => m.code),
          members.map(m => m.name)
        );
      }
    });
  };

  // 팀 이름 랜덤 변경
  const handleRandomizeName = (teamId: string) => {
    updateTeam(teamId, { name: generateRandomTeamName() });
  };

  // 팀에 멤버 추가
  const handleAddMemberToTeam = (teamId: string, studentCode: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const student = classStudents.find(s => s.code === studentCode);
    if (!student) return;

    updateTeam(teamId, {
      memberCodes: [...team.memberCodes, studentCode],
      memberNames: [...team.memberNames, student.name],
    });
  };

  // 팀에서 멤버 제거
  const handleRemoveMemberFromTeam = (teamId: string, studentCode: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const idx = team.memberCodes.indexOf(studentCode);
    if (idx === -1) return;

    const newCodes = [...team.memberCodes];
    const newNames = [...team.memberNames];
    newCodes.splice(idx, 1);
    newNames.splice(idx, 1);

    updateTeam(teamId, {
      memberCodes: newCodes,
      memberNames: newNames,
    });
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

  if (loading) {
    return (
      <PageLayout title="팀 관리" role="admin" showBack onBack={() => onNavigate?.('teacher-dashboard')}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          학생 목록 로딩 중...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="팀 관리" role="admin" showBack onBack={() => onNavigate?.('teacher-dashboard')}>
      <div className="space-y-6">
        {/* 헤더 */}
        <Card className="p-6 bg-gradient-to-r from-purple-500 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white mb-2">쿠키 배틀 팀 관리</h2>
              <p className="text-purple-100">
                {studentClassName || '클래스를 먼저 선택하세요'} - {teams.length}팀
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-8 h-8" />
              <span className="text-2xl">{assignedStudentCodes.length}/{classStudents.length}</span>
            </div>
          </div>
        </Card>

        {/* 자동 팀 배정 */}
        {classStudents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="w-5 h-5" />
                자동 팀 배정
              </CardTitle>
              <CardDescription>
                학생들을 자동으로 팀에 배정합니다. 팀당 인원을 선택하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm">팀당 인원:</label>
                <div className="flex gap-2">
                  {[3, 4, 5].map(num => (
                    <Button
                      key={num}
                      variant={membersPerTeam === num ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMembersPerTeam(num)}
                    >
                      {num}명
                    </Button>
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  → 약 {Math.ceil(classStudents.length / membersPerTeam)}팀 생성
                </span>
              </div>
              <Button
                onClick={() => {
                  if (teams.length > 0) {
                    if (window.confirm('기존 팀이 모두 삭제됩니다. 계속하시겠습니까?')) {
                      handleAutoAssign();
                    }
                  } else {
                    handleAutoAssign();
                  }
                }}
                className="w-full"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                자동 배정하기 (랜덤 팀 이름)
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 팀 목록 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3>팀 목록 ({teams.length}팀)</h3>
            <div className="flex gap-2">
              {teams.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (window.confirm('모든 팀을 삭제하시겠습니까?')) {
                      clearTeams();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  전체 삭제
                </Button>
              )}
              <Button onClick={() => {
                setIsCreating(true);
                setNewTeamName(generateRandomTeamName());
                setNewTeamFlag(TEAM_FLAGS[Math.floor(Math.random() * TEAM_FLAGS.length)]);
              }} disabled={isCreating}>
                <Plus className="w-4 h-4 mr-2" />
                팀 추가
              </Button>
            </div>
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
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTeamName}
                        onChange={e => setNewTeamName(e.target.value)}
                        placeholder="예: 불꽃 피닉스"
                        className="flex-1 px-4 py-2 border rounded-lg"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setNewTeamName(generateRandomTeamName())}
                        title="랜덤 이름"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 멤버 선택 */}
                <div>
                  <label className="block text-sm mb-2">
                    팀원 선택 ({selectedMembers.length}명) - 3~5명 권장
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
                      {editingTeamId === team.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            defaultValue={team.name}
                            className="px-2 py-1 border rounded"
                            onBlur={(e) => {
                              updateTeam(team.id, { name: e.target.value });
                              setEditingTeamId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateTeam(team.id, { name: (e.target as HTMLInputElement).value });
                                setEditingTeamId(null);
                              }
                            }}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{team.name}</h3>
                          <button
                            onClick={() => setEditingTeamId(team.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRandomizeName(team.id)}
                            className="text-gray-400 hover:text-gray-600"
                            title="랜덤 이름"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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

                {/* 팀원 목록 (수정 가능) */}
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {team.memberCodes.map((code, idx) => (
                      <Badge key={code} variant="secondary" className="flex items-center gap-1">
                        {team.memberNames[idx]}
                        <button
                          onClick={() => handleRemoveMemberFromTeam(team.id, code)}
                          className="ml-1 text-gray-500 hover:text-red-600"
                          title="팀에서 제거"
                        >
                          <UserMinus className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {/* 미배정 학생 추가 버튼 */}
                    {unassignedStudents.length > 0 && (
                      <div className="relative group">
                        <Badge variant="outline" className="cursor-pointer">
                          <UserPlus className="w-3 h-3 mr-1" />
                          추가
                        </Badge>
                        <div className="absolute top-full left-0 mt-1 hidden group-hover:block z-10 bg-white border rounded-lg shadow-lg p-2 min-w-40 max-h-40 overflow-y-auto">
                          {unassignedStudents.map(student => (
                            <button
                              key={student.code}
                              onClick={() => handleAddMemberToTeam(team.id, student.code)}
                              className="block w-full text-left px-3 py-1 hover:bg-gray-100 rounded text-sm"
                            >
                              {student.number}. {student.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
                위의 "자동 팀 배정"을 사용하거나 수동으로 팀을 만드세요
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
              <CardDescription>
                팀 카드의 "추가" 버튼을 눌러 팀에 배정하세요
              </CardDescription>
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
