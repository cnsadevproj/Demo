import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useStudent } from '../contexts/StudentContext';
import { useAuth } from '../contexts/AuthContext';
import {
  StudentProfile as StudentProfileType,
  BORDER_STYLES,
  BorderStyle,
  NAME_EFFECTS,
  NameEffect,
  TITLE_COLORS,
  PROFILE_EMOJIS,
  BACKGROUND_PATTERNS,
  BackgroundPattern,
} from '../types/student';
import {
  User,
  Palette,
  Type,
  Sparkles,
  Frame,
  Image,
  Save,
  Eye,
} from 'lucide-react';

interface StudentProfilePageProps {
  onBack?: () => void;
}

export function StudentProfilePage({ onBack }: StudentProfilePageProps) {
  const { getProfile, updateProfile } = useStudent();
  const { user } = useAuth();

  const studentCode = user?.code || '';
  const studentName = user?.name || '학생';

  // 현재 프로필 로드
  const currentProfile = getProfile(studentCode);

  // 편집 상태
  const [title, setTitle] = useState(currentProfile.title);
  const [titleColorIndex, setTitleColorIndex] = useState(currentProfile.titleColorIndex);
  const [emoji, setEmoji] = useState(currentProfile.emoji);
  const [borderStyle, setBorderStyle] = useState<BorderStyle>(currentProfile.borderStyle);
  const [borderColor, setBorderColor] = useState(currentProfile.borderColor);
  const [nameEffect, setNameEffect] = useState<NameEffect>(currentProfile.nameEffect);
  const [backgroundPattern, setBackgroundPattern] = useState<BackgroundPattern>(currentProfile.backgroundPattern);

  const [activeTab, setActiveTab] = useState<'title' | 'emoji' | 'border' | 'name' | 'background'>('title');
  const [isSaved, setIsSaved] = useState(false);

  // 저장
  const handleSave = () => {
    updateProfile(studentCode, {
      title: title.slice(0, 5),
      titleColorIndex,
      emoji,
      borderStyle,
      borderColor,
      nameEffect,
      backgroundPattern,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // 프로필 카드 미리보기
  const ProfilePreview = () => {
    const borderInfo = BORDER_STYLES[borderStyle];
    const nameEffectInfo = NAME_EFFECTS[nameEffect];
    const bgInfo = BACKGROUND_PATTERNS[backgroundPattern];
    const titleColor = TITLE_COLORS[titleColorIndex];

    return (
      <div
        className={`relative p-6 rounded-xl ${bgInfo.css} ${borderInfo.css} ${borderInfo.animation || ''}`}
        style={borderStyle === 'solid' ? { borderColor } : undefined}
      >
        {/* 대표 이모지 */}
        <div className="text-6xl text-center mb-4">{emoji}</div>

        {/* 칭호 + 이름 */}
        <div className="text-center">
          {title && (
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${titleColor.bg} ${titleColor.text}`}>
              {title}
            </span>
          )}
          <span className={`text-xl font-bold ${nameEffectInfo.css}`}>
            {studentName}
          </span>
        </div>

        {/* 쿠키 정보 (예시) */}
        <div className="mt-4 text-center text-gray-600">
          <span className="text-2xl">🍪</span> 쿠키: 156개
        </div>
      </div>
    );
  };

  return (
    <PageLayout title="내 프로필" role="student" showBack onBack={onBack}>
      <div className="space-y-6">
        {/* 미리보기 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              미리보기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfilePreview />
          </CardContent>
        </Card>

        {/* 탭 선택 */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'title', label: '칭호', icon: Type },
            { key: 'emoji', label: '이모지', icon: Sparkles },
            { key: 'border', label: '테두리', icon: Frame },
            { key: 'name', label: '이름', icon: User },
            { key: 'background', label: '배경', icon: Image },
          ].map(tab => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className="flex-shrink-0"
            >
              <tab.icon className="w-4 h-4 mr-1" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* 편집 영역 */}
        <Card>
          <CardContent className="pt-6">
            {/* 칭호 편집 */}
            {activeTab === 'title' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">칭호 (최대 5글자)</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value.slice(0, 5))}
                    placeholder="예: 불꽃왕"
                    className="w-full px-4 py-2 border rounded-lg"
                    maxLength={5}
                  />
                  <p className="text-xs text-gray-500 mt-1">{title.length}/5</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">칭호 색상</label>
                  <div className="grid grid-cols-5 gap-2">
                    {TITLE_COLORS.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => setTitleColorIndex(index)}
                        className={`p-2 rounded-lg text-xs ${color.bg} ${color.text} ${
                          titleColorIndex === index ? 'ring-2 ring-offset-2 ring-purple-500' : ''
                        }`}
                      >
                        {color.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 이모지 선택 */}
            {activeTab === 'emoji' && (
              <div>
                <label className="block text-sm font-medium mb-2">대표 이모지</label>
                <div className="grid grid-cols-8 gap-2">
                  {PROFILE_EMOJIS.map((em, index) => (
                    <button
                      key={index}
                      onClick={() => setEmoji(em)}
                      className={`text-2xl p-2 rounded-lg hover:bg-gray-100 ${
                        emoji === em ? 'bg-purple-100 ring-2 ring-purple-500' : ''
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 테두리 스타일 */}
            {activeTab === 'border' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">테두리 스타일</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(BORDER_STYLES) as BorderStyle[]).map(style => (
                      <button
                        key={style}
                        onClick={() => setBorderStyle(style)}
                        className={`p-3 rounded-lg border-2 text-sm ${
                          borderStyle === style
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {BORDER_STYLES[style].name}
                      </button>
                    ))}
                  </div>
                </div>

                {borderStyle === 'solid' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">테두리 색상</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={borderColor}
                        onChange={e => setBorderColor(e.target.value)}
                        className="w-12 h-12 rounded cursor-pointer"
                      />
                      <span className="text-sm text-gray-600">{borderColor}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 이름 효과 */}
            {activeTab === 'name' && (
              <div>
                <label className="block text-sm font-medium mb-2">이름 효과</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(NAME_EFFECTS) as NameEffect[]).map(effect => (
                    <button
                      key={effect}
                      onClick={() => setNameEffect(effect)}
                      className={`p-3 rounded-lg border-2 text-sm ${
                        nameEffect === effect
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={NAME_EFFECTS[effect].css || ''}>
                        {NAME_EFFECTS[effect].name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 배경 패턴 */}
            {activeTab === 'background' && (
              <div>
                <label className="block text-sm font-medium mb-2">배경 패턴</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(BACKGROUND_PATTERNS) as BackgroundPattern[]).map(pattern => (
                    <button
                      key={pattern}
                      onClick={() => setBackgroundPattern(pattern)}
                      className={`p-4 rounded-lg border-2 text-sm ${BACKGROUND_PATTERNS[pattern].css} ${
                        backgroundPattern === pattern
                          ? 'border-purple-500'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {BACKGROUND_PATTERNS[pattern].name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 저장 버튼 */}
        <Button onClick={handleSave} className="w-full" size="lg">
          <Save className="w-5 h-5 mr-2" />
          {isSaved ? '저장됨!' : '저장하기'}
        </Button>
      </div>
    </PageLayout>
  );
}
