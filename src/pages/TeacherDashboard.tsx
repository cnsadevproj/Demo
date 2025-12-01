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
  ClassInfo,
  Student,
  Badge,
  ShopItem,
  Team,
  Battle,
  Wish
} from '../services/firestoreApi';
import { parseCsvFile, downloadCsvTemplate, exportStudentsToCsv } from '../utils/csv';
import { TEAM_FLAGS } from '../types/game';

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

  // 학생 상세 모달
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentGrassData, setStudentGrassData] = useState<Array<{ date: string; cookieChange: number; count: number }>>([]);

  // 상점 상태
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [isLoadingShop, setIsLoadingShop] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('emoji');
  const [newItemDescription, setNewItemDescription] = useState('');

  // 팀 상태
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamFlag, setNewTeamFlag] = useState(TEAM_FLAGS[0]);
  const [selectedTeamForMember, setSelectedTeamForMember] = useState<string | null>(null);

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

  // CSV 파일 업로드 처리
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !selectedClass) {
      toast.error('학급을 먼저 선택해주세요.');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCsv(true);
    try {
      const parsedStudents = await parseCsvFile(file);

      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;

      for (const student of parsedStudents) {
        try {
          // 중복 확인
          const existingStudent = await getStudent(user.uid, student.code);
          if (existingStudent) {
            skipCount++;
            continue; // 이미 존재하는 학생은 건너뛰기
          }

          await createStudent(user.uid, selectedClass, {
            code: student.code,
            number: student.number,
            name: student.name,
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
          console.error(`Failed to add student ${student.name}:`, err);
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

      // 새로 추가된 학생이 있으면 쿠키 정보 자동 불러오기
      if (successCount > 0 && teacher) {
        toast.info('쿠키 정보를 불러오는 중...');
        try {
          const result = await refreshStudentCookies(user.uid, selectedClass, teacher.dahandinApiKey);
          await loadStudents();
          if (result.success) {
            toast.success(`${result.count}명의 쿠키/뱃지 정보를 불러왔습니다!`);
          }
        } catch (refreshError) {
          console.error('Failed to auto-refresh cookies:', refreshError);
          toast.error('쿠키 정보 자동 불러오기에 실패했습니다. 수동으로 새로고침해주세요.');
        }
      }
    } catch (error: any) {
      console.error('CSV upload error:', error);
      toast.error(error.message || 'CSV 파일 처리에 실패했습니다.');
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
  };

  // 학생별 잔디 색상
  const getStudentGrassColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count < 3) return 'bg-green-200';
    if (count < 5) return 'bg-green-400';
    return 'bg-green-600';
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

  // 잔디 강도 색상
  const getGrassColor = (change: number, count: number) => {
    if (change === 0 && count === 0) return 'bg-gray-100';
    if (count >= 2) return 'bg-green-600'; // 하루에 2번 이상
    if (change >= 5) return 'bg-green-500';
    if (change >= 1) return 'bg-green-300';
    return 'bg-green-200';
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
    if (!user || !selectedClass) return;
    setIsLoadingWishes(true);
    try {
      const wishesData = await getWishes(user.uid, selectedClass);
      setWishes(wishesData);
    } catch (error) {
      console.error('Failed to load wishes:', error);
    }
    setIsLoadingWishes(false);
  };

  const handleGrantWish = async (wishId: string, reward: number) => {
    if (!user || !selectedClass) return;
    try {
      await grantWish(user.uid, selectedClass, wishId, reward);
      await loadWishes();
      toast.success('소원이 선정되었습니다!');
    } catch (error) {
      toast.error('소원 선정에 실패했습니다.');
    }
  };

  const handleDeleteWish = async (wishId: string) => {
    if (!user || !selectedClass) return;
    try {
      await deleteWish(user.uid, selectedClass, wishId);
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
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
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="classes" className="space-y-6">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="classes">📚 학급</TabsTrigger>
            <TabsTrigger value="students">👨‍🎓 학생</TabsTrigger>
            <TabsTrigger value="grass" onClick={loadGrassData}>🌱 잔디</TabsTrigger>
            <TabsTrigger value="shop" onClick={loadShopItems}>🏪 상점</TabsTrigger>
            <TabsTrigger value="teams" onClick={loadTeams}>👥 팀</TabsTrigger>
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
                <CardTitle>📋 학급 목록</CardTitle>
                <CardDescription>
                  {classes.length}개의 학급이 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    등록된 학급이 없습니다. 위 버튼으로 학급을 가져오세요.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {classes.map((cls) => (
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 수동 학급 추가 */}
            <Card>
              <CardHeader>
                <CardTitle>➕ 학급 직접 추가</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="학급 이름 (예: 1-1)"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                  />
                  <Button 
                    onClick={handleCreateClass}
                    disabled={isCreatingClass}
                  >
                    {isCreatingClass ? '생성 중...' : '추가'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 학생 관리 탭 */}
          <TabsContent value="students" className="space-y-6">
            {/* 학급 선택 드롭다운 */}
            <Card>
              <CardHeader>
                <CardTitle>📚 학급 선택</CardTitle>
                <CardDescription>
                  관리할 학급을 선택하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <p className="text-gray-500">
                    등록된 학급이 없습니다. 학급 관리 탭에서 학급을 먼저 추가하세요.
                  </p>
                ) : (
                  <select
                    value={selectedClass || ''}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => selectClass(e.target.value || null)}
                    className="w-full md:w-auto min-w-[200px] px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- 학급을 선택하세요 --</option>
                    {classes.map((cls: ClassInfo) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.studentCount || 0}명)
                      </option>
                    ))}
                  </select>
                )}
              </CardContent>
            </Card>

            {!selectedClass ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  👆 위에서 학급을 선택해주세요.
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
                      {students.length}명의 학생 · 더블클릭하여 상세 정보 보기
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
                                onDoubleClick={() => handleStudentDoubleClick(student)}
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
                      학생을 개별로 추가하거나 CSV 파일로 일괄 추가할 수 있습니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 개별 추가 */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">개별 추가</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <Input
                          placeholder="번호"
                          type="number"
                          value={newStudentNumber}
                          onChange={(e) => setNewStudentNumber(e.target.value)}
                        />
                        <Input
                          placeholder="이름"
                          value={newStudentName}
                          onChange={(e) => setNewStudentName(e.target.value)}
                        />
                        <Input
                          placeholder="학생코드"
                          value={newStudentCode}
                          onChange={(e) => setNewStudentCode(e.target.value)}
                        />
                        <Button
                          onClick={handleAddStudent}
                          disabled={isAddingStudent}
                        >
                          {isAddingStudent ? '추가 중...' : '추가'}
                        </Button>
                      </div>
                    </div>

                    {/* CSV 일괄 추가 */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-2">📁 CSV 일괄 추가</h4>
                      <p className="text-sm text-gray-500 mb-3">
                        CSV 파일 형식: 번호, 이름, 학생코드 (첫 줄은 헤더)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={handleDownloadTemplate}
                        >
                          📥 템플릿 다운로드
                        </Button>
                        <label className="cursor-pointer">
                          <Button
                            variant="default"
                            className="bg-green-500 hover:bg-green-600"
                            disabled={isUploadingCsv}
                            asChild
                          >
                            <span>
                              {isUploadingCsv ? '업로드 중...' : '📤 CSV 업로드'}
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleCsvUpload}
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
                    <Button
                      onClick={loadGrassData}
                      disabled={isLoadingGrass}
                      variant="outline"
                      className="mb-4"
                    >
                      {isLoadingGrass ? '로딩 중...' : '🔄 잔디 새로고침'}
                    </Button>

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
                                          className={`w-6 h-6 mx-auto rounded ${getGrassColor(data.change, data.count)}`}
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
                        <div className="w-4 h-4 rounded bg-gray-100"></div>
                        <span className="text-xs">없음</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-green-200"></div>
                        <span className="text-xs">약간</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-green-300"></div>
                        <span className="text-xs">보통</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-green-500"></div>
                        <span className="text-xs">많음</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-green-600"></div>
                        <span className="text-xs">2회 이상</span>
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
                    <option value="border">테두리</option>
                    <option value="nameEffect">이름효과</option>
                    <option value="background">배경</option>
                    <option value="titleColor">칭호색상</option>
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
                <p className="text-xs text-gray-400">카테고리별 값: 이모지(😎), 테두리(gradient-rainbow), 이름효과(gradient-fire), 배경(stars), 칭호색상(0~9)</p>

                {/* 아이템 목록 */}
                {isLoadingShop ? (
                  <p className="text-center py-8 text-gray-500">로딩 중...</p>
                ) : shopItems.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">등록된 상품이 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {shopItems.map((item) => (
                      <div key={item.code} className="p-4 border rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">{item.category} · {item.price} 🍪</p>
                          {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => handleDeleteShopItem(item.code)}
                        >
                          삭제
                        </Button>
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
                  👆 먼저 학급 관리 탭에서 학급을 선택해주세요.
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
                      <p className="text-sm font-medium text-blue-700 mb-2">⚡ 빠른 팀 생성 (학생 자동 배치)</p>
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

                              // 팀 생성
                              const teamIds: string[] = [];
                              for (let i = 0; i < num; i++) {
                                const teamId = await createTeam(user.uid, selectedClass, `${i + 1}팀`, TEAM_FLAGS[i % TEAM_FLAGS.length]);
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

                    {/* 개별 팀 생성 */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="팀 이름"
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
                  </CardContent>
                </Card>

                {/* 팀 목록 */}
                {isLoadingTeams ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">로딩 중...</CardContent>
                  </Card>
                ) : teams.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">생성된 팀이 없습니다.</CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teams.map((team) => (
                      <Card key={team.teamId}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <span className="text-2xl">{team.flag}</span>
                              {team.teamName}
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              onClick={() => handleDeleteTeam(team.teamId)}
                            >
                              삭제
                            </Button>
                          </div>
                          <CardDescription>쿠키: {team.teamCookie} 🍪 · 멤버: {team.members.length}명</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {/* 멤버 목록 */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {team.members.map((code) => {
                              const student = students.find(s => s.code === code);
                              return (
                                <span
                                  key={code}
                                  className="px-2 py-1 bg-gray-100 rounded text-sm flex items-center gap-1"
                                >
                                  {student?.name || code}
                                  <button
                                    onClick={() => handleRemoveMemberFromTeam(team.teamId, code)}
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                          {/* 멤버 추가 */}
                          {selectedTeamForMember === team.teamId ? (
                            <div className="flex gap-2">
                              <select
                                className="flex-1 px-3 py-2 border rounded-md text-sm"
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddMemberToTeam(team.teamId, e.target.value);
                                    setSelectedTeamForMember(null);
                                  }
                                }}
                                defaultValue=""
                              >
                                <option value="">학생 선택...</option>
                                {students
                                  .filter(s => !team.members.includes(s.code))
                                  .map(s => (
                                    <option key={s.code} value={s.code}>{s.number}. {s.name}</option>
                                  ))}
                              </select>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedTeamForMember(null)}>취소</Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTeamForMember(team.teamId)}
                            >
                              + 멤버 추가
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
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

          {/* 소원 탭 */}
          <TabsContent value="wishes" className="space-y-6">
            {!selectedClass ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  👆 먼저 학급 관리 탭에서 학급을 선택해주세요.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>⭐ 소원의 돌 관리</CardTitle>
                  <CardDescription>학생들이 작성한 소원을 확인하고 선정하세요</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={loadWishes} disabled={isLoadingWishes} variant="outline" className="mb-4">
                    {isLoadingWishes ? '로딩 중...' : '🔄 새로고침'}
                  </Button>

                  {isLoadingWishes ? (
                    <p className="text-center py-8 text-gray-500">로딩 중...</p>
                  ) : wishes.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">등록된 소원이 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {wishes.map((wish) => (
                        <div
                          key={wish.id}
                          className={`p-4 rounded-lg border ${wish.isGranted ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{wish.studentName}</span>
                                {wish.isGranted && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                    선정됨 (+{wish.grantedReward}🍪)
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700">{wish.content}</p>
                              <p className="text-xs text-gray-400 mt-1">❤️ {wish.likes.length}</p>
                            </div>
                            <div className="flex gap-2">
                              {!wish.isGranted && (
                                <Button
                                  size="sm"
                                  className="bg-amber-500 hover:bg-amber-600"
                                  onClick={() => handleGrantWish(wish.id, 10)}
                                >
                                  선정 (10🍪)
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
            )}
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

      {/* 학생 상세 모달 - 4:3 비율 */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleCloseStudentModal}>
          <div
            className="bg-white rounded-2xl shadow-2xl border-4 border-amber-200"
            style={{ width: '400px', aspectRatio: '4/3' }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* 헤더 - 학생 정보 */}
            <div className="p-4 border-b flex items-center gap-3">
              <div className="text-3xl">
                {selectedStudent.profile?.emojiCode === 'emoji_00' ? '😊' : '🌟'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{selectedStudent.name}</h3>
                <p className="text-xs text-gray-500">{selectedStudent.number}번 · {selectedStudent.code}</p>
              </div>
              <button onClick={handleCloseStudentModal} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            {/* 쿠키 현황 */}
            <div className="px-4 py-3 bg-amber-50 flex items-center justify-between text-sm">
              <div className="text-center">
                <p className="text-amber-600 font-bold text-lg">{selectedStudent.cookie}</p>
                <p className="text-xs text-amber-700">쿠키</p>
              </div>
              <div className="text-center">
                <p className="text-green-600 font-bold text-lg">{selectedStudent.totalCookie}</p>
                <p className="text-xs text-gray-500">총 획득</p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 font-bold text-lg">{selectedStudent.usedCookie}</p>
                <p className="text-xs text-gray-500">사용</p>
              </div>
              <div className="text-center">
                <p className="text-amber-800 font-bold text-lg">{selectedStudent.chocoChips}</p>
                <p className="text-xs text-gray-500">초코칩</p>
              </div>
            </div>

            {/* GitHub 스타일 잔디 */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">최근 활동</span>
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <span>Less</span>
                  <div className="w-2 h-2 rounded-sm bg-gray-200" />
                  <div className="w-2 h-2 rounded-sm bg-green-200" />
                  <div className="w-2 h-2 rounded-sm bg-green-400" />
                  <div className="w-2 h-2 rounded-sm bg-green-600" />
                  <span>More</span>
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
                <p className="text-xs text-gray-500 mb-2">획득 뱃지</p>
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
    </div>
  );
}