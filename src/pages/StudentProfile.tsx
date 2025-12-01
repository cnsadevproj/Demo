import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import {
  User,
  Type,
  Sparkles,
  Frame,
  Image,
  Save,
  Eye,
  ShoppingBag,
  Cookie,
  Lock,
  Tag,
} from 'lucide-react';
import {
  getStudent,
  saveProfile,
  Student,
} from '../services/firestoreApi';
import {
  EMOJI_ITEMS,
  BORDER_ITEMS,
  NAME_EFFECT_ITEMS,
  BACKGROUND_ITEMS,
  TITLE_COLOR_ITEMS,
  getItemByCode,
} from '../types/shop';

interface StudentProfilePageProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
}

export function StudentProfilePage({ onBack, onNavigate }: StudentProfilePageProps) {
  const { student: authStudent, studentTeacherId } = useAuth();

  const studentCode = authStudent?.code || '';
  const teacherId = studentTeacherId || '';

  // 학생 데이터
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  // 편집 상태
  const [title, setTitle] = useState('');
  const [titleColorCode, setTitleColorCode] = useState('title_00');
  const [emojiCode, setEmojiCode] = useState('emoji_00');
  const [borderCode, setBorderCode] = useState('border_00');
  const [nameEffectCode, setNameEffectCode] = useState('name_00');
  const [backgroundCode, setBackgroundCode] = useState('bg_00');

  const [activeTab, setActiveTab] = useState<'title' | 'emoji' | 'border' | 'name' | 'background'>('title');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!studentCode || !teacherId) return;

      setLoading(true);
      try {
        const data = await getStudent(teacherId, studentCode);
        if (data) {
          setStudent(data);
          setTitle(data.profile?.title || '');
          setTitleColorCode(data.profile?.titleColorCode || 'title_00');
          setEmojiCode(data.profile?.emojiCode || 'emoji_00');
          setBorderCode(data.profile?.borderCode || 'border_00');
          setNameEffectCode(data.profile?.nameEffectCode || 'name_00');
          setBackgroundCode(data.profile?.backgroundCode || 'bg_00');
        }
      } catch (error) {
        console.error('데이터 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentCode, teacherId]);

  // 보유한 아이템인지 확인
  const isOwned = (code: string): boolean => {
    if (!student) return false;
    // 무료 아이템은 모두 보유
    const item = getItemByCode(code);
    if (item && item.price === 0) return true;
    return student.ownedItems.includes(code);
  };

  // 저장
  const handleSave = async () => {
    if (!studentCode || !teacherId) return;

    setSaving(true);
    setMessage(null);

    try {
      await saveProfile(teacherId, studentCode, {
        emojiCode,
        title: title.slice(0, 5),
        titleColorCode,
        borderCode,
        nameEffectCode,
        backgroundCode,
      });

      setMessage({ type: 'success', text: '저장되었습니다!' });
    } catch (error) {
      setMessage({ type: 'error', text: '오류가 발생했습니다.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 현재 선택된 아이템 값 가져오기
  const getItemValue = (code: string) => {
    return getItemByCode(code)?.value || '';
  };

  // 칭호 색상 정보
  const titleColorItem = getItemByCode(titleColorCode);
  const titleColorValue = parseInt(titleColorItem?.value || '0');
  const titleColorClasses = [
    'bg-red-100 text-red-800',
    'bg-orange-100 text-orange-800',
    'bg-yellow-100 text-yellow-800',
    'bg-green-100 text-green-800',
    'bg-blue-100 text-blue-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-gray-800 text-white',
    'bg-yellow-200 text-yellow-900',
    'bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 text-white',
  ];

  // 프로필 카드 미리보기
  const ProfilePreview = () => {
    const emojiValue = getItemValue(emojiCode);
    const borderValue = getItemValue(borderCode);
    const nameEffectValue = getItemValue(nameEffectCode);
    const bgValue = getItemValue(backgroundCode);

    // 테두리 스타일
    const borderClass = borderValue === 'none' ? 'border-0' :
      borderValue === 'solid' ? 'border-2 border-gray-400' :
      borderValue.startsWith('gradient') ? 'border-4 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500' :
      borderValue.startsWith('neon') ? `border-4 ${
        borderValue === 'neon-blue' ? 'border-blue-400 shadow-lg shadow-blue-400/50' :
        borderValue === 'neon-pink' ? 'border-pink-400 shadow-lg shadow-pink-400/50' :
        'border-green-400 shadow-lg shadow-green-400/50'
      }` :
      borderValue === 'pulse' ? 'border-4 border-purple-400 animate-pulse' :
      borderValue === 'sparkle' ? 'border-4 border-yellow-400' :
      'border-2 border-gray-300';

    // 이름 효과
    const nameEffectClass = nameEffectValue === 'none' ? '' :
      nameEffectValue.includes('rainbow') ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent' :
      nameEffectValue.includes('fire') ? 'bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent' :
      nameEffectValue.includes('ocean') ? 'bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent' :
      nameEffectValue.includes('gold') ? 'text-yellow-500 drop-shadow-lg' :
      nameEffectValue.includes('glow-blue') ? 'text-blue-500 drop-shadow-lg' :
      nameEffectValue.includes('glow-pink') ? 'text-pink-500 drop-shadow-lg' :
      nameEffectValue === 'shadow' ? 'text-gray-800 drop-shadow-md' :
      '';

    // 배경 패턴
    const bgClass = bgValue === 'none' ? 'bg-white' :
      bgValue === 'dots' ? 'bg-[radial-gradient(circle,_#ddd_1px,_transparent_1px)] bg-[length:8px_8px]' :
      bgValue === 'stripes' ? 'bg-[repeating-linear-gradient(45deg,_#f0f0f0,_#f0f0f0_10px,_#fff_10px,_#fff_20px)]' :
      bgValue === 'waves' ? 'bg-gradient-to-br from-blue-50 to-cyan-50' :
      bgValue === 'hearts' ? 'bg-gradient-to-br from-pink-50 to-red-50' :
      bgValue === 'stars' ? 'bg-gradient-to-br from-indigo-50 to-purple-50' :
      bgValue === 'gradient-soft' ? 'bg-gradient-to-br from-gray-50 to-gray-100' :
      bgValue === 'gradient-vivid' ? 'bg-gradient-to-br from-purple-100 to-pink-100' :
      'bg-white';

    return (
      <div className={`relative p-6 rounded-xl ${bgClass} ${borderClass}`}>
        {/* 대표 이모지 */}
        <div className="text-6xl text-center mb-4">{emojiValue}</div>

        {/* 칭호 + 이름 */}
        <div className="text-center">
          {title && (
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${titleColorClasses[titleColorValue] || titleColorClasses[0]}`}>
              {title}
            </span>
          )}
          <span className={`text-xl font-bold ${nameEffectClass}`}>
            {student?.name || '학생'}
          </span>
        </div>

        {/* 쿠키 정보 */}
        <div className="mt-4 text-center text-gray-600">
          <span className="text-2xl">🍪</span> 쿠키: {student?.cookie || 0}개
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <PageLayout title="내 프로필" role="student" showBack onBack={onBack}>
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="내 프로필" role="student" showBack onBack={onBack}>
      <div className="space-y-6">
        {/* 쿠키 정보 */}
        <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cookie className="w-8 h-8" />
                <div>
                  <p className="text-sm text-amber-100">총 누적 쿠키</p>
                  <p className="text-xl font-bold">{student?.totalCookie || 0}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigate?.('shop')}
              >
                <ShoppingBag className="w-4 h-4 mr-1" />
                상점 가기
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 메시지 */}
        {message && (
          <div
            className={`p-3 rounded-lg text-center font-medium ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

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
                  <div className="grid grid-cols-3 gap-2">
                    {TITLE_COLOR_ITEMS.map(item => {
                      const owned = isOwned(item.code);
                      const colorIndex = parseInt(item.value);
                      return (
                        <button
                          key={item.code}
                          onClick={() => owned && setTitleColorCode(item.code)}
                          disabled={!owned}
                          className={`relative p-2 rounded-lg text-xs ${titleColorClasses[colorIndex] || 'bg-gray-100'} ${
                            titleColorCode === item.code ? 'ring-2 ring-offset-2 ring-purple-500' : ''
                          } ${!owned ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {item.name}
                          {!owned && (
                            <Lock className="absolute top-1 right-1 w-3 h-3" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 이모지 선택 */}
            {activeTab === 'emoji' && (
              <div>
                <label className="block text-sm font-medium mb-2">대표 이모지</label>
                <div className="grid grid-cols-4 gap-2">
                  {EMOJI_ITEMS.map(item => {
                    const owned = isOwned(item.code);
                    return (
                      <button
                        key={item.code}
                        onClick={() => owned && setEmojiCode(item.code)}
                        disabled={!owned}
                        className={`relative text-2xl p-3 rounded-lg ${
                          emojiCode === item.code ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-gray-50'
                        } ${!owned ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                      >
                        {item.value}
                        {!owned && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
                            <Lock className="w-4 h-4 text-gray-600" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  잠긴 아이템은 상점에서 구매하세요
                </p>
              </div>
            )}

            {/* 테두리 스타일 */}
            {activeTab === 'border' && (
              <div>
                <label className="block text-sm font-medium mb-2">테두리 스타일</label>
                <div className="grid grid-cols-3 gap-2">
                  {BORDER_ITEMS.map(item => {
                    const owned = isOwned(item.code);
                    return (
                      <button
                        key={item.code}
                        onClick={() => owned && setBorderCode(item.code)}
                        disabled={!owned}
                        className={`relative p-3 rounded-lg border-2 text-sm ${
                          borderCode === item.code
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200'
                        } ${!owned ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300'}`}
                      >
                        {item.name}
                        {!owned && (
                          <Lock className="absolute top-1 right-1 w-3 h-3" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 이름 효과 */}
            {activeTab === 'name' && (
              <div>
                <label className="block text-sm font-medium mb-2">이름 효과</label>
                <div className="grid grid-cols-2 gap-2">
                  {NAME_EFFECT_ITEMS.map(item => {
                    const owned = isOwned(item.code);
                    const effectClass = item.value === 'none' ? '' :
                      item.value.includes('rainbow') ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent' :
                      item.value.includes('fire') ? 'bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent' :
                      item.value.includes('gold') ? 'text-yellow-500' :
                      '';

                    return (
                      <button
                        key={item.code}
                        onClick={() => owned && setNameEffectCode(item.code)}
                        disabled={!owned}
                        className={`relative p-3 rounded-lg border-2 text-sm ${
                          nameEffectCode === item.code
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200'
                        } ${!owned ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300'}`}
                      >
                        <span className={effectClass}>{item.name}</span>
                        {!owned && (
                          <Lock className="absolute top-1 right-1 w-3 h-3" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 배경 패턴 */}
            {activeTab === 'background' && (
              <div>
                <label className="block text-sm font-medium mb-2">배경 패턴</label>
                <div className="grid grid-cols-2 gap-2">
                  {BACKGROUND_ITEMS.map(item => {
                    const owned = isOwned(item.code);
                    const bgClass = item.value === 'none' ? 'bg-white' :
                      item.value === 'dots' ? 'bg-[radial-gradient(circle,_#ddd_1px,_transparent_1px)] bg-[length:8px_8px]' :
                      item.value === 'stars' ? 'bg-gradient-to-br from-indigo-50 to-purple-50' :
                      item.value === 'hearts' ? 'bg-gradient-to-br from-pink-50 to-red-50' :
                      'bg-gradient-to-br from-gray-50 to-gray-100';

                    return (
                      <button
                        key={item.code}
                        onClick={() => owned && setBackgroundCode(item.code)}
                        disabled={!owned}
                        className={`relative p-4 rounded-lg border-2 text-sm ${bgClass} ${
                          backgroundCode === item.code
                            ? 'border-purple-500'
                            : 'border-gray-200'
                        } ${!owned ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300'}`}
                      >
                        {item.name}
                        {!owned && (
                          <Lock className="absolute top-1 right-1 w-3 h-3" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 저장 버튼 */}
        <Button onClick={handleSave} className="w-full" size="lg" disabled={saving}>
          <Save className="w-5 h-5 mr-2" />
          {saving ? '저장 중...' : '저장하기'}
        </Button>
      </div>
    </PageLayout>
  );
}
