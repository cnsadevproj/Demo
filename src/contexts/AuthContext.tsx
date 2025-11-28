import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ClassInfo, StoredStudent, ClassStudents, validateApiKey, getClassList } from '../services/api';

// 사용자 역할 타입
export type UserRole = 'teacher' | 'student' | null;

// 인증 컨텍스트 타입
interface AuthContextType {
  // 공통
  role: UserRole;
  isAuthenticated: boolean;
  logout: () => void;

  // Google Sheets
  sheetsUrl: string | null;
  setSheetsUrl: (url: string) => void;

  // 교사용
  apiKey: string | null;
  classes: ClassInfo[];
  selectedClass: string | null;
  classStudentsMap: Record<string, ClassStudents>;
  loginAsTeacher: (apiKey: string) => Promise<{ success: boolean; message: string }>;
  selectClass: (className: string) => void;
  saveClassStudents: (className: string, students: StoredStudent[]) => void;
  getClassStudents: (className: string) => StoredStudent[];
  refreshClasses: () => Promise<void>;

  // 학생용
  studentCode: string | null;
  studentClassName: string | null;
  loginAsStudent: (code: string) => void;
  setStudentClassName: (className: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// localStorage 키
const STORAGE_KEYS = {
  ROLE: 'dahandin_role',
  API_KEY: 'dahandin_api_key',
  STUDENT_CODE: 'dahandin_student_code',
  STUDENT_CLASS_NAME: 'dahandin_student_class_name',
  SELECTED_CLASS: 'dahandin_selected_class',
  CLASS_STUDENTS: 'dahandin_class_students',
  SHEETS_URL: 'dahandin_sheets_url',
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [role, setRole] = useState<UserRole>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [studentCode, setStudentCode] = useState<string | null>(null);
  const [studentClassName, setStudentClassNameState] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [sheetsUrl, setSheetsUrlState] = useState<string | null>(null);
  const [classStudentsMap, setClassStudentsMap] = useState<Record<string, ClassStudents>>({});

  // 초기 로드: localStorage에서 데이터 복원
  useEffect(() => {
    const savedRole = localStorage.getItem(STORAGE_KEYS.ROLE) as UserRole;
    const savedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    const savedStudentCode = localStorage.getItem(STORAGE_KEYS.STUDENT_CODE);
    const savedStudentClassName = localStorage.getItem(STORAGE_KEYS.STUDENT_CLASS_NAME);
    const savedSelectedClass = localStorage.getItem(STORAGE_KEYS.SELECTED_CLASS);
    const savedClassStudents = localStorage.getItem(STORAGE_KEYS.CLASS_STUDENTS);
    const savedSheetsUrl = localStorage.getItem(STORAGE_KEYS.SHEETS_URL);

    // Sheets URL 복원
    if (savedSheetsUrl) {
      setSheetsUrlState(savedSheetsUrl);
    }

    if (savedRole === 'teacher' && savedApiKey) {
      setRole('teacher');
      setApiKey(savedApiKey);
      setSelectedClass(savedSelectedClass);

      if (savedClassStudents) {
        try {
          setClassStudentsMap(JSON.parse(savedClassStudents));
        } catch {
          setClassStudentsMap({});
        }
      }

      // 클래스 목록 새로고침
      getClassList(savedApiKey).then(response => {
        if (response.result && response.data) {
          setClasses(response.data);
        }
      });
    } else if (savedRole === 'student' && savedStudentCode) {
      setRole('student');
      setStudentCode(savedStudentCode);
      setStudentClassNameState(savedStudentClassName);
    }
  }, []);

  // 교사 로그인
  const loginAsTeacher = async (key: string): Promise<{ success: boolean; message: string }> => {
    // Sheets 기반 인증인 경우 (API 키는 Sheets에 있음)
    if (key === 'SHEETS_BASED_AUTH') {
      setRole('teacher');
      setApiKey(null);
      setClasses([]);

      localStorage.setItem(STORAGE_KEYS.ROLE, 'teacher');
      localStorage.removeItem(STORAGE_KEYS.API_KEY);

      // 기존 저장된 학생 데이터 복원
      const savedClassStudents = localStorage.getItem(STORAGE_KEYS.CLASS_STUDENTS);
      if (savedClassStudents) {
        try {
          setClassStudentsMap(JSON.parse(savedClassStudents));
        } catch {
          // 파싱 실패 시 무시
        }
      }

      // 기존 선택된 클래스 복원
      const savedSelectedClass = localStorage.getItem(STORAGE_KEYS.SELECTED_CLASS);
      if (savedSelectedClass) {
        setSelectedClass(savedSelectedClass);
      }

      return { success: true, message: '로그인 성공!' };
    }

    // 기존 API 키 기반 인증
    const response = await validateApiKey(key);

    if (response.result && response.data) {
      setRole('teacher');
      setApiKey(key);
      setClasses(response.data);

      localStorage.setItem(STORAGE_KEYS.ROLE, 'teacher');
      localStorage.setItem(STORAGE_KEYS.API_KEY, key);

      // 기존 저장된 학생 데이터 복원
      const savedClassStudents = localStorage.getItem(STORAGE_KEYS.CLASS_STUDENTS);
      if (savedClassStudents) {
        try {
          setClassStudentsMap(JSON.parse(savedClassStudents));
        } catch {
          // 파싱 실패 시 무시
        }
      }

      // 기존 선택된 클래스 복원
      const savedSelectedClass = localStorage.getItem(STORAGE_KEYS.SELECTED_CLASS);
      if (savedSelectedClass) {
        setSelectedClass(savedSelectedClass);
      }

      return { success: true, message: '로그인 성공!' };
    } else {
      return { success: false, message: response.message || 'API 키가 올바르지 않습니다.' };
    }
  };

  // 학생 로그인
  const loginAsStudent = (code: string) => {
    setRole('student');
    setStudentCode(code);

    localStorage.setItem(STORAGE_KEYS.ROLE, 'student');
    localStorage.setItem(STORAGE_KEYS.STUDENT_CODE, code);
  };

  // 로그아웃
  const logout = () => {
    setRole(null);
    setApiKey(null);
    setStudentCode(null);
    setClasses([]);
    setSelectedClass(null);

    localStorage.removeItem(STORAGE_KEYS.ROLE);
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
    localStorage.removeItem(STORAGE_KEYS.STUDENT_CODE);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_CLASS);
    // 학생 데이터는 유지 (교사가 다시 로그인해도 데이터 보존)
  };

  // 클래스 선택
  const selectClass = (className: string) => {
    setSelectedClass(className);
    localStorage.setItem(STORAGE_KEYS.SELECTED_CLASS, className);
  };

  // 클래스별 학생 저장
  const saveClassStudents = (className: string, students: StoredStudent[]) => {
    const updated = {
      ...classStudentsMap,
      [className]: {
        className,
        students,
        updatedAt: new Date().toISOString(),
      },
    };
    setClassStudentsMap(updated);
    localStorage.setItem(STORAGE_KEYS.CLASS_STUDENTS, JSON.stringify(updated));
  };

  // 클래스별 학생 조회
  const getClassStudents = (className: string): StoredStudent[] => {
    return classStudentsMap[className]?.students || [];
  };

  // 클래스 목록 새로고침
  const refreshClasses = async () => {
    if (apiKey) {
      const response = await getClassList(apiKey);
      if (response.result && response.data) {
        setClasses(response.data);
      }
    }
  };

  // Sheets URL 설정
  const setSheetsUrl = (url: string) => {
    setSheetsUrlState(url);
    localStorage.setItem(STORAGE_KEYS.SHEETS_URL, url);
  };

  // 학생 학급명 설정
  const setStudentClassName = (className: string) => {
    setStudentClassNameState(className);
    localStorage.setItem(STORAGE_KEYS.STUDENT_CLASS_NAME, className);
  };

  const value: AuthContextType = {
    role,
    isAuthenticated: role !== null,
    logout,
    sheetsUrl,
    setSheetsUrl,
    apiKey,
    classes,
    selectedClass,
    classStudentsMap,
    loginAsTeacher,
    selectClass,
    saveClassStudents,
    getClassStudents,
    refreshClasses,
    studentCode,
    studentClassName,
    loginAsStudent,
    setStudentClassName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
