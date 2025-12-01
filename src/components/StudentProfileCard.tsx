import React from 'react';
import { useStudent } from '../contexts/StudentContext';
import {
  BORDER_STYLES,
  NAME_EFFECTS,
  TITLE_COLORS,
  BACKGROUND_PATTERNS,
  ANIMATION_EFFECTS,
} from '../types/student';

interface StudentProfileCardProps {
  studentCode: string;
  studentName: string;
  cookies?: number;
  rank?: number;
  mini?: boolean;
  onClick?: () => void;
}

export function StudentProfileCard({
  studentCode,
  studentName,
  cookies,
  rank,
  mini = false,
  onClick,
}: StudentProfileCardProps) {
  const { getProfile } = useStudent();
  const profile = getProfile(studentCode);

  const borderInfo = BORDER_STYLES[profile.borderStyle];
  const nameEffectInfo = NAME_EFFECTS[profile.nameEffect];
  const bgInfo = BACKGROUND_PATTERNS[profile.backgroundPattern];
  const titleColor = TITLE_COLORS[profile.titleColorIndex];
  const animationInfo = ANIMATION_EFFECTS[profile.animation || 'none'];

  if (mini) {
    // 미니 버전 (랭킹 테이블용)
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${bgInfo.css} ${borderInfo.css} ${borderInfo.animation || ''} ${profile.buttonBorder || ''} ${profile.buttonFill || ''} cursor-pointer hover:scale-105 transition-transform`}
        style={profile.borderStyle === 'solid' ? { borderColor: profile.borderColor } : undefined}
        onClick={onClick}
      >
        <span className={`text-lg ${animationInfo.css}`}>{profile.emoji}</span>
        <div className="flex items-center gap-1">
          {profile.title && (
            <span className={`text-[10px] px-1 py-0.5 rounded ${titleColor.bg} ${titleColor.text}`}>
              {profile.title}
            </span>
          )}
          <span className={`font-medium ${nameEffectInfo.css}`}>
            {studentName}
          </span>
        </div>
      </div>
    );
  }

  // 전체 버전
  return (
    <div
      className={`relative p-4 rounded-xl ${bgInfo.css} ${borderInfo.css} ${borderInfo.animation || ''} ${profile.buttonBorder || ''} ${profile.buttonFill || ''} cursor-pointer hover:scale-[1.02] transition-transform`}
      style={profile.borderStyle === 'solid' ? { borderColor: profile.borderColor } : undefined}
      onClick={onClick}
    >
      {/* 랭킹 배지 */}
      {rank && (
        <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
          rank === 1 ? 'bg-yellow-500' :
          rank === 2 ? 'bg-gray-400' :
          rank === 3 ? 'bg-amber-600' :
          'bg-gray-500'
        }`}>
          {rank}
        </div>
      )}

      <div className="text-center">
        {/* 이모지 */}
        <div className={`text-4xl mb-2 ${animationInfo.css}`}>{profile.emoji}</div>

        {/* 칭호 + 이름 */}
        <div className="flex flex-col items-center gap-1">
          {profile.title && (
            <span className={`text-xs px-2 py-0.5 rounded ${titleColor.bg} ${titleColor.text}`}>
              {profile.title}
            </span>
          )}
          <span className={`font-bold ${nameEffectInfo.css}`}>
            {studentName}
          </span>
        </div>

        {/* 쿠키 */}
        {cookies !== undefined && (
          <div className="mt-2 flex items-center justify-center gap-1 text-amber-600">
            <span>🍪</span>
            <span className="font-bold">{cookies}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// 프로필 이름만 표시하는 간단한 컴포넌트
export function StudentProfileName({
  studentCode,
  studentName,
}: {
  studentCode: string;
  studentName: string;
}) {
  const { getProfile } = useStudent();
  const profile = getProfile(studentCode);

  const nameEffectInfo = NAME_EFFECTS[profile.nameEffect];
  const titleColor = TITLE_COLORS[profile.titleColorIndex];
  const animationInfo = ANIMATION_EFFECTS[profile.animation || 'none'];

  return (
    <span className="inline-flex items-center gap-1">
      <span className={animationInfo.css}>{profile.emoji}</span>
      {profile.title && (
        <span className={`text-[10px] px-1 py-0.5 rounded ${titleColor.bg} ${titleColor.text}`}>
          {profile.title}
        </span>
      )}
      <span className={nameEffectInfo.css}>{studentName}</span>
    </span>
  );
}
