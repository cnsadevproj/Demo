import React from 'react';
import { RankingUser } from '../types';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Trophy, TrendingUp, Flame } from 'lucide-react';

interface RankingListProps {
  users: RankingUser[];
  currentUserId?: string;
  showAll?: boolean;
}

export function RankingList({ users, currentUserId, showAll = false }: RankingListProps) {
  const displayUsers = showAll ? users : users.slice(0, 3);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Trophy className="w-5 h-5 text-amber-700" />;
    return <span className="w-5 text-center text-gray-500">{rank}</span>;
  };

  return (
    <div className="space-y-3">
      {displayUsers.map((user) => {
        const isCurrentUser = user.userId === currentUserId;
        
        return (
          <Card key={user.userId} className={`p-4 ${isCurrentUser ? 'ring-2 ring-blue-500' : ''}`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8">
                {getRankIcon(user.rank)}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4>{user.name}</h4>
                  {isCurrentUser && <Badge variant="default">나</Badge>}
                </div>
                
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">미션 수행</p>
                    <p className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      {user.missionCount}회
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-500 text-xs">성공률</p>
                    <p>{user.successRate}%</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-500 text-xs">최고 연속</p>
                    <p className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-600" />
                      {user.maxStreak}일
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {/* 현재 사용자가 TOP 3 밖이면 별도 표시 */}
      {!showAll && currentUserId && !displayUsers.find(u => u.userId === currentUserId) && (
        <Card className="p-4 ring-2 ring-blue-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-8">
              <span className="text-gray-500">...</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">내 순위는 별도로 표시됩니다</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
