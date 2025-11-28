import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getClassList } from '../services/api';
import { findStudentClass } from '../services/sheets';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { GraduationCap, User, Loader2, KeyRound, Hash } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const { loginAsTeacher, loginAsStudent, sheetsUrl, setSheetsUrl, setStudentClassName, apiKey: savedApiKey } = useAuth();

  // 교사 로그인 상태
  const [apiKey, setApiKey] = useState('');
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

    if (!apiKey.trim()) {
      setTeacherError('API 키를 입력해주세요.');
      return;
    }

    if (!teacherSheetsUrl.trim()) {
      setTeacherError('Google Sheets URL을 입력해주세요.');
      return;
    }

    setTeacherLoading(true);

    try {
      const result = await loginAsTeacher(apiKey.trim());
      if (result.success) {
        // Sheets URL 저장
        setSheetsUrl(teacherSheetsUrl.trim());
        onLoginSuccess();
      } else {
        setTeacherError(result.message);
      }
    } catch {
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
      // 다했니 API로 클래스 목록 가져오기
      // 참고: savedApiKey가 있으면 사용, 없으면 Sheets에서만 조회
      let classNames: string[] = [];

      if (savedApiKey) {
        const response = await getClassList(savedApiKey);
        if (response.result && response.data) {
          classNames = response.data.map(c => c.name);
        }
      }

      // 클래스 목록이 없으면 일단 로그인만 진행 (나중에 수동 선택)
      if (classNames.length === 0) {
        loginAsStudent(studentCode.trim().toUpperCase());
        onLoginSuccess();
        return;
      }

      // Sheets에서 학생 찾기
      const result = await findStudentClass(studentCode.trim().toUpperCase(), classNames);

      if (result) {
        // 학급명 저장
        setStudentClassName(result.className);
        loginAsStudent(studentCode.trim().toUpperCase());
        onLoginSuccess();
      } else {
        setStudentError('학생 코드를 찾을 수 없습니다. 선생님께 확인해주세요.');
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
                  <label className="text-sm font-medium flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    다했니 API 키
                  </label>
                  <Input
                    type="password"
                    placeholder="API 키를 입력하세요"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    dahandin.com에서 발급받은 API 키를 입력하세요.
                  </p>
                </div>

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
