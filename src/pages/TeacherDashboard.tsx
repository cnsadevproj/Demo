import React, { useState, useEffect, useRef } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../contexts/AuthContext';
import { getMultipleStudentsInfo, StudentInfo, StoredStudent } from '../services/api';
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
} from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 학생 정보 자동 로드 함수
  const loadStudentInfoAuto = async (studentList: StoredStudent[]) => {
    if (!apiKey || studentList.length === 0) return;

    setLoading(true);
    setLoadingProgress({ current: 0, total: studentList.length });

    try {
      const codes = studentList.map(s => s.code);
      const results = await getMultipleStudentsInfo(apiKey, codes, (current, total) => {
        setLoadingProgress({ current, total });
      });
      setStudentInfoMap(results);
    } catch (error) {
      console.error('학생 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 선택된 클래스 변경 시 학생 목록 로드 + 자동으로 정보 불러오기
  useEffect(() => {
    if (selectedClass) {
      const savedStudents = getClassStudents(selectedClass);
      setStudents(savedStudents);
      setStudentInfoMap(new Map());

      // 저장된 학생이 있으면 자동으로 정보 불러오기
      if (savedStudents.length > 0 && apiKey) {
        loadStudentInfoAuto(savedStudents);
      }
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
      if (parsedStudents.length > 0 && apiKey) {
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
    if (!apiKey || students.length === 0) return;

    setLoading(true);
    setLoadingProgress({ current: 0, total: students.length });

    try {
      const codes = students.map(s => s.code);
      const results = await getMultipleStudentsInfo(apiKey, codes, (current, total) => {
        setLoadingProgress({ current, total });
      });
      setStudentInfoMap(results);
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

  const avgCookies = studentInfoMap.size > 0
    ? Math.round(totalCookies / studentInfoMap.size)
    : 0;

  const loadedCount = Array.from(studentInfoMap.values()).filter(v => v !== null).length;

  // 선택된 클래스 정보
  const selectedClassInfo = classes.find(c => c.name === selectedClass);

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
            <div className="flex items-center gap-4">
              <Select value={selectedClass || ''} onValueChange={handleClassSelect}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="클래스를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.name} value={cls.name}>
                      {cls.name} ({cls.cookies} 쿠키)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={refreshClasses}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {selectedClassInfo && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-500">총 쿠키</p>
                    <p className="text-xl font-bold">{selectedClassInfo.totalCookies || selectedClassInfo.cookies}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">남은 쿠키</p>
                    <p className="text-xl font-bold text-green-600">{selectedClassInfo.cookies}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">사용한 쿠키</p>
                    <p className="text-xl font-bold text-orange-600">{selectedClassInfo.usedCookies || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CSV 업로드 (클래스 선택 시에만 표시) */}
        {selectedClass && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                학생 목록 관리
              </CardTitle>
              <CardDescription>
                CSV 파일로 학생 목록을 업로드하거나 템플릿을 다운로드하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => downloadCsvTemplate(selectedClass)}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  CSV 템플릿 다운로드
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  CSV 업로드
                </Button>

                {students.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => exportStudentsToCsv(students, selectedClass)}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      현재 목록 내보내기
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleClearStudents}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      초기화
                    </Button>
                  </>
                )}
              </div>

              {uploadError && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  {uploadError}
                </div>
              )}

              {uploadSuccess && (
                <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {uploadSuccess}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 학생 목록 */}
        {selectedClass && students.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    학생 목록 ({students.length}명)
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

              {/* 학생 테이블 */}
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
            </CardContent>
          </Card>
        )}

        {/* 학생이 없을 때 안내 */}
        {selectedClass && students.length === 0 && (
          <Card className="p-12 text-center">
            <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">등록된 학생이 없습니다</h3>
            <p className="text-gray-500 mb-4">
              CSV 파일을 업로드하여 학생 목록을 등록하세요
            </p>
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => downloadCsvTemplate(selectedClass)}
              >
                <Download className="w-4 h-4 mr-2" />
                템플릿 다운로드
              </Button>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                CSV 업로드
              </Button>
            </div>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
