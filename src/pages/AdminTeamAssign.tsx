import React, { useState } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { mockUsers, mockTeams } from '../utils/mockData';
import { Users, Shuffle, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface AdminTeamAssignProps {
  onNavigate?: (page: string) => void;
}

export function AdminTeamAssign({ onNavigate }: AdminTeamAssignProps) {
  const [teamSizes, setTeamSizes] = useState<number[]>([4, 3, 4]);
  const [assignedTeams, setAssignedTeams] = useState(mockTeams);
  const [isAssigning, setIsAssigning] = useState(false);

  const totalStudents = mockUsers.filter(u => u.role === 'student').length;
  const totalAssigned = teamSizes.reduce((sum, size) => sum + size, 0);

  const teamEmojis = ['🔥', '🐉', '🦅', '🦁', '🐯', '🐺', '🦊', '🐻'];
  const teamNames = [
    '불꽃 피닉스', '푸른 드래곤', '황금 독수리', '용맹한 사자',
    '강철 호랑이', '달빛 늑대', '민첩한 여우', '산악 곰'
  ];

  const handleAddTeam = () => {
    if (teamSizes.length >= 8) {
      toast.error('최대 8개 팀까지만 생성할 수 있습니다');
      return;
    }
    setTeamSizes([...teamSizes, 3]);
  };

  const handleRemoveTeam = (index: number) => {
    if (teamSizes.length <= 2) {
      toast.error('최소 2개 팀이 필요합니다');
      return;
    }
    const newSizes = [...teamSizes];
    newSizes.splice(index, 1);
    setTeamSizes(newSizes);
  };

  const handleSizeChange = (index: number, value: number) => {
    const newSizes = [...teamSizes];
    newSizes[index] = Math.max(1, Math.min(10, value));
    setTeamSizes(newSizes);
  };

  const handleRandomAssign = () => {
    if (totalAssigned !== totalStudents) {
      toast.error('팀 규모 합계가 학생 수와 일치해야 합니다');
      return;
    }

    setIsAssigning(true);

    // 학생들을 랜덤으로 섞기
    const shuffledStudents = [...mockUsers.filter(u => u.role === 'student')]
      .sort(() => Math.random() - 0.5);

    // 팀별로 배정
    const newTeams = teamSizes.map((size, index) => {
      const teamMembers = shuffledStudents.splice(0, size);
      return {
        id: `team${index + 1}`,
        name: teamNames[index],
        flag: teamEmojis[index],
        members: teamMembers,
        earnedRound: 0,
      };
    });

    setTimeout(() => {
      setAssignedTeams(newTeams);
      setIsAssigning(false);
      toast.success('팀이 랜덤으로 배정되었습니다!');
    }, 1000);
  };

  const handleSave = () => {
    toast.success('팀 배정이 저장되었습니다!');
    setTimeout(() => {
      onNavigate?.('admin');
    }, 1500);
  };

  return (
    <PageLayout 
      title="팀 배정" 
      role="admin"
      showBack
      onBack={() => onNavigate?.('admin')}
    >
      <div className="space-y-6">
        {/* 안내 */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="mb-2 text-blue-900">팀 배정 안내</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 매주 월요일에 새로운 팀을 랜덤으로 배정합니다</li>
                <li>• 팀 규모를 지정하면 시스템이 자동으로 학생을 배정합니다</li>
                <li>• 팀 규모 합계는 전체 학생 수({totalStudents}명)와 일치해야 합니다</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* 팀 규모 설정 */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3>팀 규모 설정</h3>
            <div className="flex gap-2">
              <button
                onClick={handleAddTeam}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                + 팀 추가
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {teamSizes.map((size, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-2xl">{teamEmojis[index]}</span>
                <div className="flex-1">
                  <input
                    type="text"
                    value={teamNames[index]}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                  />
                </div>
                <input
                  type="number"
                  value={size}
                  onChange={(e) => handleSizeChange(index, parseInt(e.target.value) || 0)}
                  min="1"
                  max="10"
                  className="w-20 px-3 py-2 border rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-500 w-8">명</span>
                <button
                  onClick={() => handleRemoveTeam(index)}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <span>합계</span>
            <span className={`text-xl ${totalAssigned === totalStudents ? 'text-green-600' : 'text-red-600'}`}>
              {totalAssigned} / {totalStudents}명
              {totalAssigned === totalStudents && ' ✓'}
            </span>
          </div>
        </Card>

        {/* 랜덤 배정 버튼 */}
        <button
          onClick={handleRandomAssign}
          disabled={totalAssigned !== totalStudents || isAssigning}
          className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Shuffle className="w-5 h-5" />
          {isAssigning ? '배정 중...' : '랜덤 배정 실행'}
        </button>

        {/* 배정 결과 */}
        {assignedTeams.length > 0 && (
          <div>
            <h3 className="mb-4">배정 결과 미리보기</h3>
            <div className="space-y-4">
              {assignedTeams.map((team, index) => (
                <Card key={team.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{team.flag}</span>
                      <div>
                        <h4>{team.name}</h4>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Users className="w-3 h-3" />
                          {team.members.length}명
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">팀 {index + 1}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {team.members.map((member) => (
                      <Badge key={member.id} variant="secondary">
                        {member.name}
                      </Badge>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 저장 버튼 */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={assignedTeams.length === 0}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            저장하기
          </button>
          <button
            onClick={() => onNavigate?.('admin')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
