// src/pages/TeacherDashboard.tsx
// 선생님 대시보드 - Firebase 버전

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import {
  createClass,
  getClasses,
  getClassStudents,
  createStudent,
  refreshStudentCookies,
  fetchClassroomsFromDahandin,
  getGrassData,
  deleteAllStudents,
  getStudent,
  getTeacherShopItems,
  addShopItem,
  deleteShopItem,
  deleteAllShopItems,
  getTeams,
  createTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  getBattles,
  createBattle,
  updateBattleScore,
  endBattle,
  deleteBattle,
  getWishes,
  grantWish,
  deleteWish,
  addCookiesToStudent,
  ClassInfo,
  Student,
  Badge,
  ShopItem,
  Team,
  Battle,
  Wish,
  updateShopItem,
  resetGrassData,
  updateTeamCookie
} from '../services/firestoreApi';
import { parseXlsxFile, downloadCsvTemplate, exportStudentsToCsv } from '../utils/csv';
import { TEAM_FLAGS, generateRandomTeamNameWithEmoji } from '../types/game';
import { ALL_SHOP_ITEMS } from '../types/shop';

interface TeacherDashboardProps {
  onLogout: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function TeacherDashboard({ onLogout }: TeacherDashboardProps) {
  const { user, teacher, classes, selectedClass, selectClass, refreshClasses } = useAuth();
  
  // 상태
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // 새 학급 추가
  const [newClassName, setNewClassName] = useState('');
  const [isCreatingClass, setIsCreatingClass] = useState(false);

  // 학급 가리기
  const [hiddenClasses, setHiddenClasses] = useState<string[]>(() => {
    const saved = localStorage.getItem('hiddenClasses');
    return saved ? JSON.parse(saved) : [];
  });
  const [hideMode, setHideMode] = useState(false);
  const [viewHiddenMode, setViewHiddenMode] = useState(false);
  const [selectedForHide, setSelectedForHide] = useState<string[]>([]);

  // 학급 선택 시 학생 목록 로드
  useEffect(() => {
    if (selectedClass && user) {
      loadStudents();
    }
  }, [selectedClass, user]);

  // 학생 목록 로드
  const loadStudents = async () => {
    if (!user || !selectedClass) return;
    
    setIsLoadingStudents(true);
    try {
      const studentsData = await getClassStudents(user.uid, selectedClass);
      setStudents(studentsData);
    } catch (error) {
      console.error('Failed to load students:', error);
      toast.error('학생 목록을 불러오는데 실패했습니다.');
    }
    setIsLoadingStudents(false);
  };

  // 애니메이션 스타일 클래스
  const getAnimationClass = (value: string) => {
    const animMap: Record<string, string> = {
      'none': '',
      'pulse': 'animate-pulse',
      'spin': 'animate-spin-slow',
      'bounce': 'animate-bounce',
      'shake': 'animate-shake',
      'sparkle': 'animate-sparkle',
      'wave': 'animate-wave',
      'float': 'animate-float',
      'confetti': 'animate-confetti',
      'flame': 'animate-flame',
      'snow': 'animate-snow',
    };
    return animMap[value] || '';
  };

  // 다했니 API에서 학급 가져오기
  const handleImportClassrooms = async () => {
    if (!user || !teacher) return;
    
    setIsImporting(true);
    try {
      const classrooms = await fetchClassroomsFromDahandin(teacher.dahandinApiKey);
      
      for (const classroom of classrooms) {
        // name을 ID로도 사용 (공백은 하이픈으로 변경)
        const classId = classroom.name.replace(/\s+/g, '-');
        await createClass(user.uid, classId, classroom.name);
      }
      
      await refreshClasses();
      toast.success(`${classrooms.length}개 학급을 가져왔습니다!`);
    } catch (error: any) {
      console.error('Failed to import classrooms:', error);
      toast.error(error.message || '학급 가져오기에 실패했습니다.');
    }
    setIsImporting(false);
  };

  // 새 학급 생성
  const handleCreateClass = async () => {
    if (!user || !newClassName.trim()) {
      toast.error('학급 이름을 입력해주세요.');
      return;
    }
    
    setIsCreatingClass(true);
    try {
      const classId = newClassName.trim().replace(/\s+/g, '-');
      await createClass(user.uid, classId, newClassName.trim());
      await refreshClasses();
      setNewClassName('');
      toast.success('학급이 생성되었습니다!');
    } catch (error) {
      console.error('Failed to create class:', error);
      toast.error('학급 생성에 실패했습니다.');
    }
    setIsCreatingClass(false);
  };

  // 학급 가리기 토글
  const handleToggleHideClass = (classId: string) => {
    setSelectedForHide(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  // 선택한 학급 숨기기 적용
  const handleApplyHide = () => {
    const newHidden = [...new Set([...hiddenClasses, ...selectedForHide])];
    setHiddenClasses(newHidden);
    localStorage.setItem('hiddenClasses', JSON.stringify(newHidden));
    setSelectedForHide([]);
    setHideMode(false);
    toast.success(`${selectedForHide.length}개 학급을 숨겼습니다.`);
  };

  // 선택한 학급 숨김 해제
  const handleApplyUnhide = () => {
    const newHidden = hiddenClasses.filter(id => !selectedForHide.includes(id));
    setHiddenClasses(newHidden);
    localStorage.setItem('hiddenClasses', JSON.stringify(newHidden));
    setSelectedForHide([]);
    setViewHiddenMode(false);
    toast.success(`${selectedForHide.length}개 학급 숨김을 해제했습니다.`);
  };

  // 쿠키 새로고침
  const handleRefreshCookies = async () => {
    if (!user || !teacher || !selectedClass) {
      toast.error('학급을 먼저 선택해주세요.');
      return;
    }
    
    setIsRefreshing(true);
    try {
      const result = await refreshStudentCookies(user.uid, selectedClass, teacher.dahandinApiKey);
      if (result.success) {
        await loadStudents();
        toast.success(`${result.count}명의 쿠키 정보를 업데이트했습니다!`);
      } else {
        toast.error(result.error || '새로고침할 수 없습니다.');
      }
    } catch (error) {
      console.error('Failed to refresh cookies:', error);
      toast.error('쿠키 새로고침에 실패했습니다.');
    }
    setIsRefreshing(false);
  };

  // 학생 수동 추가
  const [newStudentNumber, setNewStudentNumber] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentCode, setNewStudentCode] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // CSV 업로드
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);

  // 학생 초기화
  const [isResettingStudents, setIsResettingStudents] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 잔디 데이터
  const [grassData, setGrassData] = useState<Array<{ date: string; studentCode: string; cookieChange: number; count: number }>>([]);
  const [isLoadingGrass, setIsLoadingGrass] = useState(false);
  const [isResettingGrass, setIsResettingGrass] = useState(false);

  // 학생 상세 모달
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentGrassData, setStudentGrassData] = useState<Array<{ date: string; cookieChange: number; count: number }>>([]);

  // 쿠키 부여
  const [cookieAmount, setCookieAmount] = useState('');
  const [isAddingCookie, setIsAddingCookie] = useState(false);

  // 상점 상태
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [isLoadingShop, setIsLoadingShop] = useState(false);
  const [isRegisteringDefaults, setIsRegisteringDefaults] = useState(false);
  const [isDeletingAllShop, setIsDeletingAllShop] = useState(false);
  const [showDeleteAllShopConfirm, setShowDeleteAllShopConfirm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('emoji');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [shopCategoryFilter, setShopCategoryFilter] = useState<string>('all');

  // 팀 상태
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamFlag, setNewTeamFlag] = useState(TEAM_FLAGS[0]);
  const [selectedTeamForMember, setSelectedTeamForMember] = useState<string | null>(null);
  const [swapStudent1, setSwapStudent1] = useState<{ code: string; teamId: string } | null>(null);
  const [swapStudent2, setSwapStudent2] = useState<{ code: string; teamId: string } | null>(null);

  // 배틀 상태
  const [battles, setBattles] = useState<Battle[]>([]);
  const [isLoadingBattles, setIsLoadingBattles] = useState(false);
  const [newBattleTitle, setNewBattleTitle] = useState('');
  const [newBattleTeam1, setNewBattleTeam1] = useState('');
  const [newBattleTeam2, setNewBattleTeam2] = useState('');
  const [newBattleReward, setNewBattleReward] = useState('10');

