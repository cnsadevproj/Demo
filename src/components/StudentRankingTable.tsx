import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { StudentInfo } from '../services/api';
import { Trophy, Medal, Cookie, Award } from 'lucide-react';

export interface RankedStudent {
  rank: number;
  code: string;
  number: number;
  name: string;
  cookie: number;
  usedCookie: number;
  totalCookie: number;
  badgeCount: number;
  badges: { imgUrl: string; title: string }[];
}

interface StudentRankingTableProps {
  students: RankedStudent[];
  currentStudentCode?: string;
  showTop?: number;
  showCurrentOnly?: boolean;
}

export function StudentRankingTable({
  students,
  currentStudentCode,
  showTop = 10,
  showCurrentOnly = false,
}: StudentRankingTableProps) {
  // 상위 N명 + 현재 학생 표시
  let displayStudents = students;

  if (showCurrentOnly && currentStudentCode) {
    const currentStudent = students.find(s => s.code === currentStudentCode);
    displayStudents = currentStudent ? [currentStudent] : [];
  } else if (showTop < students.length) {
    const topStudents = students.slice(0, showTop);
    const currentStudent = students.find(s => s.code === currentStudentCode);

    if (currentStudent && currentStudent.rank > showTop) {
      displayStudents = [...topStudents, currentStudent];
    } else {
      displayStudents = topStudents;
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center text-gray-500">{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 2:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 3:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  if (displayStudents.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">표시할 학생이 없습니다</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {displayStudents.map((student, idx) => {
        const isCurrentStudent = student.code === currentStudentCode;
        const isTopThree = student.rank <= 3;
        const isGapMarker = idx > 0 && student.rank - displayStudents[idx - 1].rank > 1;

        return (
          <React.Fragment key={student.code}>
            {isGapMarker && (
              <div className="flex items-center justify-center py-2">
                <div className="flex-1 border-t border-dashed border-gray-300" />
                <span className="px-3 text-sm text-gray-400">...</span>
                <div className="flex-1 border-t border-dashed border-gray-300" />
              </div>
            )}
            <Card
              className={`p-4 transition-all ${
                isCurrentStudent
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : isTopThree
                  ? 'bg-gradient-to-r from-white to-gray-50'
                  : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* 순위 */}
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${getRankBadgeColor(
                    student.rank
                  )}`}
                >
                  {getRankIcon(student.rank)}
                </div>

                {/* 학생 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{student.name}</span>
                    {isCurrentStudent && (
                      <Badge variant="default" className="text-xs">
                        나
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {student.number}번
                  </p>
                </div>

                {/* 쿠키 정보 */}
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Cookie className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-lg">{student.cookie.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    남은 쿠키: {student.totalCookie.toLocaleString()}
                  </p>
                </div>

                {/* 뱃지 */}
                {student.badges.length > 0 && (
                  <div className="flex items-center gap-1 pl-4 border-l">
                    {student.badges.slice(0, 3).map((badge, bidx) => (
                      <img
                        key={bidx}
                        src={badge.imgUrl}
                        alt={badge.title}
                        title={badge.title}
                        className="w-6 h-6 rounded-full"
                      />
                    ))}
                    {student.badgeCount > 3 && (
                      <span className="text-xs text-gray-500">+{student.badgeCount - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// 학생 정보를 랭킹 데이터로 변환하는 유틸리티 함수
export function convertToRankedStudents(
  studentInfoMap: Map<string, StudentInfo | null>,
  studentList: { code: string; number: number; name: string }[]
): RankedStudent[] {
  // API 정보가 있는 학생만 필터
  const studentsWithInfo: RankedStudent[] = [];

  studentList.forEach(student => {
    const info = studentInfoMap.get(student.code);
    if (info) {
      const earnedBadges = Object.values(info.badges).filter(b => b.hasBadge);
      studentsWithInfo.push({
        rank: 0, // 나중에 설정
        code: student.code,
        number: student.number,
        name: info.name || student.name,
        cookie: info.cookie,
        usedCookie: info.usedCookie,
        totalCookie: info.totalCookie,
        badgeCount: earnedBadges.length,
        badges: earnedBadges.map(b => ({ imgUrl: b.imgUrl, title: b.title })),
      });
    }
  });

  // 쿠키 순으로 정렬
  studentsWithInfo.sort((a, b) => b.cookie - a.cookie);

  // 순위 부여 (동점자 처리)
  let currentRank = 1;
  let previousCookie = -1;

  studentsWithInfo.forEach((student, idx) => {
    if (student.cookie !== previousCookie) {
      currentRank = idx + 1;
    }
    student.rank = currentRank;
    previousCookie = student.cookie;
  });

  return studentsWithInfo;
}
