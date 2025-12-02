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
  activateTitlePermit,
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

// 이모지 코드를 실제 이모지로 변환 (없으면 빈 값 반환)
const getEmojiFromCode = (code: string | undefined): string => {
  if (!code) return '';
  // 코드 형식(emoji_XX)인 경우 아이템에서 조회
  if (code.startsWith('emoji_')) {
    const item = getItemByCode(code);
    return item?.value || '';
  }
  // 이미 이모지 값인 경우 그대로 반환
  return code;
};

interface StudentDashboardNewProps {
  onLogout: () => void;
}

export function StudentDashboardNew({ onLogout }: StudentDashboardNewProps) {
  const { student, studentTeacherId, studentTeacher } = useAuth();
  
  const [currentStudent, setCurrentStudent] = useState<Student | null>(student);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [grassData, setGrassData] = useState<Array<{ date: string; cookieChange: number; count: number }>>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'wish' | 'grass' | 'shop' | 'profile' | 'classmates' | 'team' | 'gameCenter'>('home');

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
  const [shopCategory, setShopCategory] = useState<'all' | 'emoji' | 'titlePermit' | 'titleColor' | 'nameEffect' | 'animation' | 'buttonBorder' | 'buttonFill'>('all');
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null);

  // 팀
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<Student[]>([]);
  const [teamMembersGrass, setTeamMembersGrass] = useState<Map<string, Array<{ date: string; cookieChange: number; count: number }>>>(new Map());
  const [isLoadingTeamStatus, setIsLoadingTeamStatus] = useState(false);
  const [isRefreshingCookie, setIsRefreshingCookie] = useState(false);

  // 프로필 수정
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [selectedBadge, setSelectedBadge] = useState(''); // 뱃지 키 (예: 'badge1')
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedBtnBorder, setSelectedBtnBorder] = useState('gray-300');
  const [selectedBtnFill, setSelectedBtnFill] = useState('none');
  const [selectedTitleColor, setSelectedTitleColor] = useState('0');
  const [selectedNameEffect, setSelectedNameEffect] = useState('none');
  const [selectedBackground, setSelectedBackground] = useState('none');
  const [selectedAnimation, setSelectedAnimation] = useState('none');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 인벤토리 탭
  const [inventoryTab, setInventoryTab] = useState<'all' | 'emoji' | 'nameEffect' | 'titleColor' | 'animation' | 'titlePermit' | 'buttonBorder' | 'buttonFill'>('all');

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
        setSelectedBadge(updatedStudent.profile.profileBadgeKey || '');
        setSelectedTitle(updatedStudent.profile.title || '');
        setSelectedBtnBorder(updatedStudent.profile.buttonBorderCode || 'gray-300');
        setSelectedBtnFill(updatedStudent.profile.buttonFillCode || 'none');
        setSelectedTitleColor(updatedStudent.profile.titleColorCode || '0');
        setSelectedNameEffect(updatedStudent.profile.nameEffectCode || 'none');
        setSelectedBackground(updatedStudent.profile.backgroundCode || 'none');
        setSelectedAnimation(updatedStudent.profile.animationCode || 'none');
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

  // 쿠키 새로고침
  const refreshCookie = async () => {
    if (!studentTeacherId || !student) return;

    setIsRefreshingCookie(true);
    try {
      const updatedStudent = await getStudent(studentTeacherId, student.code);
      if (updatedStudent) {
        setCurrentStudent(updatedStudent);

        // 잔디 데이터도 함께 새로고침
        const grass = await getGrassData(studentTeacherId, student.classId, student.code);
        setGrassData(grass.map(g => ({ date: g.date, cookieChange: g.cookieChange, count: g.count || 1 })));

        toast.success('쿠키 정보를 새로고침했습니다! 🍪');
      }
    } catch (error) {
      console.error('Failed to refresh cookie:', error);
      toast.error('새로고침에 실패했습니다.');
    }
    setIsRefreshingCookie(false);
  };

  // 상점 로드 (Firebase에 없으면 기본 아이템 사용)
  const loadShop = async () => {
    // teacherId 없어도 기본 상품 표시
    if (!studentTeacherId) {
      setShopItems(ALL_SHOP_ITEMS);
      setIsLoadingShop(false);
      return;
    }
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

  // 팀 현황 로드
  const loadTeamStatus = async () => {
    if (!studentTeacherId || !student) return;

    setIsLoadingTeamStatus(true);
    try {
      // 팀 정보 로드
      const teams = await getTeams(studentTeacherId, student.classId);
      const foundTeam = teams.find(t => t.members.includes(student.code));
      setMyTeam(foundTeam || null);

      if (foundTeam) {
        // 팀원 정보 로드
        const allStudents = await getClassStudents(studentTeacherId, student.classId);
        const members = allStudents.filter(s => foundTeam.members.includes(s.code));
        setTeamMembers(members);

        // 팀원별 잔디 데이터 로드
        const grassDataRaw = await getGrassData(studentTeacherId, student.classId);
        const memberGrassMap = new Map<string, Array<{ date: string; cookieChange: number; count: number }>>();

        foundTeam.members.forEach(code => {
          const memberGrass = grassDataRaw
            .filter(g => g.studentCode === code)
            .map(g => ({ date: g.date, cookieChange: g.cookieChange, count: g.count || 1 }))
            .sort((a, b) => a.date.localeCompare(b.date));
          memberGrassMap.set(code, memberGrass);
        });

        setTeamMembersGrass(memberGrassMap);
      }
    } catch (error) {
      console.error('Failed to load team status:', error);
    }
    setIsLoadingTeamStatus(false);
  };

  // 아이템 구매 (캔디 사용)
  const handlePurchase = async (item: ShopItem) => {
    if (!studentTeacherId || !currentStudent) return;

    const currentJelly = currentStudent.jelly ?? currentStudent.cookie ?? 0;
    if (currentJelly < item.price) {
      toast.error('캔디가 부족합니다! 🍭');
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

  // 칭호권 활성화
  const handleActivateTitlePermit = async () => {
    if (!studentTeacherId || !currentStudent) return;

    setIsPurchasing(true);
    try {
      await activateTitlePermit(studentTeacherId, currentStudent.code);
      await loadData();
      toast.success('칭호권이 활성화되었습니다! 이제 칭호를 설정할 수 있습니다. 🎉');
    } catch (error) {
      toast.error('칭호권 활성화에 실패했습니다.');
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
        profileBadgeKey: selectedBadge,
        title: selectedTitle,
        buttonBorderCode: selectedBtnBorder,
        buttonFillCode: selectedBtnFill,
        titleColorCode: selectedTitleColor,
        nameEffectCode: selectedNameEffect,
        backgroundCode: selectedBackground,
        animationCode: selectedAnimation
      });
      await loadData();
      toast.success('프로필이 저장되었습니다!');
    } catch (error) {
      toast.error('프로필 저장에 실패했습니다.');
    }
    setIsSavingProfile(false);
  };

  // 칭호권 활성화 여부 확인 (profile.titlePermitActive 확인)
  const hasTitlePermit = () => {
    return currentStudent?.profile?.titlePermitActive === true;
  };

  // 칭호권 보유 여부 확인 (구매는 했지만 활성화 안 됨)
  const hasTitlePermitOwned = () => {
    if (!currentStudent?.ownedItems) return false;
    return currentStudent.ownedItems.some(code =>
      code.startsWith('title_permit') ||
      getItemByCode(code)?.category === 'titlePermit'
    );
  };

  // 구매한 이모지 필터링 (기본 이모지 없음 - 구매해야만 사용 가능)
  const getOwnedEmojis = () => {
    const ownedEmojis = shopItems
      .filter((item: ShopItem) => item.category === 'emoji' && currentStudent?.ownedItems.includes(item.code))
      .map((item: ShopItem) => item.value || item.name);
    return ownedEmojis; // 기본 이모지 없음
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

  // 구매한 이름 효과 필터링
  const getOwnedNameEffects = () => {
    return shopItems
      .filter((item: ShopItem) =>
        item.category === 'nameEffect' &&
        (item.price === 0 || currentStudent?.ownedItems.includes(item.code))
      );
  };

  // 구매한 배경 필터링
  const getOwnedBackgrounds = () => {
    return shopItems
      .filter((item: ShopItem) =>
        item.category === 'background' &&
        (item.price === 0 || currentStudent?.ownedItems.includes(item.code))
      );
  };

  // 구매한 애니메이션 필터링
  const getOwnedAnimations = () => {
    return shopItems
      .filter((item: ShopItem) =>
        item.category === 'animation' &&
        (item.price === 0 || currentStudent?.ownedItems.includes(item.code))
      );
  };

  // 버튼 테두리 스타일 클래스 (Tailwind 명시적 매핑)
  const getBtnBorderClass = (value: string) => {
    // 무지개 테두리는 ring 유틸리티로 구현 (gradient border workaround)
    if (value === 'gradient') {
      return 'border-2 border-pink-400 ring-2 ring-purple-400 ring-offset-1';
    }
    // shop.ts 아이템 값 직접 매핑 (예: 'border-blue-500')
    const borderMap: Record<string, string> = {
      'gray-300': 'border-gray-300',
      'border-blue-500': 'border-blue-500',
      'border-red-500': 'border-red-500',
      'border-green-500': 'border-green-500',
      'border-yellow-500': 'border-yellow-500',
      'border-purple-500': 'border-purple-500',
      'border-pink-500': 'border-pink-500',
      'border-amber-400': 'border-amber-400',
      'border-gray-800': 'border-gray-800',
    };
    return `border-2 ${borderMap[value] || 'border-gray-300'}`;
  };

  // 버튼 채우기 스타일 클래스 (Tailwind 명시적 매핑)
  const getBtnFillClass = (value: string) => {
    // shop.ts 아이템 값 직접 매핑 (예: 'bg-blue-500')
    const fillMap: Record<string, string> = {
      'none': 'bg-transparent',
      'gradient': 'bg-gradient-to-r from-amber-100 via-pink-100 to-purple-100',
      'white': 'bg-white',
      'bg-blue-500': 'bg-blue-500',
      'bg-red-500': 'bg-red-500',
      'bg-green-500': 'bg-green-500',
      'bg-yellow-500': 'bg-yellow-500',
      'bg-purple-500': 'bg-purple-500',
      'bg-pink-500': 'bg-pink-500',
      'bg-amber-400': 'bg-amber-400',
      'bg-gray-800': 'bg-gray-800',
      'bg-gradient-to-r from-pink-500 to-purple-500': 'bg-gradient-to-r from-pink-500 to-purple-500',
    };
    return fillMap[value] || 'bg-transparent';
  };

  // 테두리 색상값 (inline style용) - 파스텔톤
  const getBorderColor = (value: string | undefined): string => {
    if (!value) return 'rgb(209 213 219)'; // gray-300
    const colorMap: Record<string, string> = {
      'gray-300': 'rgb(209 213 219)',
      'gray-800': 'rgb(31 41 55)',
      'border-blue-500': 'rgb(147 197 253)',      // 파스텔 블루
      'border-red-500': 'rgb(252 165 165)',       // 파스텔 레드
      'border-green-500': 'rgb(134 239 172)',     // 파스텔 그린
      'border-yellow-500': 'rgb(253 224 71)',     // 파스텔 옐로우
      'border-purple-500': 'rgb(196 181 253)',    // 파스텔 퍼플
      'border-pink-500': 'rgb(249 168 212)',      // 파스텔 핑크
      'border-amber-400': 'rgb(252 211 77)',      // 파스텔 앰버
      'border-gray-800': 'rgb(31 41 55)',
      'border-orange-500': 'rgb(253 186 116)',    // 파스텔 오렌지
      'border-cyan-500': 'rgb(103 232 249)',      // 파스텔 시안
      'border-teal-500': 'rgb(94 234 212)',       // 파스텔 틸
      'border-indigo-500': 'rgb(165 180 252)',    // 파스텔 인디고
      // 색상 이름 직접 지원
      'blue': 'rgb(147 197 253)',
      'red': 'rgb(252 165 165)',
      'green': 'rgb(134 239 172)',
      'yellow': 'rgb(253 224 71)',
      'purple': 'rgb(196 181 253)',
      'pink': 'rgb(249 168 212)',
      'amber': 'rgb(252 211 77)',
      'orange': 'rgb(253 186 116)',
    };
    return colorMap[value] || 'rgb(209 213 219)';
  };

  // 배경 색상값 (inline style용) - 파스텔톤
  const getFillColor = (value: string | undefined): string => {
    if (!value || value === 'none') return 'transparent';
    const colorMap: Record<string, string> = {
      'none': 'transparent',
      'transparent': 'transparent',
      'white': 'rgb(255 255 255)',
      'bg-blue-500': 'rgb(191 219 254)',          // 파스텔 블루
      'bg-red-500': 'rgb(254 202 202)',           // 파스텔 레드
      'bg-green-500': 'rgb(187 247 208)',         // 파스텔 그린
      'bg-green-200': 'rgb(187 247 208)',
      'bg-green-300': 'rgb(134 239 172)',
      'bg-yellow-500': 'rgb(254 240 138)',        // 파스텔 옐로우
      'bg-purple-500': 'rgb(221 214 254)',        // 파스텔 퍼플
      'bg-pink-500': 'rgb(251 207 232)',          // 파스텔 핑크
      'bg-amber-400': 'rgb(253 230 138)',         // 파스텔 앰버
      'bg-gray-800': 'rgb(31 41 55)',
      'bg-orange-500': 'rgb(254 215 170)',        // 파스텔 오렌지
      'bg-cyan-500': 'rgb(165 243 252)',          // 파스텔 시안
      'bg-teal-500': 'rgb(153 246 228)',          // 파스텔 틸
      'bg-indigo-500': 'rgb(199 210 254)',        // 파스텔 인디고
      // 색상 이름 직접 지원
      'blue': 'rgb(191 219 254)',
      'red': 'rgb(254 202 202)',
      'green': 'rgb(187 247 208)',
      'light-green': 'rgb(220 252 231)',
      'yellow': 'rgb(254 240 138)',
      'purple': 'rgb(221 214 254)',
      'pink': 'rgb(251 207 232)',
      'amber': 'rgb(253 230 138)',
      'orange': 'rgb(254 215 170)',
    };
    return colorMap[value] || 'transparent';
  };

  // 그라데이션 여부 확인
  const isGradientFill = (value: string | undefined): boolean => {
    if (!value) return false;
    return value.startsWith('gradient-') || value === 'bg-gradient-to-r from-pink-500 to-purple-500';
  };

  // 그라데이션 CSS 값 가져오기 - 파스텔톤
  const getGradientStyle = (value: string | undefined): string => {
    const gradientMap: Record<string, string> = {
      // 부드러운 파스텔 그라데이션
      'gradient-rainbow': 'linear-gradient(to right, rgb(254 202 202), rgb(254 240 138), rgb(187 247 208), rgb(191 219 254), rgb(221 214 254))',
      'gradient-fire': 'linear-gradient(to right, rgb(254 202 202), rgb(254 215 170), rgb(254 240 138))',
      'gradient-ocean': 'linear-gradient(to right, rgb(165 243 252), rgb(191 219 254), rgb(199 210 254))',
      'gradient-sunset': 'linear-gradient(to right, rgb(254 215 170), rgb(251 207 232), rgb(221 214 254))',
      'gradient-aurora': 'linear-gradient(to right, rgb(187 247 208), rgb(165 243 252), rgb(221 214 254))',
      'gradient-pink-purple': 'linear-gradient(to right, rgb(251 207 232), rgb(221 214 254))',
      'gradient-mint': 'linear-gradient(to right, rgb(165 243 252), rgb(153 246 228))',
      'gradient-orange': 'linear-gradient(to right, rgb(254 240 138), rgb(254 215 170))',
      // 추가 파스텔 그라데이션
      'gradient-cotton-candy': 'linear-gradient(to right, rgb(251 207 232), rgb(191 219 254))',
      'gradient-peach': 'linear-gradient(to right, rgb(254 215 170), rgb(251 207 232))',
      'gradient-lavender': 'linear-gradient(to right, rgb(221 214 254), rgb(251 207 232))',
      'gradient-spring': 'linear-gradient(to right, rgb(187 247 208), rgb(254 240 138))',
      'gradient-sky': 'linear-gradient(to right, rgb(191 219 254), rgb(165 243 252))',
      'bg-gradient-to-r from-pink-500 to-purple-500': 'linear-gradient(to right, rgb(251 207 232), rgb(221 214 254))',
    };
    return gradientMap[value || ''] || '';
  };

  // 칭호 색상 스타일
  const getTitleColorClass = (value: string) => {
    const colorMap: Record<string, string> = {
      '0': 'text-red-500',
      '1': 'text-orange-500',
      '2': 'text-yellow-500',
      '3': 'text-green-500',
      '4': 'text-blue-500',
      '5': 'text-purple-500',
      '6': 'text-pink-500',
      '7': 'text-gray-800',
      '8': 'text-amber-600',
      '9': 'block bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent',
    };
    return colorMap[value] || 'text-gray-600';
  };

  // 이름 효과 스타일 클래스
  const getNameEffectClass = (value: string) => {
    const effectMap: Record<string, string> = {
      'none': '',
      'gradient-rainbow': 'block bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent',
      'gradient-fire': 'block bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500 bg-clip-text text-transparent',
      'gradient-ocean': 'block bg-gradient-to-r from-blue-400 via-cyan-500 to-teal-500 bg-clip-text text-transparent',
      'gradient-gold': 'block bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent',
      'glow-blue': 'text-blue-500 drop-shadow-lg',
      'glow-pink': 'text-pink-500 drop-shadow-lg',
      'glow-gold': 'text-amber-500 drop-shadow-lg',
      'shadow': 'text-gray-800 drop-shadow-md',
    };
    return effectMap[value] || '';
  };

  // 배경 스타일 클래스
  const getBackgroundClass = (value: string) => {
    const bgMap: Record<string, string> = {
      'none': 'bg-transparent',
      'dots': 'bg-pattern-dots',
      'stripes': 'bg-pattern-stripes',
      'waves': 'bg-pattern-waves',
      'hearts': 'bg-pattern-hearts',
      'stars': 'bg-pattern-stars',
      'gradient-soft': 'bg-gradient-to-br from-pink-50 to-blue-50',
      'gradient-vivid': 'bg-gradient-to-br from-purple-100 to-pink-100',
      'gradient-mint': 'bg-gradient-to-br from-green-50 to-cyan-50',
      'gradient-sunset': 'bg-gradient-to-br from-orange-50 to-pink-50',
      'gradient-lavender': 'bg-gradient-to-br from-purple-50 to-indigo-50',
    };
    return bgMap[value] || 'bg-transparent';
  };

  // 애니메이션 스타일 클래스
  const getAnimationClass = (value: string) => {
    const animMap: Record<string, string> = {
      'none': '',
      'pulse': 'animate-pulse',         // 두근두근
      'spin': 'animate-spin-slow',      // 빙글빙글 (느린 회전)
      'bounce': 'animate-bounce',       // 통통
      'shake': 'animate-shake',         // 흔들흔들
      'sparkle': 'animate-sparkle',     // 반짝반짝
      'wave': 'animate-wave',           // 출렁출렁
      'float': 'animate-float',         // 둥실둥실
      'confetti': 'animate-confetti',   // 축하
      'flame': 'animate-flame',         // 불꽃
      'snow': 'animate-snow',           // 눈송이
    };
    return animMap[value] || '';
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

  // 잔디 색상 (3단계: 1개, 2개, 3개 이상)
  const getGrassColor = (cookieChange: number) => {
    if (cookieChange === 0) return 'bg-gray-200'; // 없음
    if (cookieChange === 1) return 'bg-green-300'; // 1개
    if (cookieChange === 2) return 'bg-green-500'; // 2개
    return 'bg-green-700'; // 3개 이상
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
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

      {/* 쿠키 & 캔디 현황 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-3">
          {/* 쿠키 (다했니 연동) */}
          <Card className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0">
            <CardContent className="py-4">
              <div className="text-center">
                <p className="text-amber-100 text-xs mb-1">다했니 쿠키</p>
                <p className="text-3xl font-bold">{currentStudent.cookie} 🍪</p>
                <p className="text-amber-100 text-xs mt-1">성찰로 획득</p>
              </div>
            </CardContent>
          </Card>
          {/* 캔디 (게임/상점용) */}
          <Card className="bg-gradient-to-r from-pink-400 to-purple-400 text-white border-0">
            <CardContent className="py-4">
              <div className="text-center">
                <p className="text-pink-100 text-xs mb-1">내 캔디</p>
                <p className="text-3xl font-bold">{currentStudent.jelly ?? currentStudent.cookie} 🍭</p>
                <p className="text-pink-100 text-xs mt-1">게임/상점용</p>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* 새로고침 버튼 */}
        <div className="text-center mt-3">
          <button
            onClick={refreshCookie}
            disabled={isRefreshingCookie}
            className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-full text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            <span className={isRefreshingCookie ? 'animate-spin' : ''}>🔄</span>
            {isRefreshingCookie ? '동기화 중...' : '다했니 동기화'}
          </button>
          <p className="text-xs text-gray-400 mt-1">쿠키 증가분이 캔디에 추가됩니다</p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="max-w-4xl mx-auto px-4">
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
          <button
            onClick={() => { setActiveTab('team'); loadTeamStatus(); }}
            className={`flex-1 min-w-[60px] py-3 text-center font-medium transition-colors text-sm ${
              activeTab === 'team'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-500'
            }`}
          >
            🏆 팀
          </button>
          <button
            onClick={() => setActiveTab('gameCenter')}
            className={`flex-1 min-w-[60px] py-3 text-center font-medium transition-colors text-sm ${
              activeTab === 'gameCenter'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-500'
            }`}
          >
            🎮 게임센터
          </button>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 홈 탭 */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* 빠른 액션 버튼 - 가로 배치 */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('wish')}
                className="flex-1 min-w-[120px] p-3 rounded-xl bg-purple-100 hover:bg-purple-200 transition-colors flex items-center gap-2"
              >
                <span className="text-2xl">⭐</span>
                <span className="text-sm font-medium text-purple-700">소원 빌기</span>
              </button>
              <button
                onClick={() => { setActiveTab('shop'); loadShop(); }}
                className="flex-1 min-w-[120px] p-3 rounded-xl bg-amber-100 hover:bg-amber-200 transition-colors flex items-center gap-2"
              >
                <span className="text-2xl">🏪</span>
                <span className="text-sm font-medium text-amber-700">상점 가기</span>
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className="flex-1 min-w-[120px] p-3 rounded-xl bg-blue-100 hover:bg-blue-200 transition-colors flex items-center gap-2"
              >
                <span className="text-2xl">👤</span>
                <span className="text-sm font-medium text-blue-700">프로필</span>
              </button>
              <button
                onClick={() => setActiveTab('grass')}
                className="flex-1 min-w-[120px] p-3 rounded-xl bg-green-100 hover:bg-green-200 transition-colors flex items-center gap-2"
              >
                <span className="text-2xl">🌱</span>
                <span className="text-sm font-medium text-green-700">내 잔디</span>
              </button>
            </div>

            {/* 정보 블럭 그리드 */}
            <div className="grid grid-cols-2 gap-3">
              {/* 내 프로필 블럭 - 구매한 프로필 요소 표시 */}
              <div
                className={`p-4 rounded-xl ${getBackgroundClass(currentStudent.profile.backgroundCode) || ''}`}
                style={{
                  border: `2px solid ${getBorderColor(currentStudent.profile.buttonBorderCode)}`,
                  ...(isGradientFill(currentStudent.profile.buttonFillCode)
                    ? { backgroundImage: getGradientStyle(currentStudent.profile.buttonFillCode) }
                    : { backgroundColor: (!currentStudent.profile.buttonFillCode || currentStudent.profile.buttonFillCode === 'none' || currentStudent.profile.buttonFillCode === 'transparent') ? 'rgb(255 251 235)' : getFillColor(currentStudent.profile.buttonFillCode) }
                  ),
                }}>
                <div className={`text-center ${getAnimationClass(currentStudent.profile.animationCode || 'none')}`}>
                  {currentStudent.profile.emojiCode && getEmojiFromCode(currentStudent.profile.emojiCode) ? (
                    <div className="text-4xl mb-1">{getEmojiFromCode(currentStudent.profile.emojiCode)}</div>
                  ) : (
                    <div className="w-12 h-12 mx-auto mb-1 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 text-xl">👤</span>
                    </div>
                  )}
                  <p className={`font-bold text-sm ${getNameEffectClass(currentStudent.profile.nameEffectCode)}`}>{currentStudent.name}</p>
                  {currentStudent.profile.title && (
                    <p className={`text-xs ${getTitleColorClass(currentStudent.profile.titleColorCode)}`}>{currentStudent.profile.title}</p>
                  )}
                </div>
              </div>

              {/* 내 정보 블럭 */}
              <div className="p-4 rounded-xl bg-blue-50">
                <p className="text-xs text-blue-600 font-medium mb-2">📊 내 정보</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">학급</span>
                    <span className="font-medium">{currentStudent.classId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">번호</span>
                    <span className="font-medium">{currentStudent.number}번</span>
                  </div>
                </div>
              </div>

              {/* 뱃지 블럭 */}
              <div className="p-4 rounded-xl bg-purple-50">
                <p className="text-xs text-purple-600 font-medium mb-2">🏆 내 뱃지</p>
                {currentStudent.badges && Object.keys(currentStudent.badges).length > 0 ? (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {(Object.entries(currentStudent.badges) as [string, Badge][])
                      .filter(([, badge]) => badge.hasBadge)
                      .slice(0, 6)
                      .map(([key, badge]) => (
                        <img
                          key={key}
                          src={badge.imgUrl}
                          alt={badge.title}
                          className="w-6 h-6 rounded"
                          title={badge.title}
                        />
                      ))}
                    {(Object.values(currentStudent.badges) as Badge[]).filter(b => b.hasBadge).length > 6 && (
                      <span className="text-xs text-purple-500">+{(Object.values(currentStudent.badges) as Badge[]).filter(b => b.hasBadge).length - 6}</span>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 text-xs">아직 없어요</p>
                )}
              </div>

              {/* 팀 정보 블럭 */}
              {myTeam ? (
                <div className="p-4 rounded-xl bg-green-50">
                  <p className="text-xs text-green-600 font-medium mb-1">👥 내 팀</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{myTeam.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{myTeam.teamName}</p>
                      <p className="text-xs text-pink-600">
                        {(() => {
                          // 팀원들의 캔디 합계 계산
                          const allStudents = [currentStudent, ...classmates];
                          return myTeam.members.reduce((sum, code) => {
                            const member = allStudents.find(s => s?.code === code);
                            return sum + (member?.jelly ?? member?.cookie ?? 0);
                          }, 0);
                        })()} 🍭 · {myTeam.members.length}명
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-500 font-medium mb-2">👥 내 팀</p>
                  <p className="text-center text-gray-400 text-xs">배정 대기중</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 소원의 돌 탭 */}
        {activeTab === 'wish' && (
          <div className="space-y-4">
            {/* 소원 streak 정보 */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🔥</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">연속 소원</p>
                      <p className="text-2xl font-bold text-gray-800">{currentStudent?.wishStreak || 0}일째</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>최고 기록: {currentStudent?.bestWishStreak || 0}일</p>
                    {hasWrittenTodayWish && (
                      <p className="text-green-600 mt-1">✓ 오늘 완료!</p>
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
                {/* 소원의 돌 이미지 */}
                <div className="flex justify-center py-4 mb-4">
                  <img
                    src="/images/wish-stone.jpg"
                    alt="소원들어주는 돌"
                    className="w-40 h-40 object-contain rounded-xl shadow-lg"
                  />
                </div>
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
                          className={`p-3 rounded-lg ${
                            wish.isGranted
                              ? 'shadow-lg'
                              : 'bg-white border border-gray-200'
                          }`}
                          style={{
                            border: wish.isGranted
                              ? '3px solid transparent'
                              : undefined,
                            backgroundImage: wish.isGranted
                              ? 'linear-gradient(to right, rgb(254 243 199), rgb(253 230 138), rgb(254 243 199)), linear-gradient(to right, rgb(239 68 68), rgb(234 179 8), rgb(34 197 94), rgb(59 130 246), rgb(168 85 247))'
                              : undefined,
                            backgroundOrigin: 'border-box',
                            backgroundClip: wish.isGranted ? 'padding-box, border-box' : undefined,
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={`font-medium text-sm ${wish.isGranted ? 'text-amber-700' : ''}`}>
                                {wish.isGranted && <span className="text-xl mr-1">✨</span>}
                                {wish.studentName}
                                {isMine && <span className="text-amber-500 ml-1">(나)</span>}
                                {wish.isGranted && <span className="ml-2 px-2 py-0.5 bg-gray-800 text-white text-xs rounded-full">🌟 이루어질지어다~</span>}
                              </p>
                              <p className={`mt-1 ${wish.isGranted ? 'text-amber-800 font-medium' : 'text-gray-700'}`}>
                                {wish.content}
                              </p>
                              {wish.isGranted && wish.grantedMessage && (
                                <p className="text-sm text-purple-600 mt-2 italic">
                                  💬 어디선가 들려오는 목소리: "{wish.grantedMessage}"
                                </p>
                              )}
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
              {/* 잔디 그리드 - 5행(월~금) x 22열 (약 5개월, 한 학기) */}
              {(() => {
                const WEEKS_COUNT = 22; // 약 5개월
                const CELL_SIZE = 18; // 셀 크기 (px)
                const GAP = 4; // 셀 간격 (px)
                const DAY_NAMES = ['월', '화', '수', '목', '금'];

                const today = new Date();
                // 시작일을 해당 주의 월요일로 맞춤
                const startDate = new Date(today);
                startDate.setDate(startDate.getDate() - (WEEKS_COUNT * 7 - 1));
                // 월요일로 조정 (0=일, 1=월, ..., 6=토)
                const startDayOfWeek = startDate.getDay();
                if (startDayOfWeek === 0) {
                  startDate.setDate(startDate.getDate() + 1); // 일요일 -> 월요일
                } else if (startDayOfWeek !== 1) {
                  startDate.setDate(startDate.getDate() - (startDayOfWeek - 1)); // 다른 요일 -> 월요일
                }

                // 각 주의 시작 날짜로 월 레이블 계산
                const monthLabels: { weekIdx: number; month: number }[] = [];
                let lastMonth = -1;

                for (let weekIdx = 0; weekIdx < WEEKS_COUNT; weekIdx++) {
                  const weekStartDate = new Date(startDate);
                  weekStartDate.setDate(weekStartDate.getDate() + weekIdx * 7);
                  const month = weekStartDate.getMonth();
                  if (month !== lastMonth) {
                    monthLabels.push({ weekIdx, month });
                    lastMonth = month;
                  }
                }

                // 오늘이 주말이면 금요일을 "오늘"로 표시
                const todayDayOfWeek = today.getDay();
                let displayToday = new Date(today);
                if (todayDayOfWeek === 0) {
                  displayToday.setDate(displayToday.getDate() - 2);
                } else if (todayDayOfWeek === 6) {
                  displayToday.setDate(displayToday.getDate() - 1);
                }
                const displayTodayStr = displayToday.toISOString().split('T')[0];

                return (
                  <div className="w-full flex justify-center">
                    <div>
                      {/* 월 표시 - 각 주 위치에 맞춤 */}
                      <div className="flex mb-2 ml-7" style={{ gap: `${GAP}px` }}>
                        {Array.from({ length: WEEKS_COUNT }).map((_, weekIdx) => {
                          const monthLabel = monthLabels.find(m => m.weekIdx === weekIdx);
                          return (
                            <div
                              key={weekIdx}
                              style={{ width: `${CELL_SIZE}px`, minWidth: `${CELL_SIZE}px`, fontSize: '11px' }}
                              className="text-gray-500 font-medium"
                            >
                              {monthLabel ? `${monthLabel.month + 1}월` : ''}
                            </div>
                          );
                        })}
                      </div>

                      {/* 잔디 그리드 - 5행(월~금) */}
                      <div className="flex pb-2" style={{ gap: `${GAP}px` }}>
                        {/* 요일 라벨 */}
                        <div className="flex flex-col justify-around text-xs text-gray-400 pr-1" style={{ gap: `${GAP}px` }}>
                          {DAY_NAMES.map((day, i) => (
                            <div key={i} style={{ height: `${CELL_SIZE}px`, lineHeight: `${CELL_SIZE}px` }}>{day}</div>
                          ))}
                        </div>
                        {Array.from({ length: WEEKS_COUNT }).map((_, weekIndex) => (
                          <div key={weekIndex} className="flex flex-col" style={{ gap: `${GAP}px` }}>
                          {Array.from({ length: 5 }).map((_, dayIndex) => {
                            // 주의 월요일 + dayIndex (0=월, 1=화, ..., 4=금)
                            const date = new Date(startDate);
                            date.setDate(date.getDate() + weekIndex * 7 + dayIndex);
                            const dateStr = date.toISOString().split('T')[0];
                            const isFuture = date > today;
                            const grassRecord = grassData.find((g) => g.date === dateStr);
                            const cookieChange = grassRecord?.cookieChange || 0;
                            const refreshCount = grassRecord?.count || 0;
                            const isToday = dateStr === displayTodayStr;

                            return (
                              <div
                                key={dayIndex}
                                style={{ width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px`, minWidth: `${CELL_SIZE}px`, minHeight: `${CELL_SIZE}px` }}
                                className={`rounded ${
                                  isFuture
                                    ? 'bg-gray-100'
                                    : getGrassColor(cookieChange)
                                } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                                title={isFuture ? '미래' : `${dateStr} (${DAY_NAMES[dayIndex]}): +${cookieChange}쿠키 (${refreshCount}회 기록)`}
                              />
                            );
                          })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 범례 */}
              <div className="flex items-center justify-center gap-6 mt-4">
                <span className="text-sm text-gray-500">
                  총 {grassData.reduce((sum, g) => sum + g.cookieChange, 0)}개 획득
                </span>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>0</span>
                  <div style={{ width: '14px', height: '14px' }} className="rounded bg-gray-200" title="0개" />
                  <div style={{ width: '14px', height: '14px' }} className="rounded bg-green-300" title="1개" />
                  <div style={{ width: '14px', height: '14px' }} className="rounded bg-green-500" title="2개" />
                  <div style={{ width: '14px', height: '14px' }} className="rounded bg-green-700" title="3+개" />
                  <span>3+</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 상점 탭 - 카테고리별 */}
        {activeTab === 'shop' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🏪 상점</CardTitle>
                <CardDescription>캔디로 아이템을 구매해보세요!</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4 p-3 bg-pink-50 rounded-lg">
                  <span className="text-gray-600">보유 캔디: </span>
                  <span className="font-bold text-pink-600 text-xl">{currentStudent.jelly ?? currentStudent.cookie} 🍭</span>
                </div>

                {/* 카테고리 탭 */}
                <div className="flex flex-wrap gap-2 mb-4 pb-2">
                  {[
                    { key: 'all', label: '전체', icon: '📦' },
                    { key: 'emoji', label: '이모지', icon: '😊' },
                    { key: 'titlePermit', label: '칭호권', icon: '🏷️' },
                    { key: 'titleColor', label: '칭호색상', icon: '🎨' },
                    { key: 'nameEffect', label: '이름효과', icon: '✨' },
                    { key: 'animation', label: '애니메이션', icon: '🎬' },
                    { key: 'buttonBorder', label: '버튼테두리', icon: '🔲' },
                    { key: 'buttonFill', label: '버튼채우기', icon: '🎨' },
                  ].map((cat) => {
                    const count = cat.key === 'all'
                      ? shopItems.filter((item: ShopItem) => item.price >= 5).length
                      : shopItems.filter((item: ShopItem) => item.category === cat.key && item.price >= 5).length;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setShopCategory(cat.key as typeof shopCategory)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                          shopCategory === cat.key
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                          shopCategory === cat.key ? 'bg-amber-600' : 'bg-gray-200'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {isLoadingShop ? (
                  <p className="text-center py-8 text-gray-500">로딩 중...</p>
                ) : (
                  <div className="space-y-3">
                    {shopItems
                      .filter((item: ShopItem) => {
                        // 카테고리 필터링
                        if (shopCategory === 'all') return true;
                        return item.category === shopCategory;
                      })
                      .filter((item: ShopItem) => item.price >= 5) // 최소 5캔디
                      .map((item: ShopItem) => {
                        const isOwned = currentStudent.ownedItems.includes(item.code);
                        const currentJelly = currentStudent.jelly ?? currentStudent.cookie ?? 0;
                        const canAfford = currentJelly >= item.price;

                        // 카테고리별 아이콘
                        const getCategoryIcon = () => {
                          switch (item.category) {
                            case 'emoji': return item.value || '😊';
                            case 'titlePermit': return '🏷️';
                            case 'titleColor': return '🎨';
                            case 'nameEffect': return '✨';
                            case 'animation': return '🎬';
                            case 'buttonBorder': return '🔲';
                            case 'buttonFill': return '🎨';
                            default: return '📦';
                          }
                        };

                        // 카테고리별 한글 이름
                        const getCategoryName = () => {
                          switch (item.category) {
                            case 'emoji': return '이모지';
                            case 'titlePermit': return '칭호권';
                            case 'titleColor': return '칭호색상';
                            case 'nameEffect': return '이름 효과';
                            case 'animation': return '애니메이션';
                            case 'buttonBorder': return '버튼 테두리';
                            case 'buttonFill': return '버튼 채우기';
                            default: return item.category;
                          }
                        };

                        return (
                          <div
                            key={item.code}
                            className={`p-4 rounded-xl border-2 ${isOwned ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {/* 아이템 썸네일 */}
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                                  {getCategoryIcon()}
                                </div>
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-xs text-gray-500">{getCategoryName()}</p>
                                </div>
                              </div>
                              <div className="text-right flex flex-col gap-1">
                                <p className="font-bold text-amber-600 text-lg">{item.price} 🍪</p>
                                <div className="flex gap-1">
                                  {/* 미리보기 버튼 */}
                                  <button
                                    onClick={() => setPreviewItem(item)}
                                    className="px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600"
                                  >
                                    👁️ 미리보기
                                  </button>
                                  {isOwned ? (
                                    item.category === 'titlePermit' ? (
                                      hasTitlePermit() ? (
                                        <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-lg">
                                          ✅ 활성화됨
                                        </span>
                                      ) : (
                                        <button
                                          onClick={handleActivateTitlePermit}
                                          disabled={isPurchasing}
                                          className="px-2 py-1 rounded-lg text-xs font-medium bg-purple-500 hover:bg-purple-600 text-white"
                                        >
                                          {isPurchasing ? '...' : '🏷️ 활성화'}
                                        </button>
                                      )
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-lg">
                                        ✅ 보유
                                      </span>
                                    )
                                  ) : (
                                    <button
                                      onClick={() => handlePurchase(item)}
                                      disabled={!canAfford || isPurchasing}
                                      className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                        canAfford
                                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                      }`}
                                    >
                                      {isPurchasing ? '...' : canAfford ? '🛒 구매' : '🔒'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {shopItems
                      .filter((item: ShopItem) => item.category === shopCategory)
                      .filter((item: ShopItem) => item.price >= 5).length === 0 && (
                      <p className="text-center py-8 text-gray-500">이 카테고리에 상품이 없어요</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 보유 아이템 요약 */}
            {currentStudent.ownedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🎒 내 아이템 ({currentStudent.ownedItems.length}개)</CardTitle>
                  <CardDescription>프로필 탭에서 아이템을 장착할 수 있어요!</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {currentStudent.ownedItems.slice(0, 10).map((itemCode: string) => {
                      const item = shopItems.find((i: ShopItem) => i.code === itemCode);
                      return (
                        <span key={itemCode} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                          {item?.name || itemCode}
                        </span>
                      );
                    })}
                    {currentStudent.ownedItems.length > 10 && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                        +{currentStudent.ownedItems.length - 10}개 더
                      </span>
                    )}
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
                {/* 미리보기 - 프로필 효과 적용 */}
                <div className="text-center p-6 rounded-xl bg-gradient-to-b from-amber-50 to-orange-50">
                  <p className="text-xs text-gray-500 mb-3">미리보기</p>
                  <div
                    className={`inline-block px-6 py-4 rounded-xl ${getAnimationClass(selectedAnimation)}`}
                    style={{
                      border: `2px solid ${getBorderColor(selectedBtnBorder)}`,
                      ...(isGradientFill(selectedBtnFill)
                        ? { backgroundImage: getGradientStyle(selectedBtnFill) }
                        : { backgroundColor: getFillColor(selectedBtnFill) || 'transparent' }
                      ),
                    }}
                  >
                    {/* 뱃지가 선택되어 있으면 뱃지 표시, 없으면 이모지 표시 */}
                    {selectedBadge && currentStudent?.badges?.[selectedBadge]?.hasBadge ? (
                      <div className={`mb-2 ${getAnimationClass(selectedAnimation)}`}>
                        <img
                          src={currentStudent.badges[selectedBadge].imgUrl}
                          alt={currentStudent.badges[selectedBadge].title}
                          className="w-16 h-16 mx-auto rounded"
                        />
                      </div>
                    ) : selectedEmoji && getOwnedEmojis().includes(selectedEmoji) ? (
                      <div className={`text-4xl mb-2 ${getAnimationClass(selectedAnimation)}`}>{selectedEmoji}</div>
                    ) : (
                      <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-400 text-xs">없음</span>
                      </div>
                    )}
                    <p className={`font-bold text-lg ${getNameEffectClass(selectedNameEffect)}`}>{currentStudent.name}</p>
                    {hasTitlePermit() && selectedTitle && (
                      <p className={`text-sm mt-1 ${getTitleColorClass(selectedTitleColor)}`}>{selectedTitle}</p>
                    )}
                  </div>
                </div>

                {/* 이모지 선택 - 구매한 것만 표시 (기본 이모지 없음) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    😊 이름 앞 이모지
                    <span className="text-xs text-gray-400 ml-2">(상점에서 구매 필요)</span>
                  </label>
                  {getOwnedEmojis().length === 0 ? (
                    <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500">
                      <p className="text-2xl mb-2">🛒</p>
                      <p className="text-sm">보유한 이모지가 없습니다</p>
                      <p className="text-xs text-gray-400">상점에서 이모지를 구매해보세요!</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getOwnedEmojis().map((emoji: string) => (
                        <button
                          key={emoji}
                          onClick={() => setSelectedEmoji(selectedEmoji === emoji ? '' : emoji)}
                          className={`text-2xl px-3 py-1 rounded-lg transition-all shadow-md hover:shadow-lg ${
                            selectedEmoji === emoji
                              ? 'bg-amber-100 ring-2 ring-amber-400 scale-110'
                              : 'bg-white hover:bg-gray-50'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 뱃지 선택 - 획득한 뱃지 중에서 선택 (이모지 대신 표시) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🏆 프로필 뱃지
                    <span className="text-xs text-gray-400 ml-2">(이모지 대신 뱃지 표시)</span>
                  </label>
                  {currentStudent?.badges && Object.values(currentStudent.badges).some(b => b.hasBadge) ? (
                    <div className="flex flex-wrap gap-2">
                      {/* 뱃지 해제 버튼 */}
                      <button
                        onClick={() => setSelectedBadge('')}
                        className={`px-2 py-1 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center ${
                          !selectedBadge
                            ? 'bg-gray-200 ring-2 ring-gray-400'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-xs text-gray-500">없음</span>
                      </button>
                      {(Object.entries(currentStudent.badges) as [string, Badge][])
                        .filter(([, badge]) => badge.hasBadge)
                        .map(([key, badge]) => (
                          <button
                            key={key}
                            onClick={() => setSelectedBadge(selectedBadge === key ? '' : key)}
                            className={`p-2 rounded-lg transition-all shadow-md hover:shadow-lg ${
                              selectedBadge === key
                                ? 'bg-amber-100 ring-2 ring-amber-400 scale-110'
                                : 'bg-white hover:bg-gray-50'
                            }`}
                            title={badge.title}
                          >
                            <img src={badge.imgUrl} alt={badge.title} className="w-16 h-16 rounded" />
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500">
                      <p className="text-2xl mb-2">🏆</p>
                      <p className="text-sm">획득한 뱃지가 없습니다</p>
                      <p className="text-xs text-gray-400">활동을 통해 뱃지를 획득해보세요!</p>
                    </div>
                  )}
                </div>

                {/* 칭호 입력 - 칭호권 필요, 5글자 제한 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      🏷️ 칭호
                    </label>
                    <span className={`text-xs px-2 py-1 rounded-full ${hasTitlePermit() ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {hasTitlePermit() ? '✓ 칭호권 보유중' : '칭호권 필요'}
                    </span>
                  </div>
                  {!hasTitlePermit() ? (
                    <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500">
                      <p className="text-2xl mb-2">🔒</p>
                      <p className="text-sm">칭호권이 필요합니다</p>
                      <p className="text-xs text-gray-400">상점에서 칭호권을 구매하면 칭호를 설정할 수 있어요!</p>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={selectedTitle}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedTitle(e.target.value.slice(0, 5))}
                        placeholder="칭호 입력 (5글자 이내)"
                        maxLength={5}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      />
                      <p className="text-xs text-gray-400 mt-1">{selectedTitle.length}/5</p>
                    </>
                  )}
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
                        onClick={() => setSelectedTitleColor(selectedTitleColor === item.value ? '0' : item.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg ${
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

                {/* 이름 효과 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ✨ 이름 효과
                    <span className="text-xs text-gray-400 ml-2">(구매한 효과)</span>
                  </label>
                  {getOwnedNameEffects().length === 0 ? (
                    <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500">
                      <p className="text-sm">보유한 이름 효과가 없습니다</p>
                      <p className="text-xs text-gray-400">상점에서 구매해보세요!</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getOwnedNameEffects().map((item: ShopItem) => (
                        <button
                          key={item.code}
                          onClick={() => setSelectedNameEffect(selectedNameEffect === item.value ? 'none' : item.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg ${
                            selectedNameEffect === item.value
                              ? 'ring-2 ring-amber-400 scale-105'
                              : 'hover:scale-105'
                          } ${getNameEffectClass(item.value)} bg-white border`}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 애니메이션 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🎬 애니메이션
                    <span className="text-xs text-gray-400 ml-2">(구매한 애니메이션)</span>
                  </label>
                  {getOwnedAnimations().length === 0 ? (
                    <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500">
                      <p className="text-sm">보유한 애니메이션이 없습니다</p>
                      <p className="text-xs text-gray-400">상점에서 구매해보세요!</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getOwnedAnimations().map((item: ShopItem) => (
                        <button
                          key={item.code}
                          onClick={() => setSelectedAnimation(selectedAnimation === item.value ? 'none' : item.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg ${
                            selectedAnimation === item.value
                              ? 'ring-2 ring-amber-400 scale-105'
                              : 'hover:scale-105'
                          } ${selectedAnimation === item.value ? getAnimationClass(item.value) : ''} bg-white border`}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 버튼 테두리 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🔲 버튼 테두리
                    <span className="text-xs text-gray-400 ml-2">(구매한 테두리)</span>
                  </label>
                  {getOwnedBtnBorders().length === 0 ? (
                    <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500">
                      <p className="text-sm">보유한 버튼 테두리가 없습니다</p>
                      <p className="text-xs text-gray-400">상점에서 구매해보세요!</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getOwnedBtnBorders().map((item: ShopItem) => (
                        <button
                          key={item.code}
                          onClick={() => setSelectedBtnBorder(selectedBtnBorder === item.value ? 'gray-300' : item.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg bg-white ${
                            selectedBtnBorder === item.value
                              ? 'ring-2 ring-amber-400 scale-105'
                              : 'hover:scale-105'
                          }`}
                          style={{ border: `2px solid ${getBorderColor(item.value)}` }}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 버튼 채우기 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🎨 버튼 배경
                    <span className="text-xs text-gray-400 ml-2">(구매한 배경)</span>
                  </label>
                  {getOwnedBtnFills().length === 0 ? (
                    <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500">
                      <p className="text-sm">보유한 버튼 배경이 없습니다</p>
                      <p className="text-xs text-gray-400">상점에서 구매해보세요!</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getOwnedBtnFills().map((item: ShopItem) => (
                        <button
                          key={item.code}
                          onClick={() => setSelectedBtnFill(selectedBtnFill === item.value ? 'none' : item.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg ${
                            selectedBtnFill === item.value
                              ? 'ring-2 ring-amber-400 scale-105'
                              : 'hover:scale-105'
                          }`}
                          style={{
                            border: '1px solid rgb(209 213 219)',
                            ...(isGradientFill(item.value)
                              ? { backgroundImage: getGradientStyle(item.value) }
                              : { backgroundColor: getFillColor(item.value) }
                            ),
                          }}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  )}
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
                        className="p-3 rounded-xl hover:shadow-md transition-all flex flex-col items-center"
                        style={{
                          border: `2px solid ${getBorderColor(classmate.profile.buttonBorderCode)}`,
                          ...(isGradientFill(classmate.profile.buttonFillCode)
                            ? { backgroundImage: getGradientStyle(classmate.profile.buttonFillCode) }
                            : { backgroundColor: getFillColor(classmate.profile.buttonFillCode) }
                          ),
                        }}
                      >
                        <div className={`text-3xl mb-1 ${getAnimationClass(classmate.profile.animationCode || 'none')}`}>
                          {/* 뱃지가 설정되어 있으면 뱃지, 없으면 이모지 표시 */}
                          {classmate.profile.profileBadgeKey && classmate.badges?.[classmate.profile.profileBadgeKey]?.hasBadge ? (
                            <img
                              src={classmate.badges[classmate.profile.profileBadgeKey].imgUrl}
                              alt={classmate.badges[classmate.profile.profileBadgeKey].title}
                              className="w-10 h-10 mx-auto rounded"
                            />
                          ) : getEmojiFromCode(classmate.profile.emojiCode) || (
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-400 text-xs">👤</span>
                            </div>
                          )}
                        </div>
                        <p className={`font-medium text-sm truncate w-full text-center ${getNameEffectClass(classmate.profile.nameEffectCode)}`}>
                          {classmate.name}
                        </p>
                        {classmate.profile.title && (
                          <p className={`text-xs truncate w-full text-center ${getTitleColorClass(classmate.profile.titleColorCode)}`}>
                            {classmate.profile.title}
                          </p>
                        )}
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
                          <span className="text-xl">{getEmojiFromCode(s.profile.emojiCode) || '👤'}</span>
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

        {/* 팀 현황 탭 */}
        {activeTab === 'team' && (
          <div className="space-y-4">
            {isLoadingTeamStatus ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  📊 팀 현황을 불러오는 중...
                </CardContent>
              </Card>
            ) : !myTeam ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <div className="text-4xl mb-4">😢</div>
                  <p>아직 팀에 배정되지 않았어요.</p>
                  <p className="text-sm mt-2">선생님께 문의해주세요!</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 팀 헤더 - 컴팩트 */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 flex items-center gap-4">
                  <span className="text-3xl">{myTeam.flag}</span>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-amber-800">{myTeam.teamName}</h2>
                    <div className="flex gap-3 mt-1 text-sm flex-wrap">
                      <span className="text-amber-600">{teamMembers.reduce((sum, m) => sum + (m.cookie || 0), 0)} 🍪</span>
                      <span className="text-pink-600 font-medium">{teamMembers.reduce((sum, m) => sum + (m.jelly ?? m.cookie ?? 0), 0)} 🍭</span>
                      <span className="text-blue-600">{myTeam.members.length}명</span>
                    </div>
                  </div>
                </div>

                {/* 팀원 목록 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">👥 팀원 현황</CardTitle>
                    <CardDescription>팀원들의 최근 활동을 확인해보세요!</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {teamMembers.map((member) => {
                      const memberGrass = teamMembersGrass.get(member.code) || [];
                      const isMe = member.code === currentStudent?.code;

                      // 최근 7일간 데이터
                      const today = new Date();
                      const recentDays: { date: string; change: number }[] = [];
                      for (let i = 6; i >= 0; i--) {
                        const d = new Date(today);
                        d.setDate(d.getDate() - i);
                        const dateStr = d.toISOString().split('T')[0];
                        const dayData = memberGrass.find(g => g.date === dateStr);
                        recentDays.push({
                          date: dateStr,
                          change: dayData?.cookieChange || 0
                        });
                      }

                      // 총 획득량
                      const totalGain = memberGrass.reduce((sum, g) => sum + (g.cookieChange > 0 ? g.cookieChange : 0), 0);

                      return (
                        <div
                          key={member.code}
                          className={`p-3 rounded-xl ${isMe ? 'bg-amber-50 border-2 border-amber-300' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-3">
                            {/* 프로필 이모지/뱃지 */}
                            <div className={`text-2xl ${getAnimationClass(member.profile.animationCode || 'none')}`}>
                              {member.profile.profileBadgeKey && member.badges?.[member.profile.profileBadgeKey]?.hasBadge ? (
                                <img
                                  src={member.badges[member.profile.profileBadgeKey].imgUrl}
                                  alt={member.badges[member.profile.profileBadgeKey].title}
                                  className="w-10 h-10 rounded"
                                />
                              ) : (
                                getEmojiFromCode(member.profile.emojiCode) || '👤'
                              )}
                            </div>
                            {/* 이름/칭호/번호 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className={`font-bold ${getNameEffectClass(member.profile.nameEffectCode)}`}>
                                  {member.name}
                                </span>
                                {isMe && <span className="text-xs bg-amber-500 text-white px-1 rounded">나</span>}
                              </div>
                              {member.profile.title && (
                                <p className={`text-xs ${getTitleColorClass(member.profile.titleColorCode)}`}>{member.profile.title}</p>
                              )}
                            </div>
                            {/* 쿠키/캔디 */}
                            <div className="text-right text-sm shrink-0">
                              <p className="text-amber-600">{member.cookie} 🍪</p>
                              <p className="font-bold text-pink-600">{member.jelly ?? member.cookie} 🍭</p>
                            </div>
                          </div>
                          {/* 최근 7일 잔디 */}
                          <div className="flex items-center gap-1 mt-2">
                            <div className="flex gap-0.5">
                              {recentDays.map((day, idx) => {
                                const bgColor = day.change === 0 ? 'bg-gray-200'
                                  : day.change === 1 ? 'bg-green-300'
                                  : day.change === 2 ? 'bg-green-500'
                                  : 'bg-green-700';
                                return (
                                  <div
                                    key={idx}
                                    className={`w-5 h-5 rounded ${bgColor} flex items-center justify-center`}
                                    title={`${day.date}: +${day.change}🍪`}
                                  >
                                    {day.change > 0 && (
                                      <span className="text-[9px] text-white font-bold">
                                        {day.change > 9 ? '9+' : day.change}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <span className="text-xs text-gray-400">
                              오늘: {recentDays[6]?.change > 0 ? `+${recentDays[6].change}` : '0'}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {teamMembers.length === 0 && (
                      <p className="text-center text-gray-400 py-4">팀원이 없습니다.</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* 게임센터 탭 */}
        {activeTab === 'gameCenter' && (
          <div className="space-y-6">
            {/* 준비중 안내 배너 */}
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 text-center border-2 border-purple-200">
              <div className="text-5xl mb-3">🎮</div>
              <h2 className="text-xl font-bold text-purple-800 mb-2">게임센터</h2>
              <p className="text-purple-600 text-sm">
                쿠키를 사용해서 다양한 게임을 즐겨보세요!
              </p>
              <div className="mt-3 inline-block bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-sm font-medium">
                🚧 현재 준비 중인 기능입니다
              </div>
            </div>

            {/* 게임 목록 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* 쿠키 배틀 */}
              <button
                disabled
                className="p-5 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 opacity-60 cursor-not-allowed transition-all hover:scale-[0.98]"
              >
                <div className="text-4xl mb-2">⚔️</div>
                <h3 className="font-bold text-red-800 text-sm">쿠키 배틀</h3>
                <p className="text-xs text-red-600 mt-1">팀 대결</p>
                <span className="inline-block mt-2 bg-gray-200 text-gray-500 px-2 py-0.5 rounded text-xs">
                  준비중
                </span>
              </button>

              {/* 스피드 퀴즈 */}
              <button
                disabled
                className="p-5 rounded-2xl bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 opacity-60 cursor-not-allowed transition-all hover:scale-[0.98]"
              >
                <div className="text-4xl mb-2">⚡</div>
                <h3 className="font-bold text-yellow-800 text-sm">스피드 퀴즈</h3>
                <p className="text-xs text-yellow-600 mt-1">개인전</p>
                <span className="inline-block mt-2 bg-gray-200 text-gray-500 px-2 py-0.5 rounded text-xs">
                  준비중
                </span>
              </button>

              {/* 홀짝 게임 */}
              <button
                disabled
                className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 opacity-60 cursor-not-allowed transition-all hover:scale-[0.98]"
              >
                <div className="text-4xl mb-2">🎲</div>
                <h3 className="font-bold text-blue-800 text-sm">홀짝 게임</h3>
                <p className="text-xs text-blue-600 mt-1">개인전</p>
                <span className="inline-block mt-2 bg-gray-200 text-gray-500 px-2 py-0.5 rounded text-xs">
                  준비중
                </span>
              </button>

              {/* 가위바위보 */}
              <button
                disabled
                className="p-5 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 opacity-60 cursor-not-allowed transition-all hover:scale-[0.98]"
              >
                <div className="text-4xl mb-2">✊</div>
                <h3 className="font-bold text-green-800 text-sm">가위바위보</h3>
                <p className="text-xs text-green-600 mt-1">개인전</p>
                <span className="inline-block mt-2 bg-gray-200 text-gray-500 px-2 py-0.5 rounded text-xs">
                  준비중
                </span>
              </button>

              {/* 끝말잇기 */}
              <button
                disabled
                className="p-5 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-200 opacity-60 cursor-not-allowed transition-all hover:scale-[0.98]"
              >
                <div className="text-4xl mb-2">💬</div>
                <h3 className="font-bold text-pink-800 text-sm">끝말잇기</h3>
                <p className="text-xs text-pink-600 mt-1">실시간</p>
                <span className="inline-block mt-2 bg-gray-200 text-gray-500 px-2 py-0.5 rounded text-xs">
                  준비중
                </span>
              </button>

              {/* 숫자야구 */}
              <button
                disabled
                className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 opacity-60 cursor-not-allowed transition-all hover:scale-[0.98]"
              >
                <div className="text-4xl mb-2">⚾</div>
                <h3 className="font-bold text-purple-800 text-sm">숫자야구</h3>
                <p className="text-xs text-purple-600 mt-1">개인전</p>
                <span className="inline-block mt-2 bg-gray-200 text-gray-500 px-2 py-0.5 rounded text-xs">
                  준비중
                </span>
              </button>
            </div>

            {/* 안내 문구 */}
            <Card className="bg-gray-50 border-dashed">
              <CardContent className="py-4 text-center text-gray-500 text-sm">
                <p>🔜 다양한 게임이 곧 추가될 예정이에요!</p>
                <p className="text-xs mt-1">게임에서 쿠키를 걸고 승부를 펼쳐보세요</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 친구 프로필 모달 - 크고 둥근 팝업 */}
        {selectedClassmate && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedClassmate(null)}
          >
            <div
              className="bg-white shadow-2xl border-4 border-amber-300 overflow-hidden"
              style={{ width: '420px', maxWidth: '95vw', borderRadius: '24px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-4 flex items-center justify-between">
                <span className="text-white font-bold text-lg">👥 친구 프로필</span>
                <button onClick={() => setSelectedClassmate(null)} className="text-white/80 hover:text-white text-2xl p-1">✕</button>
              </div>

              {/* 바디 */}
              <div className="p-6 space-y-5">
                {/* 중앙 프로필 카드 */}
                <div className={`text-center p-6 rounded-2xl ${getBackgroundClass(selectedClassmate.profile.backgroundCode) || 'bg-gradient-to-b from-amber-50 to-orange-50'}`}>
                  <div
                    className={`inline-block p-4 rounded-2xl ${getAnimationClass(selectedClassmate.profile.animationCode || 'none')}`}
                    style={{
                      border: `2px solid ${getBorderColor(selectedClassmate.profile.buttonBorderCode)}`,
                      ...(isGradientFill(selectedClassmate.profile.buttonFillCode)
                        ? { backgroundImage: getGradientStyle(selectedClassmate.profile.buttonFillCode) }
                        : { backgroundColor: getFillColor(selectedClassmate.profile.buttonFillCode) }
                      ),
                    }}
                  >
                    {/* 뱃지가 설정되어 있으면 뱃지, 없으면 이모지 표시 */}
                    {selectedClassmate.profile.profileBadgeKey && selectedClassmate.badges?.[selectedClassmate.profile.profileBadgeKey]?.hasBadge ? (
                      <div className={`mb-3 ${getAnimationClass(selectedClassmate.profile.animationCode || 'none')}`}>
                        <img
                          src={selectedClassmate.badges[selectedClassmate.profile.profileBadgeKey].imgUrl}
                          alt={selectedClassmate.badges[selectedClassmate.profile.profileBadgeKey].title}
                          className="w-24 h-24 mx-auto rounded-lg"
                        />
                      </div>
                    ) : getEmojiFromCode(selectedClassmate.profile.emojiCode) ? (
                      <div className={`text-6xl mb-3 ${getAnimationClass(selectedClassmate.profile.animationCode || 'none')}`}>
                        {getEmojiFromCode(selectedClassmate.profile.emojiCode)}
                      </div>
                    ) : (
                      <div className="w-20 h-20 mx-auto mb-3 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-400 text-3xl">👤</span>
                      </div>
                    )}
                    <p className={`font-bold text-xl ${getNameEffectClass(selectedClassmate.profile.nameEffectCode)}`}>
                      {selectedClassmate.name}
                    </p>
                    {selectedClassmate.profile.title && (
                      <p className={`text-sm mt-1 font-medium ${getTitleColorClass(selectedClassmate.profile.titleColorCode)}`}>
                        {selectedClassmate.profile.title}
                      </p>
                    )}
                  </div>
                </div>

                {/* 통계 */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="font-bold text-2xl text-amber-600">{selectedClassmate.cookie}</p>
                    <p className="text-gray-500 text-sm">🍪 쿠키</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="font-bold text-2xl text-green-600">{selectedClassmate.totalCookie}</p>
                    <p className="text-gray-500 text-sm">📊 누적</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3">
                    <p className="font-bold text-2xl text-purple-600">{selectedClassmate.wishStreak || 0}</p>
                    <p className="text-gray-500 text-sm">🔥 연속</p>
                  </div>
                </div>

                {/* 뱃지 */}
                {selectedClassmate.badges && Object.values(selectedClassmate.badges).some(b => b.hasBadge) && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500 mb-2">🏆 획득 뱃지</p>
                    <div className="flex gap-2 flex-wrap">
                      {(Object.entries(selectedClassmate.badges) as [string, Badge][])
                        .filter(([, badge]) => badge.hasBadge)
                        .map(([key, badge]) => (
                          <img key={key} src={badge.imgUrl} alt={badge.title} className="w-8 h-8 rounded" title={badge.title} />
                        ))}
                    </div>
                  </div>
                )}

                {/* 장착 아이템 */}
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-2">🎨 장착 아이템</p>
                  <div className="flex flex-wrap gap-2">
                    {/* 이모지 */}
                    <span className="px-2 py-1 bg-white rounded-lg text-sm flex items-center gap-1">
                      <span className="text-lg">{getEmojiFromCode(selectedClassmate.profile.emojiCode) || '👤'}</span>
                      <span className="text-gray-600">이모지</span>
                    </span>
                    {/* 칭호 */}
                    {selectedClassmate.profile.title && (
                      <span className={`px-2 py-1 bg-white rounded-lg text-sm flex items-center gap-1 ${getTitleColorClass(selectedClassmate.profile.titleColorCode)}`}>
                        <span>🏷️</span>
                        <span>{selectedClassmate.profile.title}</span>
                      </span>
                    )}
                    {/* 버튼 테두리 */}
                    {selectedClassmate.profile.buttonBorderCode && selectedClassmate.profile.buttonBorderCode !== 'gray-300' && (
                      <span
                        className="px-2 py-1 bg-white rounded-lg text-sm flex items-center gap-1"
                        style={{ border: `2px solid ${getBorderColor(selectedClassmate.profile.buttonBorderCode)}` }}
                      >
                        <span>🖼️</span>
                        <span className="text-gray-600">테두리</span>
                      </span>
                    )}
                    {/* 버튼 색상 */}
                    {selectedClassmate.profile.buttonFillCode && selectedClassmate.profile.buttonFillCode !== 'none' && (
                      <span
                        className="px-2 py-1 rounded-lg text-sm flex items-center gap-1"
                        style={{
                          ...(isGradientFill(selectedClassmate.profile.buttonFillCode)
                            ? { backgroundImage: getGradientStyle(selectedClassmate.profile.buttonFillCode) }
                            : { backgroundColor: getFillColor(selectedClassmate.profile.buttonFillCode) }
                          ),
                        }}
                      >
                        <span>🎨</span>
                        <span>버튼색</span>
                      </span>
                    )}
                    {/* 애니메이션 */}
                    {selectedClassmate.profile.animationCode && selectedClassmate.profile.animationCode !== 'none' && (
                      <span className={`px-2 py-1 bg-white rounded-lg text-sm flex items-center gap-1 ${getAnimationClass(selectedClassmate.profile.animationCode)}`}>
                        <span>✨</span>
                        <span className="text-gray-600">애니메이션</span>
                      </span>
                    )}
                    {/* 배경 */}
                    {selectedClassmate.profile.backgroundCode && selectedClassmate.profile.backgroundCode !== 'bg-white' && (
                      <span className={`px-2 py-1 rounded-lg text-sm flex items-center gap-1 ${getBackgroundClass(selectedClassmate.profile.backgroundCode)}`}>
                        <span>🌈</span>
                        <span>배경</span>
                      </span>
                    )}
                    {/* 이름 효과 */}
                    {selectedClassmate.profile.nameEffectCode && selectedClassmate.profile.nameEffectCode !== 'none' && (
                      <span className="px-2 py-1 bg-white rounded-lg text-sm flex items-center gap-1">
                        <span>💫</span>
                        <span className={getNameEffectClass(selectedClassmate.profile.nameEffectCode)}>이름효과</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 잔디 */}
                <div className="p-3 bg-green-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">🌱 최근 활동</span>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <span>적음</span>
                      <div className="w-3 h-3 rounded-sm bg-gray-200" />
                      <div className="w-3 h-3 rounded-sm bg-green-300" />
                      <div className="w-3 h-3 rounded-sm bg-green-500" />
                      <span>많음</span>
                    </div>
                  </div>
                  {isLoadingClassmateGrass ? (
                    <p className="text-center text-sm text-gray-400 py-4">로딩 중...</p>
                  ) : (
                    <div className="flex gap-[2px] justify-center">
                      {(() => {
                        const WEEKS = 12;
                        const today = new Date();
                        // 시작일을 12주 전 월요일로 설정
                        const startDate = new Date(today);
                        startDate.setDate(startDate.getDate() - (WEEKS * 7));
                        const startDayOfWeek = startDate.getDay();
                        if (startDayOfWeek === 0) {
                          startDate.setDate(startDate.getDate() + 1);
                        } else if (startDayOfWeek !== 1) {
                          startDate.setDate(startDate.getDate() - (startDayOfWeek - 1));
                        }
                        return Array.from({ length: WEEKS }).map((_, weekIndex) => (
                          <div key={weekIndex} className="flex flex-col gap-[2px]">
                            {Array.from({ length: 5 }).map((_, dayIndex) => {
                              const date = new Date(startDate);
                              date.setDate(date.getDate() + weekIndex * 7 + dayIndex);
                              const dateStr = date.toISOString().split('T')[0];
                              const isFuture = date > today;
                              const grassRecord = selectedClassmateGrass.find((g) => g.date === dateStr);
                              const cookieChange = grassRecord?.cookieChange || 0;
                              return (
                                <div
                                  key={dayIndex}
                                  className={`w-3 h-3 rounded-sm ${isFuture ? 'bg-gray-100' : getGrassColor(cookieChange)}`}
                                  title={`${dateStr}: +${cookieChange}쿠키`}
                                />
                              );
                            })}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 상점 아이템 미리보기 모달 */}
        {previewItem && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewItem(null)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl border-4 border-purple-300 overflow-hidden"
              style={{ width: '360px', maxWidth: '95vw' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="bg-gradient-to-r from-purple-400 to-pink-400 px-5 py-3 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">👁️ 미리보기</p>
                    <p className="text-purple-100 text-sm">{previewItem.name}</p>
                  </div>
                  <button onClick={() => setPreviewItem(null)} className="text-white/80 hover:text-white text-2xl p-2">✕</button>
                </div>
              </div>

              {/* 미리보기 내용 */}
              <div className="p-5">
                {/* 카테고리별 미리보기 */}
                <div className="text-center p-6 bg-gradient-to-b from-purple-50 to-pink-50 rounded-xl mb-4">
                  <p className="text-xs text-gray-500 mb-3">이 아이템을 적용하면...</p>

                  {/* 이모지 미리보기 */}
                  {previewItem.category === 'emoji' && (
                    <div className="space-y-2">
                      <div className="text-6xl">{previewItem.value}</div>
                      <p className="text-sm text-gray-600">프로필에 표시될 이모지</p>
                    </div>
                  )}

                  {/* 칭호권 미리보기 */}
                  {previewItem.category === 'titlePermit' && (
                    <div className="space-y-2">
                      <div className="text-4xl">🏷️</div>
                      <div className="inline-block px-4 py-2 bg-white rounded-lg shadow">
                        <p className="font-bold">{currentStudent.name}</p>
                        <p className="text-amber-600 text-sm font-medium">예시칭호</p>
                      </div>
                      <p className="text-sm text-gray-600">칭호를 {previewItem.value}글자까지 설정 가능!</p>
                    </div>
                  )}

                  {/* 칭호 색상 미리보기 */}
                  {previewItem.category === 'titleColor' && (
                    <div className="space-y-2">
                      <div className="inline-block px-6 py-3 bg-white rounded-lg shadow">
                        <p className="font-bold text-lg">{currentStudent.name}</p>
                        <p className={`text-lg font-bold ${getTitleColorClass(previewItem.value)}`}>예시칭호</p>
                      </div>
                      <p className="text-sm text-gray-600">칭호가 이 색상으로 표시됩니다</p>
                    </div>
                  )}

                  {/* 버튼 테두리 미리보기 */}
                  {previewItem.category === 'buttonBorder' && (
                    <div className="space-y-2">
                      <div
                        className="inline-block px-8 py-4 rounded-xl bg-white"
                        style={{ border: `3px solid ${getBorderColor(previewItem.value)}` }}
                      >
                        <p className="font-bold text-lg">{currentStudent.name}</p>
                        <p className="text-sm text-gray-500">프로필 카드</p>
                      </div>
                      <p className="text-sm text-gray-600">프로필 카드 테두리가 변경됩니다</p>
                    </div>
                  )}

                  {/* 버튼 채우기 미리보기 */}
                  {previewItem.category === 'buttonFill' && (
                    <div className="space-y-2">
                      <div
                        className="inline-block px-8 py-4 rounded-xl"
                        style={{
                          border: '2px solid rgb(209 213 219)',
                          ...(isGradientFill(previewItem.value)
                            ? { backgroundImage: getGradientStyle(previewItem.value) }
                            : { backgroundColor: getFillColor(previewItem.value) || 'rgb(255 255 255)' }
                          ),
                        }}
                      >
                        <p className="font-bold text-lg">{currentStudent.name}</p>
                        <p className="text-sm text-gray-500">프로필 카드</p>
                      </div>
                      <p className="text-sm text-gray-600">프로필 카드 배경색이 변경됩니다</p>
                    </div>
                  )}

                  {/* 배경 미리보기 */}
                  {previewItem.category === 'background' && (
                    <div className="space-y-2">
                      <div className="text-4xl">🖼️</div>
                      <div
                        className={`inline-block w-24 h-24 rounded-xl ${
                          previewItem.value === 'none' ? 'bg-gray-100' :
                          previewItem.value === 'dots' ? 'bg-gray-100' :
                          previewItem.value === 'stripes' ? 'bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100' :
                          previewItem.value === 'hearts' ? 'bg-pink-100' :
                          previewItem.value === 'stars' ? 'bg-yellow-100' :
                          'bg-gradient-to-br from-purple-100 to-pink-100'
                        }`}
                        style={{
                          backgroundImage: previewItem.value === 'dots' ? 'radial-gradient(circle, #666 1px, transparent 1px)' :
                            previewItem.value === 'stripes' ? 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.05) 5px, rgba(0,0,0,0.05) 10px)' :
                            undefined,
                          backgroundSize: previewItem.value === 'dots' ? '10px 10px' : undefined
                        }}
                      />
                      <p className="text-sm text-gray-600">프로필 카드 배경 패턴</p>
                    </div>
                  )}

                  {/* 이름 효과 미리보기 */}
                  {previewItem.category === 'nameEffect' && (
                    <div className="space-y-2">
                      <div className="text-4xl">✨</div>
                      <div className="inline-block px-4 py-2 bg-white rounded-lg shadow">
                        <p className={`font-bold text-xl ${
                          previewItem.value === 'none' ? 'text-gray-800' :
                          previewItem.value === 'gradient-rainbow' ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent' :
                          previewItem.value === 'gradient-fire' ? 'bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent' :
                          previewItem.value === 'gradient-ocean' ? 'bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent' :
                          previewItem.value === 'gradient-gold' ? 'bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent' :
                          previewItem.value.includes('glow') ? 'text-blue-500' :
                          'text-gray-800'
                        }`} style={{
                          textShadow: previewItem.value === 'glow-blue' ? '0 0 10px rgba(59, 130, 246, 0.5)' :
                            previewItem.value === 'glow-pink' ? '0 0 10px rgba(236, 72, 153, 0.5)' :
                            previewItem.value === 'glow-gold' ? '0 0 10px rgba(245, 158, 11, 0.5)' :
                            previewItem.value === 'shadow' ? '2px 2px 4px rgba(0,0,0,0.3)' :
                            undefined
                        }}>{currentStudent.name}</p>
                      </div>
                      <p className="text-sm text-gray-600">이름에 특별한 효과가 적용됩니다</p>
                    </div>
                  )}

                  {/* 애니메이션 미리보기 */}
                  {previewItem.category === 'animation' && (
                    <div className="space-y-2">
                      <div className={`text-5xl inline-block ${getAnimationClass(previewItem.value)}`}>
                        {previewItem.value === 'none' ? '😊' :
                         previewItem.value === 'flame' ? '🔥' :
                         previewItem.value === 'snow' ? '❄️' :
                         previewItem.value === 'confetti' ? '🎉' :
                         '🌟'}
                      </div>
                      <p className="text-sm text-gray-600">
                        {previewItem.value === 'none' ? '애니메이션 없음' :
                         previewItem.value === 'pulse' ? '두근두근 깜빡임' :
                         previewItem.value === 'spin' ? '빙글빙글 회전' :
                         previewItem.value === 'bounce' ? '통통 튀기' :
                         previewItem.value === 'shake' ? '좌우 흔들림' :
                         previewItem.value === 'sparkle' ? '반짝반짝 빛남' :
                         previewItem.value === 'wave' ? '출렁출렁 물결' :
                         previewItem.value === 'float' ? '둥실둥실 떠다님' :
                         previewItem.value === 'confetti' ? '축하 파티!' :
                         previewItem.value === 'flame' ? '불꽃 효과' :
                         previewItem.value === 'snow' ? '눈송이 효과' :
                         '특별한 애니메이션!'}
                      </p>
                    </div>
                  )}
                </div>

                {/* 아이템 정보 */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">카테고리</span>
                    <span className="font-medium">
                      {previewItem.category === 'emoji' && '이모지'}
                      {previewItem.category === 'titlePermit' && '칭호권'}
                      {previewItem.category === 'titleColor' && '칭호 색상'}
                      {previewItem.category === 'buttonBorder' && '버튼 테두리'}
                      {previewItem.category === 'buttonFill' && '버튼 채우기'}
                      {previewItem.category === 'background' && '배경'}
                      {previewItem.category === 'nameEffect' && '이름 효과'}
                      {previewItem.category === 'animation' && '애니메이션'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">가격</span>
                    <span className="font-bold text-amber-600">{previewItem.price} 🍪</span>
                  </div>
                  {previewItem.description && (
                    <p className="text-xs text-gray-500 mt-2 pt-2 border-t">{previewItem.description}</p>
                  )}
                </div>

                {/* 구매 버튼 */}
                {currentStudent.ownedItems.includes(previewItem.code) ? (
                  <div className="text-center py-3 bg-green-100 rounded-xl text-green-600 font-medium">
                    ✅ 이미 보유중인 아이템입니다
                  </div>
                ) : (currentStudent.jelly ?? currentStudent.cookie ?? 0) >= previewItem.price ? (
                  <button
                    onClick={() => {
                      handlePurchase(previewItem);
                      setPreviewItem(null);
                    }}
                    disabled={isPurchasing}
                    className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <span>🛒</span>
                    <span>{isPurchasing ? '구매 중...' : `${previewItem.price}🍭로 구매하기`}</span>
                  </button>
                ) : (
                  <div className="text-center py-3 bg-gray-100 rounded-xl text-gray-500">
                    🔒 캔디가 부족합니다 (보유: {currentStudent.jelly ?? currentStudent.cookie}🍭)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}