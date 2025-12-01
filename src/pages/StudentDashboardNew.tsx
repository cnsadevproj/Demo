// src/pages/StudentDashboardNew.tsx
// 학생 대시보드 - Firebase 버전

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import {
  getStudent,
  getWishes,
  addWish,
  likeWish,
  unlikeWish,
  getGrassData,
  getTeacherShopItems,
  purchaseItem,
  saveProfile,
  getTeams,
  getClassStudents,
  checkTodayWish,
  Student,
  Wish,
  ShopItem,
  Team,
  Badge
} from '../services/firestoreApi';
import { getItemByCode, ALL_SHOP_ITEMS } from '../types/shop';

// 이모지 코드를 실제 이모지로 변환
const getEmojiFromCode = (code: string | undefined): string => {
  if (!code) return '😊';
  const item = getItemByCode(code);
  return item?.value || '😊';
};

interface StudentDashboardNewProps {
  onLogout: () => void;
}

export function StudentDashboardNew({ onLogout }: StudentDashboardNewProps) {
  const { student, studentTeacherId, studentTeacher } = useAuth();
  
  const [currentStudent, setCurrentStudent] = useState<Student | null>(student);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [grassData, setGrassData] = useState<Array<{ date: string; cookieChange: number; count: number }>>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'wish' | 'grass' | 'shop' | 'profile' | 'classmates'>('home');

  // 새 소원 작성
  const [newWishContent, setNewWishContent] = useState('');
  const [isSubmittingWish, setIsSubmittingWish] = useState(false);
  const [hasWrittenTodayWish, setHasWrittenTodayWish] = useState(false);

  // 다른 학생들 (프로필 보기용)
  const [classmates, setClassmates] = useState<Student[]>([]);
  const [selectedClassmate, setSelectedClassmate] = useState<Student | null>(null);
  const [selectedClassmateGrass, setSelectedClassmateGrass] = useState<Array<{ date: string; cookieChange: number; count: number }>>([]);
  const [isLoadingClassmateGrass, setIsLoadingClassmateGrass] = useState(false);

  // 상점
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [isLoadingShop, setIsLoadingShop] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // 팀
  const [myTeam, setMyTeam] = useState<Team | null>(null);

  // 프로필 수정
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedBtnBorder, setSelectedBtnBorder] = useState('gray-300');
  const [selectedBtnFill, setSelectedBtnFill] = useState('white');
  const [selectedTitleColor, setSelectedTitleColor] = useState('0');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 데이터 로드
  useEffect(() => {
    if (studentTeacherId && student) {
      loadData();
    }
  }, [studentTeacherId, student]);

  const loadData = async () => {
    if (!studentTeacherId || !student) return;

    try {
      // 최신 학생 정보
      const updatedStudent = await getStudent(studentTeacherId, student.code);
      if (updatedStudent) {
        setCurrentStudent(updatedStudent);
        setSelectedEmoji(updatedStudent.profile.emojiCode);
        setSelectedTitle(updatedStudent.profile.title || '');
        setSelectedBtnBorder(updatedStudent.profile.buttonBorderCode || 'gray-300');
        setSelectedBtnFill(updatedStudent.profile.buttonFillCode || 'white');
        setSelectedTitleColor(updatedStudent.profile.titleColorCode || '0');
      }

      // 소원 목록
      const wishesData = await getWishes(studentTeacherId, student.classId);
      setWishes(wishesData);

      // 오늘 소원 작성 여부 확인
      const alreadyWrote = await checkTodayWish(studentTeacherId, student.classId, student.code);
      setHasWrittenTodayWish(alreadyWrote);

      // 잔디 데이터 (count 포함 - 같은 날 여러 번 새로고침 시 누적)
      const grass = await getGrassData(studentTeacherId, student.classId, student.code);
      setGrassData(grass.map(g => ({ date: g.date, cookieChange: g.cookieChange, count: g.count || 1 })));

      // 팀 정보
      const teams = await getTeams(studentTeacherId, student.classId);
      const foundTeam = teams.find(t => t.members.includes(student.code));
      setMyTeam(foundTeam || null);

      // 같은 반 학생 목록 (프로필 보기용)
      const allStudents = await getClassStudents(studentTeacherId, student.classId);
      setClassmates(allStudents.filter(s => s.code !== student.code));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  // 상점 로드 (Firebase에 없으면 기본 아이템 사용)
  const loadShop = async () => {
    if (!studentTeacherId) return;
    setIsLoadingShop(true);
    try {
      const items = await getTeacherShopItems(studentTeacherId);
      // Firebase에 상품이 없으면 기본 상품 목록 사용
      setShopItems(items.length > 0 ? items : ALL_SHOP_ITEMS);
    } catch (error) {
      console.error('Failed to load shop:', error);
      // 에러 시에도 기본 상품 표시
      setShopItems(ALL_SHOP_ITEMS);
    }
    setIsLoadingShop(false);
  };

  // 아이템 구매
  const handlePurchase = async (item: ShopItem) => {
    if (!studentTeacherId || !currentStudent) return;

    if (currentStudent.cookie < item.price) {
      toast.error('쿠키가 부족합니다!');
      return;
    }

    if (currentStudent.ownedItems.includes(item.code)) {
      toast.error('이미 보유한 아이템입니다.');
      return;
    }

    setIsPurchasing(true);
    try {
      await purchaseItem(studentTeacherId, currentStudent.code, item.code, item.price);
      await loadData();
      toast.success(`${item.name}을(를) 구매했습니다! 🎉`);
    } catch (error) {
      toast.error('구매에 실패했습니다.');
    }
    setIsPurchasing(false);
  };

  // 프로필 저장
  const handleSaveProfile = async () => {
    if (!studentTeacherId || !currentStudent) return;

    setIsSavingProfile(true);
    try {
      await saveProfile(studentTeacherId, currentStudent.code, {
        emojiCode: selectedEmoji,
        title: selectedTitle,
        buttonBorderCode: selectedBtnBorder,
        buttonFillCode: selectedBtnFill,
        titleColorCode: selectedTitleColor
      });
      await loadData();
      toast.success('프로필이 저장되었습니다!');
    } catch (error) {
      toast.error('프로필 저장에 실패했습니다.');
    }
    setIsSavingProfile(false);
  };

  // 기본 이모지 (무료)
  const defaultEmoji = '😀';

  // 구매한 이모지 필터링
  const getOwnedEmojis = () => {
    const ownedEmojis = shopItems
      .filter((item: ShopItem) => item.category === 'emoji' && currentStudent?.ownedItems.includes(item.code))
      .map((item: ShopItem) => item.value || item.name);
    return [defaultEmoji, ...ownedEmojis];
  };

  // 구매한 칭호 색상 필터링 (무료 포함)
  const getOwnedTitleColors = () => {
    return shopItems
      .filter((item: ShopItem) =>
        item.category === 'titleColor' &&
        (item.price === 0 || currentStudent?.ownedItems.includes(item.code))
      );
  };

  // 구매한 버튼 테두리 필터링 (무료 포함)
  const getOwnedBtnBorders = () => {
    return shopItems
      .filter((item: ShopItem) =>
        item.category === 'buttonBorder' &&
        (item.price === 0 || currentStudent?.ownedItems.includes(item.code))
      );
  };

  // 구매한 버튼 채우기 필터링 (무료 포함)
  const getOwnedBtnFills = () => {
    return shopItems
      .filter((item: ShopItem) =>
        item.category === 'buttonFill' &&
        (item.price === 0 || currentStudent?.ownedItems.includes(item.code))
      );
  };

  // 버튼 테두리 스타일 클래스
  const getBtnBorderClass = (value: string) => {
    if (value === 'gradient') return 'border-2 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-border';
    return `border-2 border-${value}`;
  };

  // 버튼 채우기 스타일 클래스
  const getBtnFillClass = (value: string) => {
    if (value === 'gradient') return 'bg-gradient-to-r from-amber-100 via-pink-100 to-purple-100';
    if (value === 'white') return 'bg-white';
    return `bg-${value}`;
  };

  // 칭호 색상 스타일
  const getTitleColorClass = (value: string) => {
    const colors = [
      'text-red-500', 'text-orange-500', 'text-yellow-500',
      'text-green-500', 'text-blue-500', 'text-purple-500',
      'text-pink-500', 'text-gray-800', 'text-amber-600',
      'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent'
    ];
    return colors[parseInt(value)] || 'text-gray-600';
  };

  // 소원 작성
  const handleSubmitWish = async () => {
    if (!studentTeacherId || !student) return;
    if (!newWishContent.trim()) {
      toast.error('소원 내용을 입력해주세요.');
      return;
    }
    if (newWishContent.length > 50) {
      toast.error('소원은 50자 이내로 작성해주세요.');
      return;
    }
    if (hasWrittenTodayWish) {
      toast.error('오늘은 이미 소원을 작성했어요! 내일 다시 도전해주세요.');
      return;
    }

    setIsSubmittingWish(true);
    try {
      const result = await addWish(studentTeacherId, student.classId, student.code, student.name, newWishContent.trim());
      if (result.success) {
        setNewWishContent('');
        setHasWrittenTodayWish(true);
        await loadData();
        toast.success('소원이 등록되었습니다! 🌟');
      } else {
        toast.error(result.error || '소원 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to submit wish:', error);
      toast.error('소원 등록에 실패했습니다.');
    }
    setIsSubmittingWish(false);
  };

  // 소원 좋아요
  const handleLikeWish = async (wishId: string, isLiked: boolean) => {
    if (!studentTeacherId || !student) return;

    try {
      if (isLiked) {
        await unlikeWish(studentTeacherId, student.classId, wishId, student.code);
      } else {
        await likeWish(studentTeacherId, student.classId, wishId, student.code);
      }
      await loadData();
    } catch (error) {
      console.error('Failed to like wish:', error);
    }
  };

  // 친구 선택 및 잔디 데이터 로드
  const handleSelectClassmate = async (classmate: Student) => {
    setSelectedClassmate(classmate);
    setSelectedClassmateGrass([]);

    if (!studentTeacherId || !student) return;

    setIsLoadingClassmateGrass(true);
    try {
      const grass = await getGrassData(studentTeacherId, student.classId, classmate.code);
      setSelectedClassmateGrass(grass.map(g => ({ date: g.date, cookieChange: g.cookieChange, count: g.count || 1 })));
    } catch (error) {
      console.error('Failed to load classmate grass:', error);
    }
    setIsLoadingClassmateGrass(false);
  };

  // 잔디 색상 계산 (쿠키 변화량 기준)
  // 같은 날 여러 번 새로고침하면 cookieChange가 누적되어 색상이 진해짐
  const getGrassColor = (cookieChange: number) => {
    if (cookieChange === 0) return 'bg-gray-200'; // 활동 없음
    if (cookieChange === 1) return 'bg-green-200'; // 1개 - 연초록
    if (cookieChange === 2) return 'bg-green-400'; // 2개 - 중간초록
    if (cookieChange <= 4) return 'bg-green-500'; // 3-4개 - 진초록
    return 'bg-green-600'; // 5개 이상 - 매우 진한 초록
  };


  if (!currentStudent || !studentTeacher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍪</span>
            <div>
              <h1 className="font-bold text-gray-800">{currentStudent.name}</h1>
              <p className="text-xs text-gray-500">{studentTeacher.schoolName}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
          >
            <span>🚪</span>
            <span>나가기</span>
          </button>
        </div>
      </header>

      {/* 쿠키 현황 */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <Card className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0">
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-amber-100 text-sm mb-1">내 쿠키</p>
              <p className="text-5xl font-bold mb-2">{currentStudent.cookie} 🍪</p>
              <p className="text-amber-100 text-sm">
                총 {currentStudent.totalCookie}개 획득 · {currentStudent.usedCookie}개 사용
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 네비게이션 */}
      <div className="max-w-lg mx-auto px-4">
        <div className="flex border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex-1 min-w-[60px] py-3 text-center font-medium transition-colors text-sm ${
              activeTab === 'home'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-500'
            }`}
          >
            🏠 홈
          </button>
          <button
            onClick={() => setActiveTab('wish')}
            className={`flex-1 min-w-[60px] py-3 text-center font-medium transition-colors text-sm ${
              activeTab === 'wish'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-500'
            }`}
          >
            ⭐ 소원
          </button>
          <button
            onClick={() => setActiveTab('grass')}
            className={`flex-1 min-w-[60px] py-3 text-center font-medium transition-colors text-sm ${
              activeTab === 'grass'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-500'
            }`}
          >
            🌱 잔디
          </button>
          <button
            onClick={() => { setActiveTab('shop'); loadShop(); }}
            className={`flex-1 min-w-[60px] py-3 text-center font-medium transition-colors text-sm ${
              activeTab === 'shop'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-500'
            }`}
          >
            🏪 상점
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 min-w-[60px] py-3 text-center font-medium transition-colors text-sm ${
              activeTab === 'profile'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-500'
            }`}
          >
            👤 프로필
          </button>
          <button
            onClick={() => setActiveTab('classmates')}
            className={`flex-1 min-w-[60px] py-3 text-center font-medium transition-colors text-sm ${
              activeTab === 'classmates'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-500'
            }`}
          >
            👥 친구
          </button>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 홈 탭 */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📊 내 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">학급</span>
                  <span className="font-medium">{currentStudent.classId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">번호</span>
                  <span className="font-medium">{currentStudent.number}번</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">초코칩</span>
                  <span className="font-medium">{currentStudent.chocoChips} 🍫</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🎨 내 프로필</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-6xl mb-2">
                    {selectedEmoji || '😊'}
                  </div>
                  <p className="font-medium">{currentStudent.name}</p>
                  {currentStudent.profile.title && (
                    <p className="text-sm text-amber-600">{currentStudent.profile.title}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 뱃지 - 작게 */}
            {currentStudent.badges && Object.keys(currentStudent.badges).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">🏆 내 뱃지</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {(Object.entries(currentStudent.badges) as [string, Badge][])
                      .filter(([, badge]) => badge.hasBadge)
                      .map(([key, badge]) => (
                        <div key={key} className="flex flex-col items-center" title={badge.title}>
                          <img
                            src={badge.imgUrl}
                            alt={badge.title}
                            className="w-8 h-8 rounded shadow-sm"
                          />
                        </div>
                      ))}
                  </div>
                  {(Object.values(currentStudent.badges) as Badge[]).filter(b => b.hasBadge).length === 0 && (
                    <p className="text-center text-gray-400 py-2 text-sm">아직 획득한 뱃지가 없어요</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 팀 정보 */}
            {myTeam && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">👥 내 팀</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <span className="text-4xl">{myTeam.flag}</span>
                    <p className="font-bold text-lg mt-2">{myTeam.teamName}</p>
                    <p className="text-amber-600">팀 쿠키: {myTeam.teamCookie} 🍪</p>
                    <p className="text-sm text-gray-500 mt-1">멤버 {myTeam.members.length}명</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 소원의 돌 탭 */}
        {activeTab === 'wish' && (
          <div className="space-y-4">
            {/* 소원 streak 정보 */}
            <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🔥</span>
                    </div>
                    <div>
                      <p className="text-sm text-purple-100">연속 소원</p>
                      <p className="text-2xl font-bold">{currentStudent?.wishStreak || 0}일째</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-purple-100">
                    <p>최고 기록: {currentStudent?.bestWishStreak || 0}일</p>
                    {hasWrittenTodayWish && (
                      <p className="text-green-200 mt-1">✓ 오늘 완료!</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 소원 작성 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">✨ 소원 빌기</CardTitle>
                <CardDescription>
                  {hasWrittenTodayWish
                    ? '오늘은 이미 소원을 작성했어요! 내일 다시 도전해주세요 🌙'
                    : '하루에 하나의 소원을 빌 수 있어요'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  className={`w-full p-3 border rounded-lg resize-none ${
                    hasWrittenTodayWish ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  rows={3}
                  placeholder={hasWrittenTodayWish ? '내일 다시 도전해주세요!' : '소원을 작성해주세요 (50자 이내)'}
                  value={newWishContent}
                  onChange={(e) => setNewWishContent(e.target.value)}
                  maxLength={50}
                  disabled={hasWrittenTodayWish}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">{newWishContent.length}/50</span>
                  <button
                    onClick={handleSubmitWish}
                    disabled={isSubmittingWish || hasWrittenTodayWish}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                      hasWrittenTodayWish
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    } disabled:opacity-50`}
                  >
                    <span className="text-lg">{hasWrittenTodayWish ? '✓' : '🌟'}</span>
                    <span>{hasWrittenTodayWish ? '오늘 완료' : isSubmittingWish ? '등록 중...' : '소원 빌기'}</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* 소원 목록 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">💫 모든 소원</CardTitle>
              </CardHeader>
              <CardContent>
                {wishes.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">아직 소원이 없어요</p>
                ) : (
                  <div className="space-y-3">
                    {wishes.map((wish) => {
                      const isLiked = wish.likes.includes(currentStudent.code);
                      const isMine = wish.studentCode === currentStudent.code;
                      
                      return (
                        <div
                          key={wish.id}
                          className={`p-3 rounded-lg border ${
                            wish.isGranted ? 'bg-amber-50 border-amber-200' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {wish.studentName}
                                {isMine && <span className="text-amber-500 ml-1">(나)</span>}
                                {wish.isGranted && <span className="text-green-500 ml-1">✓ 선정</span>}
                              </p>
                              <p className="text-gray-700 mt-1">{wish.content}</p>
                            </div>
                            <button
                              onClick={() => handleLikeWish(wish.id, isLiked)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                                isLiked
                                  ? 'bg-red-100 text-red-500'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {isLiked ? '❤️' : '🤍'} {wish.likes.length}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 잔디 탭 - GitHub 스타일 */}
        {activeTab === 'grass' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🌱 나의 학습 잔디</CardTitle>
              <CardDescription>최근 활동 기록</CardDescription>
            </CardHeader>
            <CardContent>
              {/* 월 표시 */}
              <div className="flex justify-between text-xs text-gray-400 mb-2 px-1">
                {['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'].slice(0, 6).map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>

              {/* 잔디 그리드 - 7행 x 여러 열 */}
              <div className="flex gap-[3px] overflow-x-auto pb-2">
                {Array.from({ length: 26 }).map((_, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                      const totalDays = weekIndex * 7 + dayIndex;
                      const date = new Date();
                      date.setDate(date.getDate() - (26 * 7 - totalDays));
                      const dateStr = date.toISOString().split('T')[0];
                      const isFuture = date > new Date();
                      const grassRecord = grassData.find((g) => g.date === dateStr);
                      const cookieChange = grassRecord?.cookieChange || 0;
                      const refreshCount = grassRecord?.count || 0;

                      return (
                        <div
                          key={dayIndex}
                          className={`w-3 h-3 rounded-sm ${
                            isFuture
                              ? 'bg-gray-50 border border-gray-100'
                              : getGrassColor(cookieChange)
                          }`}
                          title={isFuture ? '미래' : `${dateStr}: +${cookieChange}쿠키 (${refreshCount}회 기록)`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* 범례 */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-400">
                  총 {grassData.reduce((sum, g) => sum + g.cookieChange, 0)}개 획득
                </span>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <span>0</span>
                  <div className="w-3 h-3 rounded-sm bg-gray-200" title="0개" />
                  <div className="w-3 h-3 rounded-sm bg-green-200" title="1개" />
                  <div className="w-3 h-3 rounded-sm bg-green-400" title="2개" />
                  <div className="w-3 h-3 rounded-sm bg-green-500" title="3-4개" />
                  <div className="w-3 h-3 rounded-sm bg-green-600" title="5+개" />
                  <span>5+</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 상점 탭 */}
        {activeTab === 'shop' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🏪 상점</CardTitle>
                <CardDescription>쿠키로 아이템을 구매해보세요!</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4 p-3 bg-amber-50 rounded-lg">
                  <span className="text-gray-600">보유 쿠키: </span>
                  <span className="font-bold text-amber-600 text-xl">{currentStudent.cookie} 🍪</span>
                </div>

                {isLoadingShop ? (
                  <p className="text-center py-8 text-gray-500">로딩 중...</p>
                ) : shopItems.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">아직 상점에 상품이 없어요</p>
                ) : (
                  <div className="space-y-3">
                    {shopItems.map((item: ShopItem) => {
                      const isOwned = currentStudent.ownedItems.includes(item.code);
                      const canAfford = currentStudent.cookie >= item.price;

                      return (
                        <div
                          key={item.code}
                          className={`p-4 rounded-lg border ${isOwned ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-gray-500">{item.category}</p>
                              {item.description && (
                                <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-amber-600">{item.price} 🍪</p>
                              {isOwned ? (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <span>✅</span>
                                  <span>보유중</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => handlePurchase(item)}
                                  disabled={!canAfford || isPurchasing}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${
                                    canAfford
                                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  <span>🛒</span>
                                  <span>{isPurchasing ? '...' : '구매'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 보유 아이템 */}
            {currentStudent.ownedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🎒 내 아이템</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {currentStudent.ownedItems.map((itemCode: string) => {
                      const item = shopItems.find((i: ShopItem) => i.code === itemCode);
                      return (
                        <span key={itemCode} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                          {item?.name || itemCode}
                        </span>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 프로필 탭 */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">👤 프로필 꾸미기</CardTitle>
                <CardDescription>나만의 프로필을 만들어보세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 미리보기 - 버튼 스타일 적용 */}
                <div className="text-center p-6 bg-gradient-to-b from-amber-50 to-orange-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-3">미리보기</p>
                  <div
                    className={`inline-block px-6 py-4 rounded-xl ${getBtnFillClass(selectedBtnFill)} ${getBtnBorderClass(selectedBtnBorder)}`}
                    style={{
                      borderColor: selectedBtnBorder === 'gradient' ? undefined : undefined,
                      borderWidth: '3px',
                      borderStyle: 'solid',
                    }}
                  >
                    <div className="text-4xl mb-2">{selectedEmoji || '😊'}</div>
                    <p className="font-bold text-lg">{currentStudent.name}</p>
                    {selectedTitle && (
                      <p className={`text-sm mt-1 ${getTitleColorClass(selectedTitleColor)}`}>{selectedTitle}</p>
                    )}
                  </div>
                </div>

                {/* 이모지 선택 - 구매한 것만 표시 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    😊 이름 앞 이모지
                    <span className="text-xs text-gray-400 ml-2">(상점에서 구매)</span>
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {getOwnedEmojis().map((emoji: string) => (
                      <button
                        key={emoji}
                        onClick={() => setSelectedEmoji(emoji)}
                        className={`text-3xl p-2 rounded-lg transition-all ${
                          selectedEmoji === emoji
                            ? 'bg-amber-100 ring-2 ring-amber-400 scale-110'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 칭호 입력 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">🏷️ 칭호</label>
                  <input
                    type="text"
                    value={selectedTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedTitle(e.target.value)}
                    placeholder="칭호를 입력하세요 (예: 쿠키 마스터)"
                    maxLength={20}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">{selectedTitle.length}/20</p>
                </div>

                {/* 칭호 색상 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🎨 칭호 색상
                    <span className="text-xs text-gray-400 ml-2">(무료 + 구매한 색상)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {getOwnedTitleColors().map((item: ShopItem) => (
                      <button
                        key={item.code}
                        onClick={() => setSelectedTitleColor(item.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedTitleColor === item.value
                            ? 'ring-2 ring-amber-400 scale-105'
                            : 'hover:scale-105'
                        } ${getTitleColorClass(item.value)} bg-white border`}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 버튼 테두리 색상 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🔲 버튼 테두리
                    <span className="text-xs text-gray-400 ml-2">(무료 + 구매한 색상)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {getOwnedBtnBorders().map((item: ShopItem) => (
                      <button
                        key={item.code}
                        onClick={() => setSelectedBtnBorder(item.value)}
                        className={`w-10 h-10 rounded-lg border-4 transition-all ${
                          selectedBtnBorder === item.value
                            ? 'ring-2 ring-amber-400 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{
                          borderColor: item.value === 'gradient'
                            ? undefined
                            : item.value.replace('-', '').includes('400')
                              ? `var(--tw-${item.value})`
                              : undefined,
                          background: item.value === 'gradient'
                            ? 'linear-gradient(45deg, #8b5cf6, #ec4899, #ef4444)'
                            : 'white'
                        }}
                        title={item.name}
                      />
                    ))}
                  </div>
                </div>

                {/* 버튼 채우기 색상 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🎨 버튼 채우기
                    <span className="text-xs text-gray-400 ml-2">(무료 + 구매한 색상)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {getOwnedBtnFills().map((item: ShopItem) => (
                      <button
                        key={item.code}
                        onClick={() => setSelectedBtnFill(item.value)}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          selectedBtnFill === item.value
                            ? 'ring-2 ring-amber-400 scale-110'
                            : 'hover:scale-105'
                        } ${getBtnFillClass(item.value)}`}
                        title={item.name}
                      />
                    ))}
                  </div>
                </div>

                {/* 저장 버튼 */}
                <button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="text-xl">💾</span>
                  <span>{isSavingProfile ? '저장 중...' : '프로필 저장'}</span>
                </button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 친구 탭 - 다른 학생 프로필 보기 */}
        {activeTab === 'classmates' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">👥 우리 반 친구들</CardTitle>
                <CardDescription>친구들의 프로필을 구경해보세요!</CardDescription>
              </CardHeader>
              <CardContent>
                {classmates.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">같은 반 친구가 없어요</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {classmates.map((classmate) => (
                      <button
                        key={classmate.code}
                        onClick={() => handleSelectClassmate(classmate)}
                        className="p-3 rounded-xl border-2 border-gray-200 hover:border-amber-400 hover:shadow-md transition-all flex flex-col items-center"
                      >
                        <div className="text-3xl mb-1">
                          {getEmojiFromCode(classmate.profile.emojiCode)}
                        </div>
                        <p className="font-medium text-sm truncate w-full text-center">
                          {classmate.name}
                        </p>
                        <p className="text-xs text-gray-500">{classmate.number}번</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 쿠키 랭킹 미니 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🏆 쿠키 랭킹</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...classmates, currentStudent!]
                    .sort((a, b) => b.cookie - a.cookie)
                    .slice(0, 5)
                    .map((s, idx) => (
                      <div
                        key={s.code}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          s.code === currentStudent?.code ? 'bg-amber-50' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg w-6">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                          </span>
                          <span className="text-xl">{getEmojiFromCode(s.profile.emojiCode)}</span>
                          <span className={`font-medium ${s.code === currentStudent?.code ? 'text-amber-600' : ''}`}>
                            {s.name}
                            {s.code === currentStudent?.code && ' (나)'}
                          </span>
                        </div>
                        <span className="font-bold text-amber-600">{s.cookie} 🍪</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 친구 프로필 모달 - 작은 팝업 */}
        {selectedClassmate && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setSelectedClassmate(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl border-2 border-amber-300 overflow-hidden"
              style={{ width: '280px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-3 py-2 text-white">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getEmojiFromCode(selectedClassmate.profile.emojiCode)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{selectedClassmate.name}</p>
                    <p className="text-amber-100 text-xs">{selectedClassmate.number}번</p>
                  </div>
                  <button onClick={() => setSelectedClassmate(null)} className="text-white/80 hover:text-white text-lg">✕</button>
                </div>
              </div>

              {/* 바디 */}
              <div className="p-3 space-y-2">
                {/* 통계 */}
                <div className="grid grid-cols-3 gap-1 text-center text-xs">
                  <div className="bg-amber-50 rounded p-1.5">
                    <p className="font-bold text-amber-600">{selectedClassmate.cookie}</p>
                    <p className="text-gray-500">🍪쿠키</p>
                  </div>
                  <div className="bg-green-50 rounded p-1.5">
                    <p className="font-bold text-green-600">{selectedClassmate.totalCookie}</p>
                    <p className="text-gray-500">📊누적</p>
                  </div>
                  <div className="bg-purple-50 rounded p-1.5">
                    <p className="font-bold text-purple-600">{selectedClassmate.wishStreak || 0}</p>
                    <p className="text-gray-500">🔥연속</p>
                  </div>
                </div>

                {/* 뱃지 - 작게 */}
                {selectedClassmate.badges && Object.values(selectedClassmate.badges).some(b => b.hasBadge) && (
                  <div className="flex items-center gap-1 p-1.5 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500">🏆</span>
                    <div className="flex gap-0.5 overflow-x-auto">
                      {(Object.entries(selectedClassmate.badges) as [string, Badge][])
                        .filter(([, badge]) => badge.hasBadge)
                        .map(([key, badge]) => (
                          <img key={key} src={badge.imgUrl} alt={badge.title} className="w-5 h-5 rounded" title={badge.title} />
                        ))}
                    </div>
                  </div>
                )}

                {/* 잔디 - 미니 */}
                <div className="p-1.5 bg-green-50 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">🌱 활동</span>
                    <div className="flex items-center gap-0.5 text-[8px] text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-sm bg-gray-200" />
                      <div className="w-1.5 h-1.5 rounded-sm bg-green-300" />
                      <div className="w-1.5 h-1.5 rounded-sm bg-green-500" />
                    </div>
                  </div>
                  {isLoadingClassmateGrass ? (
                    <p className="text-center text-[10px] text-gray-400">로딩...</p>
                  ) : (
                    <div className="flex gap-[1px] justify-center">
                      {Array.from({ length: 8 }).map((_, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-[1px]">
                          {Array.from({ length: 7 }).map((_, dayIndex) => {
                            const totalDays = weekIndex * 7 + dayIndex;
                            const date = new Date();
                            date.setDate(date.getDate() - (8 * 7 - totalDays));
                            const dateStr = date.toISOString().split('T')[0];
                            const isFuture = date > new Date();
                            const grassRecord = selectedClassmateGrass.find((g) => g.date === dateStr);
                            const cookieChange = grassRecord?.cookieChange || 0;
                            return (
                              <div
                                key={dayIndex}
                                className={`w-2 h-2 rounded-sm ${isFuture ? 'bg-gray-100' : getGrassColor(cookieChange)}`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}