  // 소원 상태
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isLoadingWishes, setIsLoadingWishes] = useState(false);
  const [wishSortOrder, setWishSortOrder] = useState<'latest' | 'likes'>('latest');
  const [grantingWish, setGrantingWish] = useState<Wish | null>(null);
  const [grantMessage, setGrantMessage] = useState('');

  // 팀 현황 상태
  const [teamStatusData, setTeamStatusData] = useState<Map<string, Array<{ date: string; cookieChange: number; count: number }>>>(new Map());
  const [isLoadingTeamStatus, setIsLoadingTeamStatus] = useState(false);

  const handleAddStudent = async () => {
    if (!user || !selectedClass) {
      toast.error('학급을 먼저 선택해주세요.');
      return;
    }
    
    if (!newStudentNumber || !newStudentName || !newStudentCode) {
      toast.error('모든 항목을 입력해주세요.');
      return;
    }
    
    setIsAddingStudent(true);
    try {
      await createStudent(user.uid, selectedClass, {
        code: newStudentCode.trim(),
        number: parseInt(newStudentNumber),
        name: newStudentName.trim(),
        cookie: 0,
        usedCookie: 0,
        totalCookie: 0,
        chocoChips: 0,
        previousCookie: 0,
        profile: {
          emojiCode: 'emoji_00',
          title: '',
          titleColorCode: 'title_00',
          borderCode: 'border_00',
          nameEffectCode: 'name_00',
          backgroundCode: 'bg_00'
        },
        ownedItems: []
      });
      
      await loadStudents();
      setNewStudentNumber('');
      setNewStudentName('');
      setNewStudentCode('');
      toast.success('학생이 추가되었습니다!');
    } catch (error) {
      console.error('Failed to add student:', error);
      toast.error('학생 추가에 실패했습니다.');
    }
    setIsAddingStudent(false);
  };

  // XLSX 파일 업로드 처리 (다했니 웹에서 다운로드한 파일 - D열이 학생코드)
  const handleXlsxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !selectedClass) {
      toast.error('학급을 먼저 선택해주세요.');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCsv(true);
    try {
      const parsedCodes = await parseXlsxFile(file);

      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;

      for (let i = 0; i < parsedCodes.length; i++) {
        const studentCode = parsedCodes[i].code;
        const studentName = parsedCodes[i].name;
        try {
          // 중복 확인
          const existingStudent = await getStudent(user.uid, studentCode);
          if (existingStudent) {
            skipCount++;
            continue; // 이미 존재하는 학생은 건너뛰기
          }

          await createStudent(user.uid, selectedClass, {
            code: studentCode,
            number: i + 1, // 순서대로 번호 부여
            name: studentName, // XLSX B열에서 추출한 이름
            cookie: 0,
            usedCookie: 0,
            totalCookie: 0,
            chocoChips: 0,
            previousCookie: 0,
            profile: {
              emojiCode: 'emoji_00',
              title: '',
              titleColorCode: 'title_00',
              borderCode: 'border_00',
              nameEffectCode: 'name_00',
              backgroundCode: 'bg_00'
            },
            ownedItems: []
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to add student code ${studentCode}:`, err);
          errorCount++;
        }
      }

      // 학생 목록 및 학급 정보 새로고침
      await loadStudents();
      await refreshClasses();

      if (skipCount > 0 && errorCount > 0) {
        toast.warning(`${successCount}명 추가, ${skipCount}명 중복(건너뜀), ${errorCount}명 실패`);
      } else if (skipCount > 0) {
        toast.success(`${successCount}명 추가, ${skipCount}명 중복(건너뜀)`);
      } else if (errorCount > 0) {
        toast.warning(`${successCount}명 추가, ${errorCount}명 실패`);
      } else {
        toast.success(`${successCount}명의 학생을 추가했습니다!`);
      }

      // 새로 추가된 학생이 있으면 쿠키 정보 자동 불러오기 (이름도 업데이트됨)
      if (successCount > 0 && teacher) {
        toast.info('학생 정보를 불러오는 중...');
        try {
          const result = await refreshStudentCookies(user.uid, selectedClass, teacher.dahandinApiKey);
          await loadStudents();
          if (result.success) {
            toast.success(`${result.count}명의 정보를 불러왔습니다!`);
          }
        } catch (refreshError) {
          console.error('Failed to auto-refresh cookies:', refreshError);
          toast.error('학생 정보 자동 불러오기에 실패했습니다. 수동으로 새로고침해주세요.');
        }
      }
    } catch (error: any) {
      console.error('XLSX upload error:', error);
      toast.error(error.message || 'XLSX 파일 처리에 실패했습니다.');
    }
    setIsUploadingCsv(false);

    // 파일 입력 초기화
    e.target.value = '';
  };

  // CSV 템플릿 다운로드
  const handleDownloadTemplate = () => {
    const className = classes.find((c: ClassInfo) => c.id === selectedClass)?.name || '학급';
    downloadCsvTemplate(className);
  };

  // 학생 목록 CSV 내보내기
  const handleExportStudents = () => {
    if (students.length === 0) {
      toast.error('내보낼 학생이 없습니다.');
      return;
    }
    const className = classes.find((c: ClassInfo) => c.id === selectedClass)?.name || '학급';
    const exportData = students.map((s: Student) => ({
      number: s.number,
      name: s.name,
      code: s.code
    }));
    exportStudentsToCsv(exportData, className);
    toast.success('학생 목록을 내보냈습니다.');
  };

  // 학생 전체 초기화
  const handleResetStudents = async () => {
    if (!user || !selectedClass) return;

    setIsResettingStudents(true);
    try {
      const deletedCount = await deleteAllStudents(user.uid, selectedClass);
      await loadStudents();
      await refreshClasses();
      toast.success(`${deletedCount}명의 학생이 삭제되었습니다.`);
    } catch (error) {
      console.error('Failed to reset students:', error);
      toast.error('학생 초기화에 실패했습니다.');
    }
    setIsResettingStudents(false);
    setShowResetConfirm(false);
  };

  // 학생 상세 보기
  const handleStudentDoubleClick = async (student: Student) => {
    setSelectedStudent(student);
    if (user && selectedClass) {
      try {
        const grass = await getGrassData(user.uid, selectedClass, student.code);
        setStudentGrassData(grass.map(g => ({ date: g.date, cookieChange: g.cookieChange, count: g.count })));
      } catch (error) {
        console.error('Failed to load student grass:', error);
      }
    }
  };

  // 학생 상세 모달 닫기
  const handleCloseStudentModal = () => {
    setSelectedStudent(null);
    setStudentGrassData([]);
    setCookieAmount('');
  };

  // 쿠키 부여 (직접 금액 지정 또는 입력값 사용)
  const handleAddCookie = async (directAmount?: number) => {
    if (!user || !selectedStudent) return;

    const amount = directAmount !== undefined ? directAmount : parseInt(cookieAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error('부여할 쿠키 수를 입력해주세요.');
      return;
    }

    setIsAddingCookie(true);
    try {
      await addCookiesToStudent(user.uid, selectedStudent.code, amount);

      // 학생 정보 새로고침
      const updatedStudent = await getStudent(user.uid, selectedStudent.code);
      if (updatedStudent) {
        setSelectedStudent(updatedStudent);
      }
      await loadStudents();

      setCookieAmount('');
      toast.success(`${selectedStudent.name}에게 ${amount > 0 ? '+' : ''}${amount}🍪 ${amount > 0 ? '부여' : '차감'}!`);
    } catch (error) {
      console.error('Failed to add cookie:', error);
      toast.error('쿠키 부여에 실패했습니다.');
    }
    setIsAddingCookie(false);
  };

  // 잔디 색상 (3단계: 1개, 2개, 3개 이상)
  const getStudentGrassColor = (cookieChange: number) => {
    if (cookieChange === 0) return 'bg-gray-200'; // 없음
    if (cookieChange === 1) return 'bg-green-300'; // 1개
    if (cookieChange === 2) return 'bg-green-500'; // 2개
    return 'bg-green-700'; // 3개 이상
  };

  // 최근 14일 잔디
  const getStudentLast14Days = () => {
    const days: Array<{ date: string; count: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const grassRecord = studentGrassData.find((g: { date: string; cookieChange: number; count: number }) => g.date === dateStr);
      days.push({
        date: dateStr,
        count: grassRecord?.cookieChange || 0
      });
    }
    return days;
  };

  // 잔디 데이터 로드
  const loadGrassData = async () => {
    if (!user || !selectedClass) return;

    setIsLoadingGrass(true);
    try {
      const data = await getGrassData(user.uid, selectedClass);
      setGrassData(data);
    } catch (error) {
      console.error('Failed to load grass data:', error);
      toast.error('잔디 데이터를 불러오는데 실패했습니다.');
    }
    setIsLoadingGrass(false);
  };

  // 잔디 데이터 초기화
  const handleResetGrass = async () => {
    if (!user || !selectedClass) return;

    if (!confirm('정말로 잔디 데이터를 모두 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsResettingGrass(true);
    try {
      const result = await resetGrassData(user.uid, selectedClass);
      setGrassData([]);
      toast.success(`잔디 데이터 ${result.deletedCount}개가 초기화되었습니다.`);
    } catch (error) {
      console.error('Failed to reset grass data:', error);
      toast.error('잔디 초기화에 실패했습니다.');
    }
    setIsResettingGrass(false);
  };

  // 잔디 데이터를 날짜별로 그룹화
  const getGrassByDate = () => {
    const grouped: Record<string, Record<string, { change: number; count: number }>> = {};
    grassData.forEach((item: { date: string; studentCode: string; cookieChange: number; count: number }) => {
      if (!grouped[item.date]) {
        grouped[item.date] = {};
      }
      grouped[item.date][item.studentCode] = {
        change: item.cookieChange,
        count: item.count
      };
    });
    return grouped;
  };

  // 최근 14일 날짜 목록
  const getLast14Days = () => {
    const dates: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  // 잔디 색상 (3단계: 1개, 2개, 3개 이상)
  const getGrassColor = (change: number) => {
    if (change === 0) return 'bg-gray-200'; // 없음
    if (change === 1) return 'bg-green-300'; // 1개
    if (change === 2) return 'bg-green-500'; // 2개
    return 'bg-green-700'; // 3개 이상
  };

  // ========== 상점 핸들러 ==========
  const loadShopItems = async () => {
    if (!user) return;
    setIsLoadingShop(true);
    try {
      const items = await getTeacherShopItems(user.uid);
      setShopItems(items);
    } catch (error) {
      console.error('Failed to load shop items:', error);
    }
    setIsLoadingShop(false);
  };

  const handleAddShopItem = async () => {
    if (!user) return;
    if (!newItemName || !newItemPrice) {
      toast.error('상품명과 가격을 입력해주세요.');
      return;
    }
    try {
      await addShopItem(user.uid, {
        name: newItemName,
        price: parseInt(newItemPrice),
        category: newItemCategory,
        description: newItemDescription,
        value: newItemName
      });
      setNewItemName('');
      setNewItemPrice('');
      setNewItemDescription('');
      await loadShopItems();
      toast.success('상품이 추가되었습니다!');
    } catch (error) {
      toast.error('상품 추가에 실패했습니다.');
    }
  };

  const handleDeleteShopItem = async (itemCode: string) => {
    if (!user) return;
    try {
      await deleteShopItem(user.uid, itemCode);
      await loadShopItems();
      toast.success('상품이 삭제되었습니다.');
    } catch (error) {
      toast.error('상품 삭제에 실패했습니다.');
    }
  };

  // 상점 전체 삭제
  const handleDeleteAllShopItems = async () => {
    if (!user) return;

    setIsDeletingAllShop(true);
    try {
      const deletedCount = await deleteAllShopItems(user.uid);
      await loadShopItems();
      toast.success(`${deletedCount}개의 상품이 삭제되었습니다.`);
    } catch (error) {
      console.error('Failed to delete all shop items:', error);
      toast.error('상품 전체 삭제에 실패했습니다.');
    }
    setIsDeletingAllShop(false);
    setShowDeleteAllShopConfirm(false);
  };

  // 기본 상품 일괄 등록
  const handleRegisterDefaultItems = async () => {
    if (!user) return;

    setIsRegisteringDefaults(true);
    try {
      let count = 0;
      for (const item of ALL_SHOP_ITEMS) {
        await addShopItem(user.uid, {
          name: item.name,
          price: item.price,
          category: item.category,
          description: item.description || '',
          value: item.value
        });
        count++;
      }
      await loadShopItems();
      toast.success(`${count}개의 기본 상품이 등록되었습니다!`);
    } catch (error) {
      console.error('Failed to register default items:', error);
      toast.error('기본 상품 등록에 실패했습니다.');
    }
    setIsRegisteringDefaults(false);
  };

  // 상점 아이템 가격 수정
  const handleUpdateItemPrice = async (itemCode: string, newPrice: number) => {
    if (!user) return;
    try {
      await updateShopItem(user.uid, itemCode, { price: newPrice });
      await loadShopItems();
      toast.success('가격이 수정되었습니다!');
    } catch (error) {
      toast.error('가격 수정에 실패했습니다.');
    }
  };

  // ========== 팀 핸들러 ==========
  const loadTeams = async () => {
    if (!user || !selectedClass) return;
    setIsLoadingTeams(true);
    try {
      const teamsData = await getTeams(user.uid, selectedClass);
      setTeams(teamsData);
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
    setIsLoadingTeams(false);
  };

  // 팀 현황 데이터 로드 (팀원별 잔디 데이터)
  const loadTeamStatus = async () => {
    if (!user || !selectedClass) return;
    setIsLoadingTeamStatus(true);
    try {
      // 먼저 팀 데이터 로드
      const teamsData = await getTeams(user.uid, selectedClass);
      setTeams(teamsData);

      // 모든 팀원의 코드 수집
      const allMemberCodes: string[] = [];
      teamsData.forEach(team => {
        allMemberCodes.push(...team.members);
      });

      // 잔디 데이터 로드
      const grassDataRaw = await getGrassData(user.uid, selectedClass);

      // 학생별로 잔디 데이터 그룹화
      const studentGrassMap = new Map<string, Array<{ date: string; cookieChange: number; count: number }>>();

      allMemberCodes.forEach(code => {
        const studentGrass = grassDataRaw
          .filter(g => g.studentCode === code)
          .map(g => ({ date: g.date, cookieChange: g.cookieChange, count: g.count }))
          .sort((a, b) => a.date.localeCompare(b.date));
        studentGrassMap.set(code, studentGrass);
      });

      setTeamStatusData(studentGrassMap);
    } catch (error) {
      console.error('Failed to load team status:', error);
    }
    setIsLoadingTeamStatus(false);
  };

  const handleCreateTeam = async () => {
    if (!user || !selectedClass) return;
    if (!newTeamName) {
      toast.error('팀 이름을 입력해주세요.');
      return;
    }
    try {
      await createTeam(user.uid, selectedClass, newTeamName, newTeamFlag);
      setNewTeamName('');
      await loadTeams();
      toast.success('팀이 생성되었습니다!');
    } catch (error) {
      toast.error('팀 생성에 실패했습니다.');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!user || !selectedClass) return;
    try {
      await deleteTeam(user.uid, selectedClass, teamId);
      await loadTeams();
      toast.success('팀이 삭제되었습니다.');
    } catch (error) {
      toast.error('팀 삭제에 실패했습니다.');
    }
  };

  const handleAddMemberToTeam = async (teamId: string, studentCode: string) => {
    if (!user || !selectedClass) return;
    try {
      await addTeamMember(user.uid, selectedClass, teamId, studentCode);
      await loadTeams();
      toast.success('멤버가 추가되었습니다.');
    } catch (error) {
      toast.error('멤버 추가에 실패했습니다.');
    }
  };

  const handleRemoveMemberFromTeam = async (teamId: string, studentCode: string) => {
    if (!user || !selectedClass) return;
    try {
      await removeTeamMember(user.uid, selectedClass, teamId, studentCode);
      await loadTeams();
      toast.success('멤버가 제거되었습니다.');
    } catch (error) {
      toast.error('멤버 제거에 실패했습니다.');
    }
  };

  // 학생 클릭 시 교환 선택
  const handleSelectStudentForSwap = async (studentCode: string, teamId: string) => {
    if (!user || !selectedClass) return;

    if (!swapStudent1) {
      // 첫 번째 학생 선택
      setSwapStudent1({ code: studentCode, teamId });
      toast.info('교환할 두 번째 학생을 선택하세요');
    } else if (swapStudent1.code === studentCode) {
      // 같은 학생 다시 클릭 - 선택 취소
      setSwapStudent1(null);
      toast.info('선택이 취소되었습니다');
    } else {
      // 두 번째 학생 선택 - 교환 실행
      try {
        // 학생1을 팀2로, 학생2를 팀1으로
        await removeTeamMember(user.uid, selectedClass, swapStudent1.teamId, swapStudent1.code);
        await removeTeamMember(user.uid, selectedClass, teamId, studentCode);
        await addTeamMember(user.uid, selectedClass, teamId, swapStudent1.code);
        await addTeamMember(user.uid, selectedClass, swapStudent1.teamId, studentCode);

        await loadTeams();
        toast.success('학생이 교환되었습니다!');
      } catch (error) {
        toast.error('교환에 실패했습니다.');
      }
      setSwapStudent1(null);
    }
  };

  // ========== 배틀 핸들러 ==========
  const loadBattles = async () => {
    if (!user || !selectedClass) return;
    setIsLoadingBattles(true);
    try {
      const battlesData = await getBattles(user.uid, selectedClass);
      setBattles(battlesData);
    } catch (error) {
      console.error('Failed to load battles:', error);
    }
    setIsLoadingBattles(false);
  };

  const handleCreateBattle = async () => {
    if (!user || !selectedClass) return;
    if (!newBattleTitle || !newBattleTeam1 || !newBattleTeam2) {
      toast.error('배틀 제목과 팀을 선택해주세요.');
      return;
    }
    if (newBattleTeam1 === newBattleTeam2) {
      toast.error('서로 다른 팀을 선택해주세요.');
      return;
    }
    try {
      await createBattle(
        user.uid,
        selectedClass,
        newBattleTitle,
        '',
        newBattleTeam1,
        newBattleTeam2,
        parseInt(newBattleReward)
      );
      setNewBattleTitle('');
      setNewBattleTeam1('');
      setNewBattleTeam2('');
      await loadBattles();
      toast.success('배틀이 시작되었습니다!');
    } catch (error) {
      toast.error('배틀 생성에 실패했습니다.');
    }
  };

  const handleUpdateBattleScore = async (battleId: string, team1Score: number, team2Score: number) => {
    if (!user || !selectedClass) return;
    try {
      await updateBattleScore(user.uid, selectedClass, battleId, team1Score, team2Score);
      await loadBattles();
    } catch (error) {
      toast.error('점수 업데이트에 실패했습니다.');
    }
  };

  const handleEndBattle = async (battle: Battle) => {
    if (!user || !selectedClass) return;
    let winnerId: string | null = null;
    if (battle.team1Score > battle.team2Score) winnerId = battle.team1Id;
    else if (battle.team2Score > battle.team1Score) winnerId = battle.team2Id;

    try {
      await endBattle(user.uid, selectedClass, battle.id, winnerId);
      await loadBattles();
      toast.success('배틀이 종료되었습니다!');
    } catch (error) {
      toast.error('배틀 종료에 실패했습니다.');
    }
  };

  const handleDeleteBattle = async (battleId: string) => {
    if (!user || !selectedClass) return;
    try {
      await deleteBattle(user.uid, selectedClass, battleId);
      await loadBattles();
      toast.success('배틀이 삭제되었습니다.');
    } catch (error) {
      toast.error('배틀 삭제에 실패했습니다.');
    }
  };

  // ========== 소원 핸들러 ==========
  const loadWishes = async () => {
    if (!user) return;
    setIsLoadingWishes(true);
    try {
      // 소원은 모든 클래스룸에서 공유되므로 classId는 사용되지 않음
      const wishesData = await getWishes(user.uid, '');
      setWishes(wishesData);
    } catch (error) {
      console.error('Failed to load wishes:', error);
    }
    setIsLoadingWishes(false);
  };

  const handleGrantWish = async (wishId: string, message: string) => {
    if (!user) return;
    try {
      // 소원은 모든 클래스룸에서 공유되므로 classId는 사용되지 않음
      await grantWish(user.uid, '', wishId, message);
      await loadWishes();
      toast.success('소원이 선정되었습니다!');
    } catch (error) {
      toast.error('소원 선정에 실패했습니다.');
    }
  };

  const handleDeleteWish = async (wishId: string) => {
    if (!user) return;
    try {
      // 소원은 모든 클래스룸에서 공유되므로 classId는 사용되지 않음
      await deleteWish(user.uid, '', wishId);
      await loadWishes();
      toast.success('소원이 삭제되었습니다.');
    } catch (error) {
      toast.error('소원 삭제에 실패했습니다.');
    }
  };

  // 팀 플래그 옵션 - game.ts의 TEAM_FLAGS 사용 (동물/자연 이모지)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <span className="text-2xl">🍪</span>
              <div>
                <h1 className="text-xl font-bold text-gray-800">다했니? 선생님</h1>
                <p className="text-sm text-gray-500">{teacher?.schoolName} - {teacher?.name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={onLogout} className="flex items-center gap-1">
              <span>🚪</span>
              <span>로그아웃</span>
            </Button>
          </div>
          {/* 학급 선택 - 헤더에 크게 표시 (숨긴 학급 제외) */}
          {classes.filter(c => !hiddenClasses.includes(c.id)).length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-lg font-medium text-blue-700">📚 학급:</span>
              <select
                value={selectedClass || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => selectClass(e.target.value || null)}
                className="flex-1 px-4 py-2 text-lg font-bold border-2 border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- 학급을 선택하세요 --</option>
                {classes.filter(c => !hiddenClasses.includes(c.id)).map((cls: ClassInfo) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.studentCount || 0}명)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="classes" className="space-y-6">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="classes">📚 학급</TabsTrigger>
            <TabsTrigger value="students">👨‍🎓 학생</TabsTrigger>
            <TabsTrigger value="grass" onClick={loadGrassData}>🌱 잔디</TabsTrigger>
            <TabsTrigger value="shop" onClick={loadShopItems}>🏪 상점</TabsTrigger>
            <TabsTrigger value="teams" onClick={loadTeams}>👥 팀</TabsTrigger>
            <TabsTrigger value="teamStatus" onClick={loadTeamStatus}>📊 팀 현황</TabsTrigger>
            <TabsTrigger value="battles" onClick={() => { loadTeams(); loadBattles(); }}>⚔️ 배틀</TabsTrigger>
            <TabsTrigger value="wishes" onClick={loadWishes}>⭐ 소원</TabsTrigger>
            <TabsTrigger value="settings">⚙️ 설정</TabsTrigger>
          </TabsList>

          {/* 학급 관리 탭 */}
          <TabsContent value="classes" className="space-y-6">
            {/* 학급 가져오기 */}
            <Card>
              <CardHeader>
                <CardTitle>📥 다했니에서 학급 가져오기</CardTitle>
                <CardDescription>
                  다했니 API를 통해 등록된 학급을 자동으로 가져옵니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleImportClassrooms} 
                  disabled={isImporting}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isImporting ? '가져오는 중...' : '🔄 학급 가져오기'}
                </Button>
              </CardContent>
            </Card>

            {/* 학급 목록 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>📋 학급 목록</CardTitle>
                    <CardDescription>
                      {classes.filter(c => !hiddenClasses.includes(c.id)).length}개의 학급
                      {hiddenClasses.length > 0 && ` (${hiddenClasses.length}개 숨김)`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!viewHiddenMode && (
                      <Button
                        variant={hideMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (hideMode && selectedForHide.length > 0) {
                            handleApplyHide();
                          } else {
                            setHideMode(!hideMode);
                            setSelectedForHide([]);
                          }
                        }}
                      >
                        {hideMode ? (selectedForHide.length > 0 ? `🙈 ${selectedForHide.length}개 숨기기` : '✕ 취소') : '🙈 가리기'}
                      </Button>
                    )}
                    {hiddenClasses.length > 0 && !hideMode && (
                      <Button
                        variant={viewHiddenMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (viewHiddenMode && selectedForHide.length > 0) {
                            handleApplyUnhide();
                          } else {
                            setViewHiddenMode(!viewHiddenMode);
                            setSelectedForHide([]);
                          }
                        }}
                      >
                        {viewHiddenMode ? (selectedForHide.length > 0 ? `👁️ ${selectedForHide.length}개 보이기` : '✕ 취소') : '👁️ 숨긴 학급'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {viewHiddenMode ? (
                  // 숨긴 학급 보기 모드
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500 mb-3">체크박스를 선택하고 버튼을 눌러 숨김 해제하세요.</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {classes.filter(c => hiddenClasses.includes(c.id)).map((cls) => (
                        <label
                          key={cls.id}
                          className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${
                            selectedForHide.includes(cls.id)
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-300 bg-gray-100'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={selectedForHide.includes(cls.id)}
                              onChange={() => handleToggleHideClass(cls.id)}
                              className="mt-1"
                            />
                            <div>
                              <div className="font-bold text-gray-600">{cls.name}</div>
                              <div className="text-sm text-gray-400">
                                {cls.studentCount || 0}명
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : classes.filter(c => !hiddenClasses.includes(c.id)).length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    {classes.length === 0
                      ? '등록된 학급이 없습니다. 위 버튼으로 학급을 가져오세요.'
                      : '모든 학급이 숨겨져 있습니다. "숨긴 학급" 버튼을 눌러 확인하세요.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {classes.filter(c => !hiddenClasses.includes(c.id)).map((cls) => (
                      hideMode ? (
                        <label
                          key={cls.id}
                          className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${
                            selectedForHide.includes(cls.id)
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={selectedForHide.includes(cls.id)}
                              onChange={() => handleToggleHideClass(cls.id)}
                              className="mt-1"
                            />
                            <div>
                              <div className="font-bold">{cls.name}</div>
                              <div className="text-sm text-gray-500">
                                {cls.studentCount || 0}명
                              </div>
                            </div>
                          </div>
                        </label>
                      ) : (
                        <button
                          key={cls.id}
                          onClick={() => selectClass(cls.id)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            selectedClass === cls.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-bold">{cls.name}</div>
                          <div className="text-sm text-gray-500">
                            {cls.studentCount || 0}명
                          </div>
                        </button>
                      )
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </TabsContent>

          {/* 학생 관리 탭 */}
          <TabsContent value="students" className="space-y-6">
            {!selectedClass ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  👆 상단에서 학급을 선택해주세요.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 쿠키 새로고침 */}
                <Card>
                  <CardHeader>
                    <CardTitle>🔄 쿠키 새로고침</CardTitle>
                    <CardDescription>
                      다했니 API에서 최신 쿠키 정보를 가져옵니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={handleRefreshCookies}
                      disabled={isRefreshing}
                      className="bg-amber-500 hover:bg-amber-600"
                    >
                      {isRefreshing ? '새로고침 중...' : '🍪 쿠키 새로고침'}
                    </Button>
                  </CardContent>
                </Card>

                {/* 학생 목록 */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      👨‍🎓 학생 목록 - {classes.find(c => c.id === selectedClass)?.name}
                    </CardTitle>
                    <CardDescription>
                      {students.length}명의 학생 · 클릭하여 상세 정보 보기
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStudents ? (
                      <p className="text-center py-8 text-gray-500">로딩 중...</p>
                    ) : students.length === 0 ? (
                      <p className="text-center py-8 text-gray-500">
                        등록된 학생이 없습니다.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2">번호</th>
                              <th className="text-left py-2 px-2">이름</th>
                              <th className="text-center py-2 px-2">뱃지</th>
                              <th className="text-right py-2 px-2">🍪 쿠키</th>
                              <th className="text-right py-2 px-2">총 쿠키</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map((student) => (
                              <tr
                                key={student.code}
                                className="border-b hover:bg-amber-50 cursor-pointer transition-colors"
                                onClick={() => handleStudentDoubleClick(student)}
                              >
                                <td className="py-2 px-2">{student.number}</td>
                                <td className="py-2 px-2 font-medium">{student.name}</td>
                                <td className="py-2 px-2">
                                  <div className="flex justify-center gap-1">
                                    {student.badges && (Object.entries(student.badges) as [string, Badge][])
                                      .filter(([, badge]) => badge.hasBadge)
                                      .slice(0, 5)
                                      .map(([key, badge]) => (
                                        <img
                                          key={key}
                                          src={badge.imgUrl}
                                          alt={badge.title}
                                          title={badge.title}
                                          className="w-5 h-5 rounded"
                                        />
                                      ))}
                                    {(!student.badges || (Object.values(student.badges) as Badge[]).filter(b => b.hasBadge).length === 0) && (
                                      <span className="text-gray-300 text-xs">-</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-right font-bold text-amber-600">
                                  {student.cookie}
                                </td>
                                <td className="py-2 px-2 text-right text-gray-500">
                                  {student.totalCookie}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 학생 추가 */}
                <Card>
                  <CardHeader>
                    <CardTitle>➕ 학생 추가</CardTitle>
                    <CardDescription>
                      다했니 XLSX 파일로 학생을 일괄 추가할 수 있습니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* XLSX 일괄 추가 */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">📁 다했니 XLSX 파일로 일괄 추가</h4>
                      <p className="text-sm text-gray-500 mb-3">
                        다했니 웹에서 다운로드한 XLSX 파일을 업로드하세요 (D열에서 학생코드 추출)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <label className="cursor-pointer">
                          <Button
                            variant="default"
                            className="bg-green-500 hover:bg-green-600"
                            disabled={isUploadingCsv}
                            asChild
                          >
                            <span>
                              {isUploadingCsv ? '업로드 중...' : '📤 XLSX 업로드'}
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={handleXlsxUpload}
                            disabled={isUploadingCsv}
                          />
                        </label>
                        <Button
                          variant="outline"
                          onClick={handleExportStudents}
                          disabled={students.length === 0}
                        >
                          📊 학생 목록 내보내기
                        </Button>
                      </div>
                    </div>

                    {/* 학생 초기화 */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-2 text-red-600">🗑️ 학생 초기화</h4>
                      <p className="text-sm text-gray-500 mb-3">
                        현재 학급의 모든 학생 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                      </p>
                      {!showResetConfirm ? (
                        <Button
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => setShowResetConfirm(true)}
                          disabled={students.length === 0}
                        >
                          🗑️ 학생 전체 삭제
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                          <span className="text-sm text-red-700">
                            정말 {students.length}명의 학생을 삭제하시겠습니까?
                          </span>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleResetStudents}
                            disabled={isResettingStudents}
                          >
                            {isResettingStudents ? '삭제 중...' : '삭제 확인'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowResetConfirm(false)}
                            disabled={isResettingStudents}
                          >
                            취소
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* 잔디 탭 */}
          <TabsContent value="grass" className="space-y-6">
            {!selectedClass ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  👆 먼저 학급 관리 탭에서 학급을 선택해주세요.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 잔디 새로고침 */}
                <Card>
                  <CardHeader>
                    <CardTitle>🌱 학급 잔디 현황</CardTitle>
                    <CardDescription>
                      {classes.find((c: ClassInfo) => c.id === selectedClass)?.name} - 최근 14일간 쿠키 변화량
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-4">
                      <Button
                        onClick={loadGrassData}
                        disabled={isLoadingGrass}
                        variant="outline"
                      >
                        {isLoadingGrass ? '로딩 중...' : '🔄 잔디 새로고침'}
                      </Button>
                      <Button
                        onClick={handleResetGrass}
                        disabled={isResettingGrass || isLoadingGrass}
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                      >
                        {isResettingGrass ? '초기화 중...' : '🗑️ 잔디 초기화'}
                      </Button>
                    </div>

                    {isLoadingGrass ? (
                      <p className="text-center py-8 text-gray-500">로딩 중...</p>
                    ) : students.length === 0 ? (
                      <p className="text-center py-8 text-gray-500">
                        등록된 학생이 없습니다.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2 sticky left-0 bg-white">학생</th>
                              {getLast14Days().map(date => (
                                <th key={date} className="text-center py-2 px-1 text-xs">
                                  {date.slice(5)}
                                </th>
                              ))}
                              <th className="text-right py-2 px-2">합계</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map((student: Student) => {
                              const grassByDate = getGrassByDate();
                              let totalChange = 0;
                              return (
                                <tr key={student.code} className="border-b hover:bg-gray-50">
                                  <td className="py-2 px-2 font-medium sticky left-0 bg-white">
                                    {student.number}. {student.name}
                                  </td>
                                  {getLast14Days().map(date => {
                                    const data = grassByDate[date]?.[student.code] || { change: 0, count: 0 };
                                    totalChange += data.change;
                                    return (
                                      <td key={date} className="text-center py-2 px-1">
                                        <div
                                          className={`w-6 h-6 mx-auto rounded ${getGrassColor(data.change)}`}
                                          title={`${date}: +${data.change} (${data.count}회)`}
                                        >
                                          {data.change > 0 && (
                                            <span className="text-xs text-white font-bold leading-6">
                                              {data.change}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  })}
                                  <td className="text-right py-2 px-2 font-bold text-green-600">
                                    +{totalChange}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 범례 */}
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-sm text-gray-500">강도:</span>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-gray-200"></div>
                        <span className="text-xs">없음</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-green-300"></div>
                        <span className="text-xs">1개</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-green-500"></div>
                        <span className="text-xs">2개</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-green-700"></div>
                        <span className="text-xs">3개+</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* 상점 탭 */}
          <TabsContent value="shop" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🏪 상점 아이템 관리</CardTitle>
                <CardDescription>학생들이 쿠키로 구매할 수 있는 아이템을 등록하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 아이템 추가 */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  <Input
                    placeholder="상품명 (예: 😎 쿨한)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="가격"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                  />
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="emoji">이모지</option>
                    <option value="nameEffect">이름효과</option>
                    <option value="titleColor">칭호색상</option>
                    <option value="animation">애니메이션</option>
                    <option value="titlePermit">칭호권</option>
                  </select>
                  <Input
                    placeholder="값 (예: 😎)"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                  />
                  <Button onClick={handleAddShopItem} className="bg-green-500 hover:bg-green-600 col-span-2 md:col-span-2">
                    + 추가
                  </Button>
                </div>
                <p className="text-xs text-gray-400">카테고리별 값: 이모지(😎), 이름효과(gradient-fire), 칭호색상(0~9), 애니메이션(pulse)</p>

                {/* 기본 상품 일괄 등록 */}
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-800">📦 기본 상품 일괄 등록</p>
                      <p className="text-xs text-amber-600">이모지, 이름효과, 칭호색상, 애니메이션 등을 한 번에 등록합니다</p>
                    </div>
                    <Button
                      onClick={handleRegisterDefaultItems}
                      disabled={isRegisteringDefaults}
                      className="bg-amber-500 hover:bg-amber-600"
                    >
                      {isRegisteringDefaults ? '등록 중...' : '🛒 기본 상품 등록'}
                    </Button>
                  </div>
                </div>

                {/* 상점 전체 삭제 */}
                {shopItems.length > 0 && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-800">🗑️ 상점 전체 삭제</p>
                        <p className="text-xs text-red-600">현재 등록된 모든 상품({shopItems.length}개)을 삭제합니다</p>
                      </div>
                      {!showDeleteAllShopConfirm ? (
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteAllShopConfirm(true)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          🗑️ 전체 삭제
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-700">정말 삭제하시겠습니까?</span>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteAllShopItems}
                            disabled={isDeletingAllShop}
                          >
                            {isDeletingAllShop ? '삭제 중...' : '확인'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDeleteAllShopConfirm(false)}
                            disabled={isDeletingAllShop}
                          >
                            취소
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 카테고리 탭 */}
                <div className="flex flex-wrap gap-2 py-3 border-b mb-4">
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
                      ? shopItems.length
                      : shopItems.filter(item => item.category === cat.key).length;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setShopCategoryFilter(cat.key)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                          shopCategoryFilter === cat.key
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                          shopCategoryFilter === cat.key ? 'bg-amber-600' : 'bg-gray-200'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 아이템 목록 */}
                {isLoadingShop ? (
                  <p className="text-center py-8 text-gray-500">로딩 중...</p>
                ) : shopItems.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">등록된 상품이 없습니다.</p>
                ) : shopItems.filter(item => shopCategoryFilter === 'all' || item.category === shopCategoryFilter).length === 0 ? (
                  <p className="text-center py-8 text-gray-500">해당 카테고리에 상품이 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {shopItems
                      .filter(item => shopCategoryFilter === 'all' || item.category === shopCategoryFilter)
                      .map((item) => (
                      <div key={item.code} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-gray-400">{item.category}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 h-6 px-2"
                            onClick={() => handleDeleteShopItem(item.code)}
                          >
                            삭제
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            defaultValue={item.price}
                            className="w-20 h-8 text-sm"
                            onBlur={(e) => {
                              const newPrice = parseInt(e.target.value);
                              if (!isNaN(newPrice) && newPrice !== item.price) {
                                handleUpdateItemPrice(item.code, newPrice);
                              }
                            }}
                          />
                          <span className="text-sm">🍪</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 팀 탭 */}
          <TabsContent value="teams" className="space-y-6">
            {!selectedClass ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  👆 상단에서 학급을 선택해주세요
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 팀 생성 */}
                <Card>
                  <CardHeader>
                    <CardTitle>👥 팀 관리</CardTitle>
                    <CardDescription>학생들을 팀으로 나누어 관리하세요</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 빠른 팀 생성 + 학생 자동 배치 */}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-700 mb-2">⚡ 빠른 팀 생성 (기존 팀 삭제 후 새로 생성)</p>
                      <div className="flex flex-wrap gap-2">
                        {[2, 3, 4, 5, 6].map((num) => (
                          <Button
                            key={num}
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!user || !selectedClass) return;
                              if (students.length === 0) {
                                toast.error('학생 목록을 먼저 등록해주세요.');
                                return;
                              }

                              // 기존 팀 모두 삭제
                              for (const team of teams) {
                                await deleteTeam(user.uid, selectedClass, team.teamId);
                              }

                              // 팀 생성 (랜덤 이름 + 일치하는 이모지)
                              const teamIds: string[] = [];
                              const usedIndices = new Set<number>();
                              for (let i = 0; i < num; i++) {
                                // 중복되지 않는 팀 선택
                                let randomIndex: number;
                                do {
                                  randomIndex = Math.floor(Math.random() * TEAM_FLAGS.length);
                                } while (usedIndices.has(randomIndex) && usedIndices.size < TEAM_FLAGS.length);
                                usedIndices.add(randomIndex);

                                const { name: teamName, emoji: teamEmoji } = generateRandomTeamNameWithEmoji();
                                const teamId = await createTeam(user.uid, selectedClass, teamName, teamEmoji);
                                teamIds.push(teamId);
                              }

                              // 학생들을 팀에 균등 배치
                              const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
                              for (let i = 0; i < shuffledStudents.length; i++) {
                                const teamIndex = i % num;
                                await addTeamMember(user.uid, selectedClass, teamIds[teamIndex], shuffledStudents[i].code);
                              }

                              await loadTeams();
                              toast.success(`${num}개 팀에 ${students.length}명의 학생을 배치했습니다!`);
                            }}
                          >
                            {num}팀 만들기
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* 교환 모드 안내 */}
                    {swapStudent1 && (
                      <div className="p-3 bg-blue-100 rounded-lg border border-blue-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-700 text-sm">
                            🔄 <strong>{students.find(s => s.code === swapStudent1.code)?.name}</strong>을(를) 선택했습니다.
                            다른 팀의 학생을 클릭하면 교환됩니다.
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSwapStudent1(null)}
                          className="text-blue-700 border-blue-300"
                        >
                          취소
                        </Button>
                      </div>
                    )}

                    {/* 팀 관리 버튼들 */}
                    {teams.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!user || !selectedClass) return;
                            // 팀원들을 랜덤으로 섞기 (팀 이름/이모지는 유지)
                            const allMembers: string[] = [];
                            teams.forEach(team => {
                              allMembers.push(...team.members);
                            });
                            const shuffled = [...allMembers].sort(() => Math.random() - 0.5);

                            // 각 팀에서 기존 멤버 제거 후 새로 배치
                            let memberIdx = 0;
                            for (const team of teams) {
                              // 기존 멤버 제거
                              for (const member of team.members) {
                                await removeTeamMember(user.uid, selectedClass, team.teamId, member);
                              }
                              // 새 멤버 배치
                              const membersPerTeam = Math.ceil(shuffled.length / teams.length);
                              for (let i = 0; i < membersPerTeam && memberIdx < shuffled.length; i++) {
                                await addTeamMember(user.uid, selectedClass, team.teamId, shuffled[memberIdx]);
                                memberIdx++;
                              }
                            }
                            await loadTeams();
                            toast.success('팀원이 랜덤으로 섞였습니다!');
                          }}
                          className="bg-purple-100 hover:bg-purple-200 text-purple-700"
                        >
                          🔀 팀원 섞기
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!user || !selectedClass) return;
                            if (!confirm('모든 팀을 삭제하시겠습니까?')) return;
                            for (const team of teams) {
                              await deleteTeam(user.uid, selectedClass, team.teamId);
                            }
                            await loadTeams();
                            toast.success('모든 팀이 삭제되었습니다.');
                          }}
                          className="text-red-600 hover:bg-red-50"
                        >
                          🗑️ 전체 삭제
                        </Button>
                      </div>
                    )}

                    {/* 수동 팀 생성 */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">✏️ 수동 팀 생성</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="팀 이름 (예: 붉은 피닉스)"
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          className="flex-1"
                        />
                        <select
                          value={newTeamFlag}
                          onChange={(e) => setNewTeamFlag(e.target.value)}
                          className="px-3 py-2 border rounded-md text-2xl"
                        >
                          {TEAM_FLAGS.slice(0, 20).map((flag) => (
                            <option key={flag} value={flag}>{flag}</option>
                          ))}
                        </select>
                        <Button onClick={handleCreateTeam} className="bg-blue-500 hover:bg-blue-600">
                          + 팀 생성
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 팀 목록 - 블록 형태로 한눈에 보기 */}
                {isLoadingTeams ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">로딩 중...</CardContent>
                  </Card>
                ) : teams.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">생성된 팀이 없습니다.</CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>📋 팀 현황</CardTitle>
                      <CardDescription>총 {teams.length}개 팀 · 클릭하여 학생 교환</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {teams.map((team) => (
                          <div
                            key={team.teamId}
                            className="p-3 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:border-blue-300 transition-all"
                          >
                            {/* 팀 헤더 */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{team.flag}</span>
                                <div>
                                  <p className="font-bold text-sm">{team.teamName}</p>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-amber-600">🍪 {team.teamCookie}</span>
                                    <button
                                      onClick={async () => {
                                        const amount = prompt('추가할 쿠키 개수 (마이너스도 가능)', '10');
                                        if (!amount || !user || !selectedClass) return;
                                        const num = parseInt(amount);
                                        if (isNaN(num)) return;
                                        await updateTeamCookie(user.uid, selectedClass, team.teamId, num);
                                        await loadTeams();
                                        toast.success(`${team.teamName}에 ${num > 0 ? '+' : ''}${num}🍪`);
                                      }}
                                      className="text-[10px] px-1 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-700"
                                    >
                                      +🍪
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteTeam(team.teamId)}
                                className="text-red-400 hover:text-red-600 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                            {/* 멤버 목록 */}
                            <div className="flex flex-wrap gap-1">
                              {team.members.map((code) => {
                                const student = students.find(s => s.code === code);
                                const isSelected = swapStudent1?.code === code;
                                return (
                                  <span
                                    key={code}
                                    onClick={() => handleSelectStudentForSwap(code, team.teamId)}
                                    className={`px-1.5 py-0.5 rounded text-xs cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 hover:bg-blue-100'
                                    }`}
                                  >
                                    {student?.name || code}
                                  </span>
                                );
                              })}
                              {/* 멤버 추가 버튼 */}
                              {selectedTeamForMember === team.teamId ? (
                                <select
                                  className="px-1 py-0.5 text-xs border rounded"
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAddMemberToTeam(team.teamId, e.target.value);
                                      setSelectedTeamForMember(null);
                                    }
                                  }}
                                  defaultValue=""
                                  autoFocus
                                  onBlur={() => setSelectedTeamForMember(null)}
                                >
                                  <option value="">선택</option>
                                  {students
                                    .filter(s => !team.members.includes(s.code))
                                    .map(s => (
                                      <option key={s.code} value={s.code}>{s.name}</option>
                                    ))}
                                </select>
                              ) : (
                                <button
                                  onClick={() => setSelectedTeamForMember(team.teamId)}
                                  className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-600 hover:bg-green-200"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* 팀 현황 탭 */}
          <TabsContent value="teamStatus" className="space-y-6">
            {!selectedClass ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  👆 먼저 학급 관리 탭에서 학급을 선택해주세요.
                </CardContent>
              </Card>
            ) : isLoadingTeamStatus ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  📊 팀 현황을 불러오는 중...
                </CardContent>
              </Card>
            ) : teams.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  생성된 팀이 없습니다. 팀 탭에서 팀을 먼저 만들어주세요.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 팀별 현황 */}
                {teams.map((team) => {
                  // 팀 총 쿠키 획득량 계산
                  let teamTotalCookieGain = 0;
                  team.members.forEach(code => {
                    const memberGrass = teamStatusData.get(code) || [];
                    memberGrass.forEach(g => {
                      if (g.cookieChange > 0) teamTotalCookieGain += g.cookieChange;
                    });
                  });

                  return (
                    <Card key={team.teamId}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <span className="text-3xl">{team.flag}</span>
                            <span>{team.teamName}</span>
                          </CardTitle>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-xs text-gray-500">현재 쿠키</p>
                              <p className="text-xl font-bold text-amber-600">{team.teamCookie} 🍪</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500">총 획득량</p>
                              <p className="text-xl font-bold text-green-600">+{teamTotalCookieGain} 🍪</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500">멤버</p>
                              <p className="text-xl font-bold text-blue-600">{team.members.length}명</p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* 팀원별 현황 */}
                        <div className="space-y-4">
                          {team.members.map((code) => {
                            const student = students.find(s => s.code === code);
                            const memberGrass = teamStatusData.get(code) || [];

                            // 최근 7일간 쿠키 변화량 계산
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
                              <div key={code} className="p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <span className={`text-2xl ${getAnimationClass(student?.profile.animationCode || 'none')}`}>
                                      {student?.profile.emojiCode ? (
                                        (() => {
                                          const item = ALL_SHOP_ITEMS.find(i => i.code === student.profile.emojiCode);
                                          return item?.value || '😊';
                                        })()
                                      ) : '😊'}
                                    </span>
                                    <div>
                                      <p className="font-bold">{student?.name || code}</p>
                                      <p className="text-xs text-gray-500">#{student?.number}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    <div className="text-center">
                                      <p className="text-gray-500">보유</p>
                                      <p className="font-bold text-amber-600">{student?.cookie || 0} 🍪</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-gray-500">총 획득</p>
                                      <p className="font-bold text-green-600">+{totalGain}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* 최근 7일 잔디 */}
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400 w-16">최근 7일</span>
                                  <div className="flex gap-1">
                                    {recentDays.map((day, idx) => {
                                      // 3단계: 1개=연초록, 2개=초록, 3개+=진초록
                                      const bgColor = day.change === 0 ? 'bg-gray-200'
                                        : day.change === 1 ? 'bg-green-300'
                                        : day.change === 2 ? 'bg-green-500'
                                        : 'bg-green-700';
                                      return (
                                        <div
                                          key={idx}
                                          className={`w-6 h-6 rounded ${bgColor} flex items-center justify-center`}
                                          title={`${day.date}: +${day.change}🍪`}
                                        >
                                          {day.change > 0 && (
                                            <span className="text-[10px] text-white font-bold">
                                              {day.change > 99 ? '99+' : day.change}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <span className="text-xs text-gray-400 ml-2">
                                    (오늘: {recentDays[6]?.change > 0 ? `+${recentDays[6].change}` : '0'})
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {team.members.length === 0 && (
                          <p className="text-center text-gray-400 py-4">팀원이 없습니다.</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </TabsContent>

          {/* 배틀 탭 */}
          <TabsContent value="battles" className="space-y-6">
            {!selectedClass ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  👆 먼저 학급 관리 탭에서 학급을 선택해주세요.
                </CardContent>
              </Card>
            ) : teams.length < 2 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  ⚠️ 배틀을 시작하려면 최소 2개의 팀이 필요합니다. 팀 탭에서 팀을 먼저 생성해주세요.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 배틀 생성 */}
                <Card>
                  <CardHeader>
                    <CardTitle>⚔️ 배틀 관리</CardTitle>
                    <CardDescription>팀 간 배틀을 생성하고 점수를 관리하세요</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      <Input
                        placeholder="배틀 제목"
                        value={newBattleTitle}
                        onChange={(e) => setNewBattleTitle(e.target.value)}
                      />
                      <select
                        value={newBattleTeam1}
                        onChange={(e) => setNewBattleTeam1(e.target.value)}
                        className="px-3 py-2 border rounded-md"
                      >
                        <option value="">팀1 선택</option>
                        {teams.map((t) => (
                          <option key={t.teamId} value={t.teamId}>{t.flag} {t.teamName}</option>
                        ))}
                      </select>
                      <select
                        value={newBattleTeam2}
                        onChange={(e) => setNewBattleTeam2(e.target.value)}
                        className="px-3 py-2 border rounded-md"
                      >
                        <option value="">팀2 선택</option>
                        {teams.map((t) => (
                          <option key={t.teamId} value={t.teamId}>{t.flag} {t.teamName}</option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        placeholder="보상"
                        value={newBattleReward}
                        onChange={(e) => setNewBattleReward(e.target.value)}
                      />
                      <Button onClick={handleCreateBattle} className="bg-red-500 hover:bg-red-600">
                        배틀 시작
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 배틀 목록 */}
                {isLoadingBattles ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">로딩 중...</CardContent>
                  </Card>
                ) : battles.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">진행 중인 배틀이 없습니다.</CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {battles.map((battle) => {
                      const team1 = teams.find(t => t.teamId === battle.team1Id);
                      const team2 = teams.find(t => t.teamId === battle.team2Id);
                      const isOngoing = battle.status === 'ongoing';

                      return (
                        <Card key={battle.id} className={!isOngoing ? 'opacity-70' : ''}>
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-bold text-lg">{battle.title}</h3>
                              <div className="flex items-center gap-2">
                                {isOngoing ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">진행중</span>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">종료</span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500"
                                  onClick={() => handleDeleteBattle(battle.id)}
                                >
                                  삭제
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-center gap-4">
                              {/* 팀1 */}
                              <div className="text-center flex-1">
                                <p className="text-3xl">{team1?.flag}</p>
                                <p className="font-medium">{team1?.teamName}</p>
                                {isOngoing ? (
                                  <div className="flex items-center justify-center gap-2 mt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdateBattleScore(battle.id, Math.max(0, battle.team1Score - 1), battle.team2Score)}
                                    >
                                      -
                                    </Button>
                                    <span className="text-3xl font-bold w-12">{battle.team1Score}</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdateBattleScore(battle.id, battle.team1Score + 1, battle.team2Score)}
                                    >
                                      +
                                    </Button>
                                  </div>
                                ) : (
                                  <p className="text-3xl font-bold mt-2">{battle.team1Score}</p>
                                )}
                              </div>

                              <div className="text-2xl font-bold text-gray-400">VS</div>

                              {/* 팀2 */}
                              <div className="text-center flex-1">
                                <p className="text-3xl">{team2?.flag}</p>
                                <p className="font-medium">{team2?.teamName}</p>
                                {isOngoing ? (
                                  <div className="flex items-center justify-center gap-2 mt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdateBattleScore(battle.id, battle.team1Score, Math.max(0, battle.team2Score - 1))}
                                    >
                                      -
                                    </Button>
                                    <span className="text-3xl font-bold w-12">{battle.team2Score}</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdateBattleScore(battle.id, battle.team1Score, battle.team2Score + 1)}
                                    >
                                      +
                                    </Button>
                                  </div>
                                ) : (
                                  <p className="text-3xl font-bold mt-2">{battle.team2Score}</p>
                                )}
                              </div>
                            </div>

                            {isOngoing && (
                              <div className="text-center mt-4">
                                <Button onClick={() => handleEndBattle(battle)} className="bg-amber-500 hover:bg-amber-600">
                                  배틀 종료 (보상: {battle.reward}🍪)
                                </Button>
                              </div>
                            )}

                            {!isOngoing && battle.winnerId && (
                              <p className="text-center mt-4 text-green-600 font-medium">
                                🏆 승리: {battle.winnerId === team1?.teamId ? team1?.teamName : team2?.teamName}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* 소원 탭 - 모든 클래스룸에서 공유 */}
          <TabsContent value="wishes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>⭐ 소원의 돌 관리</CardTitle>
                <CardDescription>모든 학급에서 공유되는 소원을 확인하고 선정하세요</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Button onClick={loadWishes} disabled={isLoadingWishes} variant="outline">
                      {isLoadingWishes ? '로딩 중...' : '🔄 새로고침'}
                    </Button>
                    <Button
                      variant={wishSortOrder === 'latest' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setWishSortOrder('latest')}
                    >
                      🕐 최신순
                    </Button>
                    <Button
                      variant={wishSortOrder === 'likes' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setWishSortOrder('likes')}
                    >
                      ❤️ 좋아요순
                    </Button>
                  </div>

                  {isLoadingWishes ? (
                    <p className="text-center py-8 text-gray-500">로딩 중...</p>
                  ) : wishes.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">등록된 소원이 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {[...wishes]
                        .sort((a, b) => wishSortOrder === 'likes'
                          ? b.likes.length - a.likes.length
                          : (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
                        )
                        .map((wish) => (
                        <div
                          key={wish.id}
                          className={`p-4 rounded-lg ${wish.isGranted ? '' : 'bg-white'}`}
                          style={{
                            border: wish.isGranted
                              ? '3px solid transparent'
                              : '1px solid rgb(229 231 235)',
                            backgroundImage: wish.isGranted
                              ? 'linear-gradient(to right, rgb(254 243 199), rgb(253 230 138), rgb(254 243 199)), linear-gradient(to right, rgb(239 68 68), rgb(234 179 8), rgb(34 197 94), rgb(59 130 246), rgb(168 85 247))'
                              : undefined,
                            backgroundOrigin: 'border-box',
                            backgroundClip: wish.isGranted ? 'padding-box, border-box' : undefined,
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{wish.studentName}</span>
                                {wish.isGranted && (
                                  <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded text-xs">
                                    ✨ 선정됨
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700">{wish.content}</p>
                              {wish.isGranted && wish.grantedMessage && (
                                <p className="text-sm text-purple-600 mt-2 italic">
                                  💬 어디선가 들려오는 목소리: "{wish.grantedMessage}"
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">❤️ {wish.likes.length}</p>
                            </div>
                            <div className="flex gap-2">
                              {!wish.isGranted && (
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500"
                                  onClick={() => {
                                    setGrantingWish(wish);
                                    setGrantMessage('');
                                  }}
                                >
                                  ✨ 선정
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500"
                                onClick={() => handleDeleteWish(wish.id)}
                              >
                                삭제
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
            </Card>
          </TabsContent>

          {/* 설정 탭 */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>⚙️ 계정 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">이메일</label>
                  <p className="font-medium">{teacher?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">이름</label>
                  <p className="font-medium">{teacher?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">학교</label>
                  <p className="font-medium">{teacher?.schoolName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">다했니 API 키</label>
                  <p className="font-mono text-xs bg-gray-100 p-2 rounded">
                    {teacher?.dahandinApiKey ? '••••••••' + teacher.dahandinApiKey.slice(-8) : '-'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* 학생 상세 모달 - 쿠키 부여 기능 포함 */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleCloseStudentModal}>
          <div
            className="bg-white rounded-3xl shadow-2xl border-4 border-amber-200 max-h-[90vh] overflow-y-auto"
            style={{ width: '420px' }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* 헤더 - 학생 정보 */}
            <div className="p-4 border-b flex items-center gap-3">
              <div className="text-3xl">
                {selectedStudent.profile?.emojiCode === 'emoji_00' ? '😊' : '🌟'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-lg">{selectedStudent.name}</h3>
                <p className="text-sm text-gray-500">{selectedStudent.number}번 · {selectedStudent.code}</p>
              </div>
              <button onClick={handleCloseStudentModal} className="text-gray-400 hover:text-gray-600 text-2xl p-1">×</button>
            </div>

            {/* 쿠키 현황 */}
            <div className="px-4 py-4 bg-amber-50 grid grid-cols-4 gap-2 text-center">
              <div className="bg-white rounded-lg p-2">
                <p className="text-amber-600 font-bold text-xl">{selectedStudent.cookie}</p>
                <p className="text-xs text-amber-700">🍪 쿠키</p>
              </div>
              <div className="bg-white rounded-lg p-2">
                <p className="text-green-600 font-bold text-xl">{selectedStudent.totalCookie}</p>
                <p className="text-xs text-gray-500">📊 누적</p>
              </div>
              <div className="bg-white rounded-lg p-2">
                <p className="text-gray-600 font-bold text-xl">{selectedStudent.usedCookie}</p>
                <p className="text-xs text-gray-500">💸 사용</p>
              </div>
            </div>

            {/* 쿠키 부여 */}
            <div className="px-4 py-3 bg-blue-50 border-y">
              <p className="text-sm font-medium text-blue-700 mb-2">🎁 쿠키 부여/차감</p>
              <div className="flex gap-2">
                <div className="flex-1 flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 text-red-600 hover:bg-red-50"
                    onClick={() => handleAddCookie(-5)}
                    disabled={isAddingCookie}
                  >
                    -5
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 text-red-600 hover:bg-red-50"
                    onClick={() => handleAddCookie(-1)}
                    disabled={isAddingCookie}
                  >
                    -1
                  </Button>
                  <Input
                    type="number"
                    value={cookieAmount}
                    onChange={(e) => setCookieAmount(e.target.value)}
                    placeholder="0"
                    className="w-20 text-center"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 text-green-600 hover:bg-green-50"
                    onClick={() => handleAddCookie(1)}
                    disabled={isAddingCookie}
                  >
                    +1
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 text-green-600 hover:bg-green-50"
                    onClick={() => handleAddCookie(5)}
                    disabled={isAddingCookie}
                  >
                    +5
                  </Button>
                </div>
                <Button
                  onClick={() => handleAddCookie()}
                  disabled={isAddingCookie || !cookieAmount}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isAddingCookie ? '...' : '적용'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">버튼 클릭: 즉시 적용 / 직접 입력 후 적용 버튼</p>
            </div>

            {/* 프로필 꾸미기 미리보기 */}
            <div className="px-4 py-4 bg-gradient-to-b from-purple-50 to-pink-50 border-b">
              <p className="text-sm font-medium text-purple-700 mb-3 text-center">🎨 프로필 미리보기</p>
              <div className="flex justify-center">
                {(() => {
                  const profile = selectedStudent?.profile;
                  const emojiItem = ALL_SHOP_ITEMS.find(item => item.code === profile?.emojiCode);
                  const emoji = emojiItem?.value || '😀';
                  const borderItem = ALL_SHOP_ITEMS.find(item => item.code === profile?.buttonBorderCode);
                  const fillItem = ALL_SHOP_ITEMS.find(item => item.code === profile?.buttonFillCode);
                  const nameEffectItem = ALL_SHOP_ITEMS.find(item => item.code === profile?.nameEffectCode);
                  const titleColorItem = ALL_SHOP_ITEMS.find(item => item.code === profile?.titleColorCode);

                  const borderColorMap: Record<string, string> = {
                    'border-blue-500': 'rgb(59 130 246)', 'border-red-500': 'rgb(239 68 68)',
                    'border-green-500': 'rgb(34 197 94)', 'border-yellow-500': 'rgb(234 179 8)',
                    'border-purple-500': 'rgb(168 85 247)', 'border-pink-500': 'rgb(236 72 153)',
                    'border-amber-400': 'rgb(251 191 36)', 'border-gray-800': 'rgb(31 41 55)',
                  };
                  const borderColor = borderItem?.value ? borderColorMap[borderItem.value] || 'rgb(229 231 235)' : 'rgb(229 231 235)';

                  const fillColorMap: Record<string, string> = {
                    'bg-blue-500': 'rgb(59 130 246)', 'bg-red-500': 'rgb(239 68 68)',
                    'bg-green-500': 'rgb(34 197 94)', 'bg-yellow-500': 'rgb(234 179 8)',
                    'bg-purple-500': 'rgb(168 85 247)', 'bg-pink-500': 'rgb(236 72 153)',
                    'bg-amber-400': 'rgb(251 191 36)', 'bg-gray-800': 'rgb(31 41 55)',
                  };
                  const gradientMap: Record<string, string> = {
                    'gradient-rainbow': 'linear-gradient(to right, rgb(239 68 68), rgb(234 179 8), rgb(34 197 94), rgb(59 130 246), rgb(168 85 247))',
                    'gradient-fire': 'linear-gradient(to right, rgb(239 68 68), rgb(249 115 22), rgb(234 179 8))',
                    'gradient-ocean': 'linear-gradient(to right, rgb(6 182 212), rgb(59 130 246), rgb(99 102 241))',
                    'gradient-sunset': 'linear-gradient(to right, rgb(249 115 22), rgb(236 72 153), rgb(168 85 247))',
                    'gradient-aurora': 'linear-gradient(to right, rgb(34 197 94), rgb(6 182 212), rgb(168 85 247))',
                    'gradient-pink-purple': 'linear-gradient(to right, rgb(236 72 153), rgb(168 85 247))',
                    'gradient-mint': 'linear-gradient(to right, rgb(6 182 212), rgb(20 184 166))',
                    'gradient-orange': 'linear-gradient(to right, rgb(234 179 8), rgb(249 115 22))',
                  };
                  const isGradient = fillItem?.value?.startsWith('gradient-');
                  const fillStyle = isGradient
                    ? { backgroundImage: gradientMap[fillItem?.value || ''] || 'none' }
                    : { backgroundColor: fillColorMap[fillItem?.value || ''] || 'white' };

                  const nameEffectClass = nameEffectItem?.value === 'rainbow'
                    ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent'
                    : nameEffectItem?.value === 'glow'
                    ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                    : nameEffectItem?.value === 'neon'
                    ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]'
                    : '';

                  const titleColors = ['bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-yellow-100 text-yellow-700', 'bg-green-100 text-green-700', 'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700', 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 text-white'];
                  const titleColorIndex = titleColorItem?.value ? parseInt(titleColorItem.value) : 0;
                  const titleColorClass = titleColors[titleColorIndex] || 'bg-gray-100 text-gray-700';

                  return (
                    <div
                      className="px-8 py-5 rounded-xl text-center shadow-lg"
                      style={{
                        border: `3px solid ${borderColor}`,
                        ...fillStyle,
                      }}
                    >
                      <div className={`text-5xl mb-3 ${getAnimationClass(profile?.animationCode || 'none')}`}>
                        {emoji}
                      </div>
                      {profile?.title && (
                        <div className="mb-2">
                          <span className={`inline-block text-sm px-3 py-1 rounded-full ${titleColorClass}`}>
                            {profile.title}
                          </span>
                        </div>
                      )}
                      <p className={`font-bold text-xl ${nameEffectClass}`}>
                        {selectedStudent?.name}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* GitHub 스타일 잔디 */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 font-medium">🌱 최근 활동</span>
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <div className="w-2 h-2 rounded-sm bg-gray-200" title="0개" />
                  <div className="w-2 h-2 rounded-sm bg-green-300" title="1개" />
                  <div className="w-2 h-2 rounded-sm bg-green-500" title="2개" />
                  <div className="w-2 h-2 rounded-sm bg-green-700" title="3개+" />
                </div>
              </div>
              <div className="flex gap-[2px]">
                {getStudentLast14Days().map((day, index) => (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-sm ${getStudentGrassColor(day.count)}`}
                    title={`${day.date}: +${day.count}`}
                  />
                ))}
              </div>
            </div>

            {/* 뱃지 */}
            {selectedStudent.badges && (Object.values(selectedStudent.badges) as Badge[]).filter(b => b.hasBadge).length > 0 && (
              <div className="px-4 pb-4">
                <p className="text-sm text-gray-600 font-medium mb-2">🏆 획득 뱃지</p>
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(selectedStudent.badges) as [string, Badge][])
                    .filter(([, badge]) => badge.hasBadge)
                    .map(([key, badge]) => (
                      <img key={key} src={badge.imgUrl} alt={badge.title} title={badge.title} className="w-8 h-8 rounded" />
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 소원 선정 메시지 입력 모달 */}
      {grantingWish && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setGrantingWish(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-2">✨ 소원 선정하기</h3>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium">{grantingWish.studentName}</span>의 소원: "{grantingWish.content}"
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                💬 전달할 메시지 (선택사항)
              </label>
              <input
                type="text"
                value={grantMessage}
                onChange={(e) => setGrantMessage(e.target.value)}
                placeholder="어디선가 들려오는 목소리로 전달됩니다..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setGrantingWish(null)}>
                취소
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500"
                onClick={async () => {
                  await handleGrantWish(grantingWish.id, grantMessage);
                  setGrantingWish(null);
                }}
              >
                ✨ 선정하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}