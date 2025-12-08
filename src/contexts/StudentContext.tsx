import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  StudentProfile,
  DEFAULT_PROFILE,
  Wish,
  AttendanceRecord,
} from '../types/student';

// 로컬 스토리지 키
const STORAGE_KEYS = {
  PROFILES: 'dahandin_student_profiles',
  WISHES: 'dahandin_wishes',
  ATTENDANCE: 'dahandin_attendance',
  CLASS_GROUPS: 'dahandin_class_groups',
};

// 학급 그룹 타입 (같은 그룹끼리 소원 공유)
interface ClassGroup {
  id: string;
  name: string;
  classIds: string[];
  createdAt: string;
}

interface StudentContextType {
  // 프로필 관리
  profiles: Map<string, StudentProfile>;
  getProfile: (studentCode: string) => StudentProfile;
  updateProfile: (studentCode: string, updates: Partial<StudentProfile>) => void;

  // 소원 관리
  wishes: Wish[];
  addWish: (classId: string, studentCode: string, studentName: string, content: string) => Wish | null;
  likeWish: (wishId: string, studentCode: string) => void;
  unlikeWish: (wishId: string, studentCode: string) => void;
  grantWish: (wishId: string, message: string) => void;
  deleteWish: (wishId: string) => void;
  getClassWishes: (classId: string) => Wish[];
  getGroupedClassWishes: (classId: string) => Wish[];
  getTodayWish: (classId: string, studentCode: string) => Wish | null;

  // 학급 그룹 관리
  classGroups: ClassGroup[];
  addClassGroup: (name: string, classIds: string[]) => ClassGroup;
  updateClassGroup: (groupId: string, classIds: string[]) => void;
  deleteClassGroup: (groupId: string) => void;
  getGroupForClass: (classId: string) => ClassGroup | null;

  // 출석 관리
  attendance: AttendanceRecord[];
  checkAttendance: (classId: string, studentCode: string) => boolean;
  isAttendedToday: (classId: string, studentCode: string) => boolean;
  getAttendanceStats: (classId: string, studentCode: string, days: number) => { total: number; streak: number };
}

const StudentContext = createContext<StudentContextType | null>(null);

