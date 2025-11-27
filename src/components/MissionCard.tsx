import React from 'react';
import { Mission } from '../types';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle2, Circle, Target, Users } from 'lucide-react';

interface MissionCardProps {
  mission: Mission;
  onComplete?: () => void;
  showCompleteButton?: boolean;
}

export function MissionCard({ mission, onComplete, showCompleteButton = false }: MissionCardProps) {
  const isTeamMission = mission.type === 'team';

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isTeamMission ? (
            <Users className="w-5 h-5 text-purple-600" />
          ) : (
            <Target className="w-5 h-5 text-green-600" />
          )}
          <Badge variant={isTeamMission ? 'destructive' : 'default'}>
            {isTeamMission ? '팀 미션' : '개인 미션'}
          </Badge>
        </div>
        
        {mission.completed !== undefined && (
          mission.completed ? (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          ) : (
            <Circle className="w-6 h-6 text-gray-300" />
          )
        )}
      </div>

      <h3 className="mb-2">{mission.title}</h3>
      <p className="text-sm text-gray-600">{mission.description}</p>

      {mission.targetValue && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-sm text-gray-500">
            목표: {mission.targetValue}
            {mission.type === 'team' && '시간'}
          </p>
        </div>
      )}

      {showCompleteButton && !mission.completed && onComplete && (
        <button
          onClick={onComplete}
          className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          미션 인증하기
        </button>
      )}
    </Card>
  );
}
