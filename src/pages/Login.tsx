import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { findStudentByCode } from '../services/sheets';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { GraduationCap, User, Loader2, KeyRound, Hash } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const { loginAsTeacher, loginAsStudent, sheetsUrl, setSheetsUrl, setStudentClassName } = useAuth();

  // 교사 로그인 상태
  const [teacherSheetsUrl, setTeacherSheetsUrl] = useState(sheetsUrl || '');
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState('');

  // 학생 로그인 상태
  const [studentCode, setStudentCode] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');

  // 교사 로그인 핸들러
  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError('');

    if (!teacherSheetsUrl.trim()) {
      setTeacherError('Google Sheets URL을 입력해주세요.');
      return;
    }

    setTeacherLoading(true);

    try {
      // Sheets URL 먼저 저장
      setSheetsUrl(teacherSheetsUrl.trim());

      // Sheets 연결 테스트 & 클래스 목록 가져오기
      const { testSheetsConnection, getClassListFromSheets } = await import('../services/sheets');
      const testResult = await testSheetsConnection();

      if (!testResult.success) {
        setTeacherError('Sheets 연결에 실패했습니다. URL을 확인해주세요.');
        return;
      }

      // Sheets에서 클래스 목록 가져오기
      const classListResult = await getClassListFromSheets();

      if (!classListResult.success) {
        setTeacherError('클래스 목록을 불러올 수 없습니다.');
        return;
      }

      // 교사로 로그인 (클래스 목록과 함께)
      const result = await loginAsTeacher('SHEETS_BASED_AUTH', classListResult.data || []);
      if (result.success) {
        onLoginSuccess();
      } else {
        setTeacherError(result.message);
      }
    } catch (error) {
      setTeacherError('로그인 중 오류가 발생했습니다.');
    } finally {
      setTeacherLoading(false);
    }
  };

  // 학생 로그인 핸들러
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');

    if (!studentCode.trim()) {
      setStudentError('학생 코드를 입력해주세요.');
      return;
    }

    // Sheets URL 확인
    if (!sheetsUrl) {
      setStudentError('선생님이 아직 시스템을 설정하지 않았습니다. 선생님께 문의하세요.');
      return;
    }

    setStudentLoading(true);

    try {
      // Sheets에서 학생 찾기 (API 키 불필요)
      const result = await findStudentByCode(studentCode.trim().toUpperCase());

      if (result.success && result.data) {
        // 학급명 저장
        setStudentClassName(result.data.className);
        loginAsStudent(studentCode.trim().toUpperCase());
        onLoginSuccess();
      } else {
        setStudentError(result.message || '학생 코드를 찾을 수 없습니다. 선생님께 확인해주세요.');
      }
    } catch (error) {
      setStudentError('로그인 중 오류가 발생했습니다.');
    } finally {
      setStudentLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">다했니?</CardTitle>
          <CardDescription>학습 루틴 게임화 시스템</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="student" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                학생
              </TabsTrigger>
              <TabsTrigger value="teacher" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                교사
              </TabsTrigger>
            </TabsList>

            {/* 학생 로그인 */}
            <TabsContent value="student">
              <form onSubmit={handleStudentLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    학생 코드
                  </label>
                  <Input
                    type="text"
                    placeholder="예: DAX96V5UG"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                    className="uppercase"
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">
                    선생님께 받은 학생 코드를 입력하세요.
                  </p>
                </div>

                {studentError && (
                  <p className="text-sm text-red-500">{studentError}</p>
                )}

                <Button type="submit" className="w-full" disabled={studentLoading}>
                  {studentLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      확인 중...
                    </>
                  ) : (
                    '로그인'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* 교사 로그인 */}
            <TabsContent value="teacher">
              <form onSubmit={handleTeacherLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    📊 Google Sheets Web App URL
                  </label>
                  <Input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={teacherSheetsUrl}
                    onChange={(e) => setTeacherSheetsUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Apps Script를 배포한 Web App URL을 입력하세요.
                    <br />
                    💡 API 키는 Google Sheets의 [설정] 시트에 입력되어 있어야 합니다.
                  </p>
                </div>

                {teacherError && (
                  <p className="text-sm text-red-500">{teacherError}</p>
                )}

                <Button type="submit" className="w-full" disabled={teacherLoading}>
                  {teacherLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      확인 중...
                    </>
                  ) : (
                    '로그인'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
