import React, { useState, useEffect, useRef } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { getMultipleStudentsInfo, StudentInfo, StoredStudent } from '../services/api';
import { getClassStudents as getClassStudentsFromSheets, SheetsStudentData, setClassActivation, getClassListFromSheets, SheetsClassInfo } from '../services/sheets';
import { getWishes, grantWish, deleteWish, SheetWish, refreshCookies } from '../services/sheetsApi';
import { getShopItems, SheetShopItem } from '../services/sheetsApi';
import { toast } from 'sonner@2.0.3';
import { downloadCsvTemplate, parseCsvFile, exportStudentsToCsv } from '../utils/csv';
import {
  Users,
  Cookie,
  Upload,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  LogOut,
  Award,
  FileSpreadsheet,
  Trash2,
  Trophy,
  List,
  ToggleLeft,
  ToggleRight,
  Settings,
  ShoppingBag,
  Star,
  Heart,
  Gift,
} from 'lucide-react';
import { StudentRankingTable, convertToRankedStudents } from '../components/StudentRankingTable';

interface TeacherDashboardProps {
  onLogout?: () => void;
}

export function TeacherDashboard({ onLogout }: TeacherDashboardProps) {
  const {
    apiKey,
    classes,
    selectedClass,
    selectClass,
    getClassStudents,
    saveClassStudents,
    refreshClasses,
    logout,
  } = useAuth();

  // 상태
  const [students, setStudents] = useState<StoredStudent[]>([]);
  const [studentInfoMap, setStudentInfoMap] = useState<Map<string, StudentInfo | null>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'ranking'>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 학급 활성화 상태 관리
  const [classActivationMap, setClassActivationMap] = useState<Record<string, boolean>>({});
  const [activationLoading, setActivationLoading] = useState<string | null>(null);
  const [allSheetsClasses, setAllSheetsClasses] = useState<SheetsClassInfo[]>([]);

  // 교사용 상점/소원 상태
  const [shopItems, setShopItems] = useState<SheetShopItem[]>([]);
  const [wishes, setWishes] = useState<SheetWish[]>([]);
  const [wishesLoading, setWishesLoading] = useState(false);
  const [grantingWish, setGrantingWish] = useState<string | null>(null);

  // 쿠키 새로고침 상태
  const [isRefreshingCookies, setIsRefreshingCookies] = useState(false);

  // 학급 활성화 상태 로드 (모든 학급 포함)
  useEffect(() => {
    const loadClassActivation = async () => {
      const response = await getClassListFromSheets();
      if (response.success && response.data) {
        setAllSheetsClasses(response.data);
        const activationMap: Record<string, boolean> = {};
        response.data.forEach((cls: SheetsClassInfo) => {
          activationMap[cls.name] = cls.active !== false;
        });
        setClassActivationMap(activationMap);
      }
    };
    loadClassActivation();
  }, []);

  // 상점 아이템 로드
  useEffect(() => {
    const loadShopItems = async () => {
      const items = await getShopItems();
      setShopItems(items);
    };
    loadShopItems();
  }, []);

  // 소원 로드 (학급 선택 시)
  useEffect(() => {
    const loadWishes = async () => {
      if (!selectedClass) return;
      setWishesLoading(true);
      try {
        const wishList = await getWishes(selectedClass);
        setWishes(wishList);
      } catch (error) {
        console.error('소원 로드 실패:', error);
      } finally {
        setWishesLoading(false);
      }
    };
    loadWishes();
  }, [selectedClass]);

  // 소원 선정 핸들러
  const handleGrantWish = async (wishId: string, reward: number = 50) => {
    if (!selectedClass) return;
    setGrantingWish(wishId);
    try {
      const success = await grantWish(selectedClass, wishId, reward);
      if (success) {
        // 소원 목록 새로고침
        const wishList = await getWishes(selectedClass);
        setWishes(wishList);
      }
    } catch (error) {
      console.error('소원 선정 실패:', error);
    } finally {
      setGrantingWish(null);
    }
  };

  // 소원 삭제 핸들러
  const handleDeleteWish = async (wishId: string) => {
    if (!selectedClass || !window.confirm('이 소원을 삭제하시겠습니까?')) return;
    try {
      const success = await deleteWish(selectedClass, wishId);
      if (success) {
        setWishes(prev => prev.filter(w => w.id !== wishId));
      }
    } catch (error) {
      console.error('소원 삭제 실패:', error);
    }
  };

  // 쿠키 새로고침 핸들러 - 잔디 시트에 현재 쿠키 상태 기록
  const handleRefreshCookies = async () => {
    if (!selectedClass) {
      toast.error('학급을 먼저 선택해주세요');
      return;
    }

    setIsRefreshingCookies(true);
    try {
      const result = await refreshCookies(selectedClass);
      if (result.success && result.data) {
        toast.success(
          `쿠키 새로고침 완료! (${result.data.date}, ${result.data.studentsUpdated}명 업데이트)`
        );
      } else {
        toast.error(result.message || '쿠키 새로고침 실패');
      }
    } catch (error) {
      console.error('쿠키 새로고침 실패:', error);
      toast.error('쿠키 새로고침 중 오류가 발생했습니다');
    } finally {
      setIsRefreshingCookies(false);
    }
  };

  // 활성화 토글 핸들러
  const handleToggleActivation = async (className: string) => {
    const currentState = classActivationMap[className] !== false;
    const newState = !currentState;

    setActivationLoading(className);
    try {
      const response = await setClassActivation(className, newState);
      if (response.success) {
        setClassActivationMap(prev => ({
          ...prev,
          [className]: newState
        }));
      }
    } catch (error) {
      console.error('활성화 상태 변경 실패:', error);
    } finally {
      setActivationLoading(null);
    }
  };

  // 학생 정보 자동 로드 함수
  const loadStudentInfoAuto = async (studentList: StoredStudent[]) => {
    if (studentList.length === 0) return;

    setLoading(true);
    setLoadingProgress({ current: 0, total: studentList.length });

    try {
      // API 키가 있으면 다했니 API 사용
      if (apiKey) {
        const codes = studentList.map(s => s.code);
        const results = await getMultipleStudentsInfo(apiKey, codes, (current, total) => {
          setLoadingProgress({ current, total });
        });
        setStudentInfoMap(results);
      } else if (selectedClass) {
        // API 키가 없으면 Sheets에서 가져오기
        const response = await getClassStudentsFromSheets(selectedClass);
        if (response.success && response.data) {
          // SheetsStudentData를 StudentInfo 형식으로 변환
          const infoMap = new Map<string, StudentInfo | null>();
          response.data.forEach((student: SheetsStudentData) => {
            infoMap.set(student.code, {
              cookie: student.cookie,
              usedCookie: student.usedCookie,
              totalCookie: student.totalCookie,
              badges: student.badges || {}
            });
          });
          setStudentInfoMap(infoMap);
        }
      }
    } catch (error) {
      console.error('학생 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 선택된 클래스 변경 시 학생 목록 로드 + 자동으로 정보 불러오기
  useEffect(() => {
    if (selectedClass) {
      const loadClassData = async () => {
        // 먼저 로컬 저장된 학생 목록 확인
        const savedStudents = getClassStudents(selectedClass);

        // API 키가 없으면 Sheets에서 자동으로 학생 목록 로드
        if (!apiKey) {
          const response = await getClassStudentsFromSheets(selectedClass);
          if (response.success && response.data) {
            // Sheets에서 가져온 학생 목록으로 업데이트
            const sheetsStudents: StoredStudent[] = response.data.map((s: SheetsStudentData) => ({
              number: s.number,
              name: s.name,
              code: s.code
            }));
            setStudents(sheetsStudents);

            // 동시에 상세 정보도 설정
            const infoMap = new Map<string, StudentInfo | null>();
            response.data.forEach((student: SheetsStudentData) => {
              infoMap.set(student.code, {
                cookie: student.cookie,
                usedCookie: student.usedCookie,
                totalCookie: student.totalCookie,
                badges: student.badges || {}
              });
            });
            setStudentInfoMap(infoMap);
            return;
          }
        }

        // API 키가 있거나 Sheets 로드 실패 시 기존 방식
        setStudents(savedStudents);
        setStudentInfoMap(new Map());

        if (savedStudents.length > 0) {
          loadStudentInfoAuto(savedStudents);
        }
      };

      loadClassData();
    }
  }, [selectedClass]);

  // 클래스 선택 핸들러
  const handleClassSelect = (className: string) => {
    selectClass(className);
    setUploadError('');
    setUploadSuccess('');
  };

  // CSV 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClass) return;

    setUploadError('');
    setUploadSuccess('');

    try {
      const parsedStudents = await parseCsvFile(file);
      setStudents(parsedStudents);
      saveClassStudents(selectedClass, parsedStudents);
      setUploadSuccess(`${parsedStudents.length}명의 학생이 등록되었습니다.`);
      setStudentInfoMap(new Map());

      // 자동으로 학생 정보 불러오기
      if (parsedStudents.length > 0) {
        loadStudentInfoAuto(parsedStudents);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.');
    }

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 학생 정보 불러오기
  const handleLoadStudentInfo = async () => {
    if (students.length === 0 || !selectedClass) return;

    setLoading(true);
    setLoadingProgress({ current: 0, total: students.length });

    try {
      // API 키가 있으면 다했니 API 사용
      if (apiKey) {
        const codes = students.map(s => s.code);
        const results = await getMultipleStudentsInfo(apiKey, codes, (current, total) => {
          setLoadingProgress({ current, total });
        });
        setStudentInfoMap(results);
      } else {
        // API 키가 없으면 Sheets에서 가져오기
        const response = await getClassStudentsFromSheets(selectedClass);
        if (response.success && response.data) {
          // SheetsStudentData를 StudentInfo 형식으로 변환
          const infoMap = new Map<string, StudentInfo | null>();
          response.data.forEach((student: SheetsStudentData) => {
            infoMap.set(student.code, {
              cookie: student.cookie,
              usedCookie: student.usedCookie,
              totalCookie: student.totalCookie,
              badges: student.badges || {}
            });
          });
          setStudentInfoMap(infoMap);
          setLoadingProgress({ current: students.length, total: students.length });
        }
      }
    } catch (error) {
      console.error('학생 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 학생 목록 초기화
  const handleClearStudents = () => {
    if (!selectedClass) return;
    if (window.confirm('학생 목록을 초기화하시겠습니까?')) {
      setStudents([]);
      saveClassStudents(selectedClass, []);
      setStudentInfoMap(new Map());
    }
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    logout();
    onLogout?.();
  };

  // 통계 계산
  const totalCookies = Array.from(studentInfoMap.values())
    .filter((info): info is StudentInfo => info !== null)
    .reduce((sum, info) => sum + info.cookie, 0);

  const totalUsedCookies = Array.from(studentInfoMap.values())
    .filter((info): info is StudentInfo => info !== null)
    .reduce((sum, info) => sum + info.usedCookie, 0);

  const totalRemainingCookies = Array.from(studentInfoMap.values())
    .filter((info): info is StudentInfo => info !== null)
    .reduce((sum, info) => sum + info.totalCookie, 0);

  const avgCookies = studentInfoMap.size > 0
    ? Math.round(totalCookies / studentInfoMap.size)
    : 0;

  const loadedCount = Array.from(studentInfoMap.values()).filter(v => v !== null).length;

  // 선택된 클래스 정보
  const selectedClassInfo = classes.find(c => c.name === selectedClass);

  // 랭킹 데이터 계산
  const rankedStudents = convertToRankedStudents(studentInfoMap, students);

  return (
    <PageLayout title="교사 대시보드" role="admin">
      <div className="space-y-6">
        {/* 헤더 */}
        <Card className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white mb-2">다했니? 학습 관리</h2>
              <p className="text-blue-100">클래스별 학생 현황을 관리합니다</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>
        </Card>

        {/* 클래스 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              클래스 선택
            </CardTitle>
            <CardDescription>
              관리할 클래스를 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <Select value={selectedClass || ''} onValueChange={handleClassSelect}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="클래스를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.name} value={cls.name}>
                      {cls.name} {cls.cookies !== undefined ? `(${cls.cookies} 쿠키)` : cls.studentCount !== undefined ? `(${cls.studentCount}명)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={refreshClasses}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              {selectedClass && (
                <Button
                  variant="outline"
                  onClick={handleRefreshCookies}
                  disabled={isRefreshingCookies}
                  className="flex items-center gap-2"
                >
                  {isRefreshingCookies ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Cookie className="w-4 h-4" />
                  )}
                  쿠키 새로고침
                </Button>
              )}
            </div>

            {selectedClass && loadedCount > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-500">총 쿠키</p>
                    <p className="text-xl font-bold">{totalCookies}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">남은 쿠키</p>
                    <p className="text-xl font-bold text-green-600">{totalRemainingCookies}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">사용한 쿠키</p>
                    <p className="text-xl font-bold text-orange-600">{totalUsedCookies}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 학급 활성화 관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              학급 활성화 관리
            </CardTitle>
            <CardDescription>
              이번 학기에 사용할 학급만 활성화하세요. 비활성 학급은 시트가 생성되지 않습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allSheetsClasses.map((cls) => {
                const isActive = classActivationMap[cls.name] !== false;
                const isLoading = activationLoading === cls.name;
                return (
                  <div
                    key={cls.name}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isActive
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isActive ? 'text-green-700' : 'text-gray-500'}`}>
                        {cls.name}
                      </span>
                      <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                        {isActive ? '활성' : '비활성'}
                      </Badge>
                      {cls.studentCount !== undefined && (
                        <span className="text-xs text-gray-400">({cls.studentCount}명)</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleActivation(cls.name)}
                      disabled={isLoading}
                      className={`p-1 rounded-full transition-colors ${
                        isActive
                          ? 'text-green-600 hover:bg-green-100'
                          : 'text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : isActive ? (
                        <ToggleRight className="w-6 h-6" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            {allSheetsClasses.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                등록된 학급이 없습니다. Google Sheets에서 학급 목록을 불러오세요.
              </p>
            )}
          </CardContent>
        </Card>

        {/* 학생 목록/랭킹 */}
        {selectedClass && students.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {viewMode === 'list' ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      <Trophy className="w-5 h-5 text-yellow-500" />
                    )}
                    {viewMode === 'list' ? '학생 목록' : '쿠키 랭킹'} ({students.length}명)
                  </CardTitle>
                  <CardDescription>
                    {loadedCount > 0
                      ? `${loadedCount}명의 실시간 정보 로드됨`
                      : '학생 정보를 불러오려면 아래 버튼을 클릭하세요'}
                  </CardDescription>
                </div>
                <Button
                  onClick={handleLoadStudentInfo}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      로딩 중...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      정보 불러오기
                    </>
                  )}
                </Button>
              </div>

              {/* 보기 모드 탭 */}
              <div className="flex gap-2 mt-4">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="flex items-center gap-2"
                >
                  <List className="w-4 h-4" />
                  목록 보기
                </Button>
                <Button
                  variant={viewMode === 'ranking' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('ranking')}
                  className="flex items-center gap-2"
                  disabled={loadedCount === 0}
                >
                  <Trophy className="w-4 h-4" />
                  랭킹 보기
                </Button>
              </div>

              {loading && (
                <div className="mt-4">
                  <Progress value={(loadingProgress.current / loadingProgress.total) * 100} />
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    {loadingProgress.current} / {loadingProgress.total}
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {/* 통계 요약 */}
              {loadedCount > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500">총 학생</p>
                    <p className="text-2xl font-bold">{loadedCount}명</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500">총 쿠키</p>
                    <p className="text-2xl font-bold">{totalCookies}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500">평균 쿠키</p>
                    <p className="text-2xl font-bold">{avgCookies}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500">뱃지 보유</p>
                    <p className="text-2xl font-bold">
                      {Array.from(studentInfoMap.values())
                        .filter((info): info is StudentInfo => info !== null)
                        .filter(info => Object.values(info.badges).some(b => b.hasBadge))
                        .length}명
                    </p>
                  </div>
                </div>
              )}

              {/* 학생 테이블 (목록 보기) */}
              {viewMode === 'list' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">번호</th>
                        <th className="text-left p-3">이름</th>
                        <th className="text-left p-3">코드</th>
                        <th className="text-center p-3">쿠키</th>
                        <th className="text-center p-3">사용</th>
                        <th className="text-center p-3">남은 쿠키</th>
                        <th className="text-center p-3">뱃지</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const info = studentInfoMap.get(student.code);
                        return (
                          <tr key={student.code} className="border-b hover:bg-gray-50">
                            <td className="p-3">{student.number}</td>
                            <td className="p-3 font-medium">{student.name}</td>
                            <td className="p-3">
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                {student.code}
                              </code>
                            </td>
                            <td className="p-3 text-center">
                              {info ? (
                                <span className="flex items-center justify-center gap-1">
                                  <Cookie className="w-4 h-4 text-amber-500" />
                                  {info.cookie}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {info ? (
                                <span className="text-orange-600">{info.usedCookie}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {info ? (
                                <span className="font-bold text-green-600">{info.totalCookie}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {info ? (
                                <div className="flex items-center justify-center gap-1">
                                  {Object.values(info.badges)
                                    .filter(b => b.hasBadge)
                                    .slice(0, 3)
                                    .map((badge, idx) => (
                                      <img
                                        key={idx}
                                        src={badge.imgUrl}
                                        alt={badge.title}
                                        title={badge.title}
                                        className="w-6 h-6 rounded-full"
                                      />
                                    ))}
                                  {Object.values(info.badges).filter(b => b.hasBadge).length === 0 && (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 랭킹 보기 */}
              {viewMode === 'ranking' && (
                <div>
                  {rankedStudents.length > 0 ? (
                    <StudentRankingTable
                      students={rankedStudents}
                      showTop={rankedStudents.length}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p>학생 정보를 불러오면 랭킹을 확인할 수 있습니다</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 학생이 없을 때 안내 */}
        {selectedClass && students.length === 0 && (
          <Card className="p-12 text-center">
            <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">학생 정보를 불러오는 중...</h3>
            <p className="text-gray-500 mb-4">
              Google Sheets에서 학생 목록을 불러오고 있습니다.<br />
              학생 정보가 표시되지 않으면 Sheets에 학생 데이터가 있는지 확인해주세요.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              새로고침
            </Button>
          </Card>
        )}

        {/* 소원의 돌 관리 (학급 선택 시) */}
        {selectedClass && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                소원의 돌 관리
              </CardTitle>
              <CardDescription>
                학생들의 소원을 확인하고 선정할 수 있습니다. 선정 시 쿠키가 지급됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {wishesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  소원 로딩 중...
                </div>
              ) : wishes.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  아직 소원이 없습니다.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {wishes.map((wish) => (
                    <div
                      key={wish.id}
                      className={`p-4 rounded-lg border ${
                        wish.isGranted ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{wish.studentName}</span>
                            <span className="text-xs text-gray-400">
                              {wish.createdAt ? new Date(wish.createdAt).toLocaleDateString('ko-KR') : ''}
                            </span>
                            {wish.isGranted && (
                              <Badge className="bg-yellow-500">
                                <Gift className="w-3 h-3 mr-1" />
                                선정됨 (+{wish.grantedReward})
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-700">{wish.content}</p>
                          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                            <Heart className="w-4 h-4 text-pink-400" />
                            <span>{wish.likes?.length || 0}명이 좋아함</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {!wish.isGranted && (
                            <Button
                              size="sm"
                              onClick={() => handleGrantWish(wish.id, 50)}
                              disabled={grantingWish === wish.id}
                              className="bg-yellow-500 hover:bg-yellow-600"
                            >
                              {grantingWish === wish.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Gift className="w-4 h-4 mr-1" />
                                  선정 (50쿠키)
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteWish(wish.id)}
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* 상점 아이템 관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-purple-500" />
              상점 아이템 현황
            </CardTitle>
            <CardDescription>
              학생들이 구매할 수 있는 아이템 목록입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {shopItems.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                상점 아이템이 없습니다. Google Sheets에서 상점 시트를 확인하세요.
              </p>
            ) : (
              <Tabs defaultValue="emoji" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="emoji">이모지</TabsTrigger>
                  <TabsTrigger value="border">테두리</TabsTrigger>
                  <TabsTrigger value="nameEffect">이름효과</TabsTrigger>
                  <TabsTrigger value="background">배경</TabsTrigger>
                  <TabsTrigger value="titleColor">칭호색상</TabsTrigger>
                </TabsList>
                {['emoji', 'border', 'nameEffect', 'background', 'titleColor'].map((category) => (
                  <TabsContent key={category} value={category}>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
                      {shopItems
                        .filter((item) => item.category === category)
                        .map((item) => (
                          <div
                            key={item.code}
                            className="p-3 rounded-lg border bg-white text-center"
                          >
                            <div className="text-2xl mb-1">
                              {category === 'emoji' ? item.value : '✨'}
                            </div>
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-amber-600">
                              <Cookie className="w-3 h-3 inline mr-1" />
                              {item.price}
                            </p>
                          </div>
                        ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
