import React, { useState } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useStudent } from '../contexts/StudentContext';
import { useAuth } from '../contexts/AuthContext';
import { Wish } from '../types/student';
import {
  Star,
  Send,
  Heart,
  Gift,
  Calendar,
  Flame,
  Check,
  Trash2,
  Cookie,
} from 'lucide-react';

interface WishingStoneProps {
  onBack?: () => void;
}

export function WishingStone({ onBack }: WishingStoneProps) {
  const {
    addWish,
    likeWish,
    unlikeWish,
    grantWish,
    deleteWish,
    getClassWishes,
    getTodayWish,
    checkAttendance,
    isAttendedToday,
    getAttendanceStats,
  } = useStudent();

  const { studentCode: authStudentCode, studentClassName, role, selectedClass } = useAuth();

  // 교사인지 확인
  const isTeacher = role === 'teacher';

  // 학생 코드와 학급 ID 설정
  const studentCode = authStudentCode || '';
  const studentName = '학생'; // TODO: 학생 이름을 가져올 필요 있음
  const classId = isTeacher ? (selectedClass || '') : (studentClassName || '');

  // 상태
  const [wishContent, setWishContent] = useState('');
  const [showGrantModal, setShowGrantModal] = useState<string | null>(null);
  const [grantReward, setGrantReward] = useState(50);

  // 데이터
  const classWishes = getClassWishes(classId);
  const todayWish = getTodayWish(classId, studentCode);
  const attended = isAttendedToday(classId, studentCode);
  const stats = getAttendanceStats(classId, studentCode, 30);

  // 소원 작성
  const handleSubmitWish = () => {
    if (!wishContent.trim()) return;

    // 출석 체크
    if (!attended) {
      checkAttendance(classId, studentCode);
    }

    // 소원 추가
    const result = addWish(classId, studentCode, studentName, wishContent);
    if (result) {
      setWishContent('');
    }
  };

  // 좋아요 토글
  const handleLikeToggle = (wish: Wish) => {
    if (wish.likes.includes(studentCode)) {
      unlikeWish(wish.id, studentCode);
    } else {
      likeWish(wish.id, studentCode);
    }
  };

  // 소원 선정 (교사)
  const handleGrantWish = (wishId: string) => {
    grantWish(wishId, grantReward);
    setShowGrantModal(null);
    setGrantReward(50);
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <PageLayout
      title="소원의 돌"
      role={isTeacher ? 'admin' : 'student'}
      showBack
      onBack={onBack}
    >
      <div className="space-y-6">
        {/* 소원의 돌 헤더 */}
        <Card className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white overflow-hidden">
          <CardContent className="pt-6 relative">
            {/* 배경 별 장식 */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <Star
                  key={i}
                  className="absolute text-white/20"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    width: `${8 + Math.random() * 16}px`,
                    animation: `twinkle ${2 + Math.random() * 3}s infinite`,
                  }}
                />
              ))}
            </div>

            <div className="relative text-center py-8">
              {/* 소원의 돌 이미지 */}
              <div className="mb-4">
                <img
                  src="/images/wishing-stone.jpg"
                  alt="소원의 돌"
                  className="w-32 h-32 mx-auto object-contain drop-shadow-2xl animate-pulse"
                  onError={(e) => {
                    // 이미지 로드 실패 시 이모지로 대체
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden text-8xl">🪨</div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">소원의 돌</h2>
              <p className="text-purple-200">소원을 빌면 이루어질지도...?</p>

              {/* 출석 정보 */}
              {!isTeacher && (
                <div className="mt-4 flex justify-center gap-4">
                  <div className="bg-white/20 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">총 {stats.total}일</span>
                    </div>
                  </div>
                  {stats.streak > 0 && (
                    <div className="bg-orange-500/80 rounded-lg px-4 py-2">
                      <div className="flex items-center gap-1">
                        <Flame className="w-4 h-4" />
                        <span className="text-sm">{stats.streak}일 연속!</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 소원 작성 (학생용) */}
        {!isTeacher && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                오늘의 소원
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayWish ? (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">⭐</span>
                    <div>
                      <p className="font-medium">{todayWish.content}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        오늘의 소원을 적었습니다!
                      </p>
                    </div>
                  </div>
                  {todayWish.isGranted && (
                    <Badge className="mt-2 bg-green-100 text-green-800">
                      <Gift className="w-3 h-3 mr-1" />
                      선정됨! +{todayWish.grantedReward}쿠키
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={wishContent}
                    onChange={e => setWishContent(e.target.value.slice(0, 50))}
                    placeholder="소원을 적어주세요... (최대 50자)"
                    className="w-full px-4 py-3 border rounded-lg resize-none h-24"
                    maxLength={50}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{wishContent.length}/50</span>
                    <Button onClick={handleSubmitWish} disabled={!wishContent.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      소원 빌기
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 소원 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                📜 모두의 소원
              </span>
              <Badge variant="outline">{classWishes.length}개</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {classWishes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>아직 소원이 없습니다</p>
                <p className="text-sm">첫 번째 소원을 적어보세요!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {classWishes.map(wish => (
                  <div
                    key={wish.id}
                    className={`p-4 rounded-lg border ${
                      wish.isGranted
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{wish.studentName}</span>
                          <span className="text-xs text-gray-400">
                            {formatDate(wish.createdAt)}
                          </span>
                          {wish.isGranted && (
                            <Badge className="bg-yellow-400 text-yellow-900 text-xs">
                              <Gift className="w-3 h-3 mr-1" />
                              선정
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-700">⭐ {wish.content}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* 좋아요 버튼 */}
                        {!isTeacher && (
                          <button
                            onClick={() => handleLikeToggle(wish)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors ${
                              wish.likes.includes(studentCode)
                                ? 'bg-red-100 text-red-600'
                                : 'bg-gray-100 text-gray-500 hover:bg-red-50'
                            }`}
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                wish.likes.includes(studentCode) ? 'fill-current' : ''
                              }`}
                            />
                            <span>{wish.likes.length}</span>
                          </button>
                        )}

                        {/* 교사용 버튼들 */}
                        {isTeacher && (
                          <>
                            {!wish.isGranted && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowGrantModal(wish.id)}
                              >
                                <Gift className="w-4 h-4 mr-1" />
                                선정
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (window.confirm('이 소원을 삭제하시겠습니까?')) {
                                  deleteWish(wish.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 선정 보상 표시 */}
                    {wish.isGranted && wish.grantedReward && (
                      <div className="mt-2 text-sm text-yellow-700">
                        🍪 +{wish.grantedReward} 쿠키 보상!
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 선정 모달 */}
        {showGrantModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>소원 선정하기</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">보상 쿠키</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGrantReward(prev => Math.max(10, prev - 10))}
                    >
                      -10
                    </Button>
                    <div className="flex items-center gap-1 px-4 py-2 border rounded-lg">
                      <Cookie className="w-4 h-4 text-amber-500" />
                      <span className="font-bold">{grantReward}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGrantReward(prev => prev + 10)}
                    >
                      +10
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleGrantWish(showGrantModal)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    선정하기
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowGrantModal(null)}
                  >
                    취소
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 별 반짝임 애니메이션 스타일 */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </PageLayout>
  );
}
