import React from 'react';
import { Team } from '../types';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Users, Cookie, Shield, Swords } from 'lucide-react';

interface TeamCardProps {
  team: Team;
  showBattle?: boolean;
  showMission?: boolean;
  isCurrentTeam?: boolean;
}

export function TeamCard({ team, showBattle = false, showMission = false, isCurrentTeam = false }: TeamCardProps) {
  return (
    <Card className={`p-4 ${isCurrentTeam ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{team.flag}</span>
          <div>
            <h3 className="flex items-center gap-2">
              {team.name}
              {isCurrentTeam && <Badge variant="default">내 팀</Badge>}
            </h3>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <Users className="w-3 h-3" />
              {team.members.length}명
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-amber-600">
          <Cookie className="w-5 h-5" />
          <span>{team.earnedRound.toLocaleString()}</span>
        </div>
      </div>

      {/* 팀원 목록 */}
      <div className="mb-3">
        <div className="flex flex-wrap gap-1">
          {team.members.map((member) => (
            <Badge key={member.id} variant="secondary" className="text-xs">
              {member.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* 공격/방어 정보 */}
      {showBattle && (
        <div className="space-y-2 pt-3 border-t">
          {team.attackTarget && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-red-600">
                <Swords className="w-4 h-4" />
                공격
              </span>
              <span>
                {team.attackTarget === 'team1' && '불꽃 피닉스'}
                {team.attackTarget === 'team2' && '푸른 드래곤'}
                {team.attackTarget === 'team3' && '황금 독수리'}
                {' '}
                ({team.attackBet?.toLocaleString()})
              </span>
            </div>
          )}
          {team.defense !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-blue-600">
                <Shield className="w-4 h-4" />
                방어
              </span>
              <span>{team.defense.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* 팀 미션 정보 */}
      {showMission && team.receivedMission && (
        <div className="mt-3 pt-3 border-t">
          <Badge variant="destructive" className="mb-2">팀 미션</Badge>
          <p className="text-sm">{team.receivedMission.title}</p>
          <p className="text-xs text-gray-500 mt-1">{team.receivedMission.description}</p>
        </div>
      )}
    </Card>
  );
}
