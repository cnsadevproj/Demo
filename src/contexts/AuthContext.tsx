// src/contexts/AuthContext.tsx
// Firebase 기반 인증 컨텍스트

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  User
} from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  getTeacher,
  createTeacher,
  findStudentByCode,
  getClasses,
  updateTeacher,
  Teacher,
  Student,
  ClassInfo
} from '../services/firestoreApi';

// 사용자 역할
export type UserRole = 'teacher' | 'student' | null;

// 인증 컨텍스트 타입
interface AuthContextType {
  // 공통
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;

  // 선생님용
  user: User | null;
  teacher: Teacher | null;
  classes: ClassInfo[];
  selectedClass: string | null;
  selectClass: (classId: string) => void;
  loginAsTeacher: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  registerAsTeacher: (
    email: string,
    password: string,
    name: string,
    schoolName: string,
    dahandinApiKey: string
  ) => Promise<{ success: boolean; message: string }>;
  refreshClasses: () => Promise<void>;
  updateTeacherEmail: (newEmail: string, currentPassword: string) => Promise<{ success: boolean; message: string }>;
  refreshTeacher: () => Promise<void>;

  // 학생용
  student: Student | null;
  studentTeacherId: string | null;
  studentTeacher: Teacher | null;
  loginAsStudent: (code: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// localStorage 키
const STORAGE_KEYS = {
  ROLE: 'dahandin_role',
  SELECTED_CLASS: 'dahandin_selected_class',
  STUDENT_CODE: 'dahandin_student_code',
  STUDENT_TEACHER_ID: 'dahandin_student_teacher_id'
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // 공통 상태
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 선생님 상태
  const [user, setUser] = useState<User | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  // 학생 상태
  const [student, setStudent] = useState<Student | null>(null);
  const [studentTeacherId, setStudentTeacherId] = useState<string | null>(null);
  const [studentTeacher, setStudentTeacher] = useState<Teacher | null>(null);

  // Firebase Auth 상태 감지 (선생님)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 선생님 로그인 상태
        setUser(firebaseUser);
        
        // Firestore에서 선생님 정보 가져오기
        const teacherData = await getTeacher(firebaseUser.uid);
        if (teacherData) {
          setTeacher(teacherData);
          setRole('teacher');
          
          // 학급 목록 가져오기
          const classesData = await getClasses(firebaseUser.uid);
          setClasses(classesData);
          
          // 저장된 선택 학급 복원
          const savedClass = localStorage.getItem(STORAGE_KEYS.SELECTED_CLASS);
          if (savedClass) {
            setSelectedClass(savedClass);
          }
        }
      } else {
        // 로그아웃 상태 - 학생 로그인 확인
        const savedRole = localStorage.getItem(STORAGE_KEYS.ROLE);
        const savedStudentCode = localStorage.getItem(STORAGE_KEYS.STUDENT_CODE);
        const savedTeacherId = localStorage.getItem(STORAGE_KEYS.STUDENT_TEACHER_ID);
        
        if (savedRole === 'student' && savedStudentCode && savedTeacherId) {
          // 학생 세션 복원
          const result = await findStudentByCode(savedStudentCode);
          if (result) {
            setStudent(result.student);
            setStudentTeacherId(result.teacherId);
            setStudentTeacher(result.teacher);
            setRole('student');
          } else {
            // 학생 정보 없음 - 로그아웃 처리
            clearStudentSession();
          }
        } else {
          setUser(null);
          setTeacher(null);
          setRole(null);
        }
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 학생 세션 정리
  const clearStudentSession = () => {
    setStudent(null);
    setStudentTeacherId(null);
    setStudentTeacher(null);
    setRole(null);
    localStorage.removeItem(STORAGE_KEYS.ROLE);
    localStorage.removeItem(STORAGE_KEYS.STUDENT_CODE);
    localStorage.removeItem(STORAGE_KEYS.STUDENT_TEACHER_ID);
  };

  // 선생님 회원가입
  const registerAsTeacher = async (
    email: string,
    password: string,
    name: string,
    schoolName: string,
    dahandinApiKey: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Firebase Auth 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Firestore에 선생님 정보 저장
      await createTeacher(
        userCredential.user.uid,
        email,
        name,
        schoolName,
        dahandinApiKey
      );
      
      return { success: true, message: '회원가입이 완료되었습니다!' };
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let message = '회원가입에 실패했습니다.';
      if (error.code === 'auth/email-already-in-use') {
        message = '이미 사용 중인 이메일입니다.';
      } else if (error.code === 'auth/weak-password') {
        message = '비밀번호는 6자 이상이어야 합니다.';
      } else if (error.code === 'auth/invalid-email') {
        message = '유효하지 않은 이메일 형식입니다.';
      }
      
      return { success: false, message };
    }
  };

  // 선생님 로그인
  const loginAsTeacher = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem(STORAGE_KEYS.ROLE, 'teacher');
      return { success: true, message: '로그인 성공!' };
    } catch (error: any) {
      console.error('Login error:', error);
      
      let message = '로그인에 실패했습니다.';
      if (error.code === 'auth/user-not-found') {
        message = '등록되지 않은 이메일입니다.';
      } else if (error.code === 'auth/wrong-password') {
        message = '비밀번호가 올바르지 않습니다.';
      } else if (error.code === 'auth/invalid-email') {
        message = '유효하지 않은 이메일 형식입니다.';
      } else if (error.code === 'auth/invalid-credential') {
        message = '이메일 또는 비밀번호가 올바르지 않습니다.';
      }
      
      return { success: false, message };
    }
  };

  // 학생 로그인
  const loginAsStudent = async (
    code: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await findStudentByCode(code);
      
      if (!result) {
        return { success: false, message: '학생 코드를 찾을 수 없습니다.' };
      }
      
      setStudent(result.student);
      setStudentTeacherId(result.teacherId);
      setStudentTeacher(result.teacher);
      setRole('student');
      
      // 세션 저장
      localStorage.setItem(STORAGE_KEYS.ROLE, 'student');
      localStorage.setItem(STORAGE_KEYS.STUDENT_CODE, code);
      localStorage.setItem(STORAGE_KEYS.STUDENT_TEACHER_ID, result.teacherId);
      
      return { success: true, message: '로그인 성공!' };
    } catch (error) {
      console.error('Student login error:', error);
      return { success: false, message: '로그인에 실패했습니다.' };
    }
  };

  // 로그아웃
  const logout = async () => {
    if (role === 'teacher') {
      await signOut(auth);
      setUser(null);
      setTeacher(null);
      setClasses([]);
      setSelectedClass(null);
      localStorage.removeItem(STORAGE_KEYS.ROLE);
      localStorage.removeItem(STORAGE_KEYS.SELECTED_CLASS);
    } else {
      clearStudentSession();
    }
    setRole(null);
  };

  // 학급 선택
  const selectClass = (classId: string) => {
    setSelectedClass(classId);
    localStorage.setItem(STORAGE_KEYS.SELECTED_CLASS, classId);
  };

  // 학급 목록 새로고침
  const refreshClasses = async () => {
    if (user) {
      const classesData = await getClasses(user.uid);
      setClasses(classesData);
    }
  };

  // 교사 정보 새로고침
  const refreshTeacher = async () => {
    if (user) {
      const teacherData = await getTeacher(user.uid);
      if (teacherData) {
        setTeacher(teacherData);
      }
    }
  };

  // 이메일 변경
  const updateTeacherEmail = async (
    newEmail: string,
    currentPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      if (!user || !teacher) {
        return { success: false, message: '로그인이 필요합니다.' };
      }

      // 현재 비밀번호로 재인증
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Firebase Auth 이메일 업데이트
      await updateEmail(user, newEmail);

      // Firestore 교사 정보 업데이트
      await updateTeacher(user.uid, { email: newEmail });

      // 로컬 상태 업데이트
      setTeacher({ ...teacher, email: newEmail });

      return { success: true, message: '이메일이 성공적으로 변경되었습니다.' };
    } catch (error: any) {
      console.error('Update email error:', error);

      let message = '이메일 변경에 실패했습니다.';
      if (error.code === 'auth/wrong-password') {
        message = '현재 비밀번호가 올바르지 않습니다.';
      } else if (error.code === 'auth/invalid-email') {
        message = '유효하지 않은 이메일 형식입니다.';
      } else if (error.code === 'auth/email-already-in-use') {
        message = '이미 사용 중인 이메일입니다.';
      } else if (error.code === 'auth/requires-recent-login') {
        message = '보안을 위해 다시 로그인 후 시도해주세요.';
      }

      return { success: false, message };
    }
  };

  const value: AuthContextType = {
    // 공통
    role,
    isAuthenticated: role !== null,
    isLoading,
    logout,

    // 선생님용
    user,
    teacher,
    classes,
    selectedClass,
    selectClass,
    loginAsTeacher,
    registerAsTeacher,
    refreshClasses,
    updateTeacherEmail,
    refreshTeacher,

    // 학생용
    student,
    studentTeacherId,
    studentTeacher,
    loginAsStudent
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