export function StudentProvider({ children }: { children: React.ReactNode }) {
  // 프로필 상태
  const [profiles, setProfiles] = useState<Map<string, StudentProfile>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILES);
    if (saved) {
      const parsed = JSON.parse(saved);
      return new Map(Object.entries(parsed));
    }
    return new Map();
  });

  // 소원 상태
  const [wishes, setWishes] = useState<Wish[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WISHES);
    return saved ? JSON.parse(saved) : [];
  });

  // 출석 상태
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return saved ? JSON.parse(saved) : [];
  });

  // 학급 그룹 상태
  const [classGroups, setClassGroups] = useState<ClassGroup[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLASS_GROUPS);
    return saved ? JSON.parse(saved) : [];
  });

  // 로컬 스토리지 동기화
  useEffect(() => {
    const profilesObj = Object.fromEntries(profiles);
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profilesObj));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WISHES, JSON.stringify(wishes));
  }, [wishes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLASS_GROUPS, JSON.stringify(classGroups));
  }, [classGroups]);

  // 프로필 가져오기
  const getProfile = useCallback((studentCode: string): StudentProfile => {
    const existing = profiles.get(studentCode);
    if (existing) return existing;
    return { studentCode, ...DEFAULT_PROFILE };
  }, [profiles]);

  // 프로필 업데이트
  const updateProfile = useCallback((studentCode: string, updates: Partial<StudentProfile>) => {
    setProfiles(prev => {
      const newMap = new Map(prev);
      const existing = prev.get(studentCode) || { studentCode, ...DEFAULT_PROFILE };
      newMap.set(studentCode, {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      return newMap;
    });
  }, []);

  // 오늘 날짜
  const getToday = () => new Date().toISOString().split('T')[0];

  // 소원 추가 (하루 1회)
  const addWish = useCallback((
    classId: string,
    studentCode: string,
    studentName: string,
    content: string
  ): Wish | null => {
    const today = getToday();

    // 오늘 이미 소원을 적었는지 확인
    const existingToday = wishes.find(
      w => w.classId === classId && w.studentCode === studentCode && w.createdAt.startsWith(today)
    );

    if (existingToday) {
      return null; // 하루 1회 제한
    }

    const newWish: Wish = {
      id: `wish_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      classId,
      studentCode,
      studentName,
      content: content.slice(0, 50), // 최대 50자
      createdAt: new Date().toISOString(),
      likes: [],
      isGranted: false,
    };

    setWishes(prev => [newWish, ...prev]);
    return newWish;
  }, [wishes]);

  // 소원 좋아요
  const likeWish = useCallback((wishId: string, studentCode: string) => {
    setWishes(prev => prev.map(wish => {
      if (wish.id === wishId && !wish.likes.includes(studentCode)) {
        return { ...wish, likes: [...wish.likes, studentCode] };
      }
      return wish;
    }));
  }, []);

  // 소원 좋아요 취소
  const unlikeWish = useCallback((wishId: string, studentCode: string) => {
    setWishes(prev => prev.map(wish => {
      if (wish.id === wishId) {
        return { ...wish, likes: wish.likes.filter(code => code !== studentCode) };
      }
      return wish;
    }));
  }, []);

  // 소원 선정 (교사)
  const grantWish = useCallback((wishId: string, message: string) => {
    setWishes(prev => prev.map(wish => {
      if (wish.id === wishId) {
        return { ...wish, isGranted: true, grantedMessage: message };
      }
      return wish;
    }));
  }, []);

  // 소원 삭제
  const deleteWish = useCallback((wishId: string) => {
    setWishes(prev => prev.filter(wish => wish.id !== wishId));
  }, []);

  // 클래스 소원 목록
  const getClassWishes = useCallback((classId: string): Wish[] => {
    return wishes
      .filter(w => w.classId === classId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [wishes]);

  // 그룹에 속한 학급인지 확인하고 해당 그룹 반환
  const getGroupForClass = useCallback((classId: string): ClassGroup | null => {
    return classGroups.find(group => group.classIds.includes(classId)) || null;
  }, [classGroups]);

  // 그룹된 학급들의 소원 목록 (같은 그룹이면 소원 공유)
  const getGroupedClassWishes = useCallback((classId: string): Wish[] => {
    const group = getGroupForClass(classId);
    if (group) {
      // 그룹에 속한 모든 학급의 소원 반환
      return wishes
        .filter(w => group.classIds.includes(w.classId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    // 그룹이 없으면 해당 학급 소원만 반환
    return getClassWishes(classId);
  }, [wishes, getGroupForClass, getClassWishes]);

  // 학급 그룹 추가
  const addClassGroup = useCallback((name: string, classIds: string[]): ClassGroup => {
    const newGroup: ClassGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      classIds,
      createdAt: new Date().toISOString(),
    };
    setClassGroups(prev => [...prev, newGroup]);
    return newGroup;
  }, []);

  // 학급 그룹 수정
  const updateClassGroup = useCallback((groupId: string, classIds: string[]) => {
    setClassGroups(prev => prev.map(group =>
      group.id === groupId ? { ...group, classIds } : group
    ));
  }, []);

  // 학급 그룹 삭제
  const deleteClassGroup = useCallback((groupId: string) => {
    setClassGroups(prev => prev.filter(group => group.id !== groupId));
  }, []);

  // 오늘 내 소원
  const getTodayWish = useCallback((classId: string, studentCode: string): Wish | null => {
    const today = getToday();
    return wishes.find(
      w => w.classId === classId && w.studentCode === studentCode && w.createdAt.startsWith(today)
    ) || null;
  }, [wishes]);

  // 출석 체크
  const checkAttendance = useCallback((classId: string, studentCode: string): boolean => {
    const today = getToday();

    // 이미 출석했는지 확인
    const alreadyChecked = attendance.some(
      a => a.classId === classId && a.studentCode === studentCode && a.date === today
    );

    if (alreadyChecked) {
      return false;
    }

    const newRecord: AttendanceRecord = {
      id: `att_${Date.now()}`,
      classId,
      studentCode,
      date: today,
      createdAt: new Date().toISOString(),
    };

    setAttendance(prev => [...prev, newRecord]);
    return true;
  }, [attendance]);

  // 오늘 출석했는지
  const isAttendedToday = useCallback((classId: string, studentCode: string): boolean => {
    const today = getToday();
    return attendance.some(
      a => a.classId === classId && a.studentCode === studentCode && a.date === today
    );
  }, [attendance]);

  // 출석 통계
  const getAttendanceStats = useCallback((
    classId: string,
    studentCode: string,
    days: number
  ): { total: number; streak: number } => {
    const studentAttendance = attendance
      .filter(a => a.classId === classId && a.studentCode === studentCode)
      .map(a => a.date)
      .sort((a, b) => b.localeCompare(a)); // 최신순

    const total = studentAttendance.length;

    // 연속 출석 계산
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      if (studentAttendance.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        // 오늘이 아닌데 빠진 날이 있으면 연속 끊김
        break;
      }
    }

    return { total, streak };
  }, [attendance]);

  const value: StudentContextType = {
    profiles,
    getProfile,
    updateProfile,
    wishes,
    addWish,
    likeWish,
    unlikeWish,
    grantWish,
    deleteWish,
    getClassWishes,
    getGroupedClassWishes,
    getTodayWish,
    classGroups,
    addClassGroup,
    updateClassGroup,
    deleteClassGroup,
    getGroupForClass,
    attendance,
    checkAttendance,
    isAttendedToday,
    getAttendanceStats,
  };

  return (
    <StudentContext.Provider value={value}>
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent() {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
}
