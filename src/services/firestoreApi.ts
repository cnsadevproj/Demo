// src/services/firestoreApi.ts
// Firestore 데이터베이스 연동 API

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp,
  collectionGroup
} from 'firebase/firestore';
import { db } from './firebase';

// ========================================
// 타입 정의
// ========================================

// 선생님 정보
export interface Teacher {
  uid: string;
  email: string;
  name: string;
  schoolName: string;
  dahandinApiKey: string;
  createdAt: Timestamp;
}

// 뱃지 정보
export interface Badge {
  hasBadge: boolean;
  imgUrl: string;
  title: string;
}

// 학생 정보
export interface Student {
  code: string;
  number: number;
  name: string;
  classId: string;
  teacherId: string;
  cookie: number;
  usedCookie: number;
  totalCookie: number;
  chocoChips: number;
  previousCookie: number;
  profile: {
    emojiCode: string;
    title: string;
    titleColorCode: string;
    borderCode?: string; // deprecated - 더이상 사용하지 않음
    nameEffectCode: string;
    backgroundCode: string;
    buttonBorderCode?: string;
    buttonFillCode?: string;
    animationCode?: string;
    titlePermitActive?: boolean; // 칭호권 활성화 여부
    profileBadgeKey?: string; // 프로필에 표시할 뱃지 키
  };
  ownedItems: string[];
  badges?: Record<string, Badge>;
  lastUpdate: Timestamp | null;
  // 소원 streak 관련
  wishStreak?: number;
  bestWishStreak?: number;
  lastWishDate?: Timestamp | null;
}

// 학급 정보
export interface ClassInfo {
  id: string;
  name: string;
  studentCount: number;
  active: boolean;
  teacherId: string;
  createdAt: Timestamp;
  lastCookieRefresh?: Timestamp | null;
}

// 새로고침 간격 (4시간 = 4 * 60 * 60 * 1000 밀리초)
const REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000;

// 팀 정보
export interface Team {
  teamId: string;
  teamName: string;
  flag: string;
  members: string[];
  teamCookie: number;
}

// 소원 정보
export interface Wish {
  id: string;
  studentCode: string;
  studentName: string;
  content: string;
  createdAt: Timestamp;
  likes: string[];
  isGranted: boolean;
  grantedReward: number;  // deprecated - 더이상 사용하지 않음
  grantedMessage?: string; // 선정 시 교사 코멘트
}

// 상점 아이템
export interface ShopItem {
  code: string;
  category: string;
  name: string;
  price: number;
  value: string;
  description: string;
}

// ========================================
// 선생님 API
// ========================================

// 선생님 정보 저장 (회원가입 시)
export async function createTeacher(
  uid: string,
  email: string,
  name: string,
  schoolName: string,
  dahandinApiKey: string
): Promise<void> {
  const teacherRef = doc(db, 'teachers', uid);
  await setDoc(teacherRef, {
    uid,
    email,
    name,
    schoolName,
    dahandinApiKey,
    createdAt: serverTimestamp()
  });
}

// 선생님 정보 조회
export async function getTeacher(uid: string): Promise<Teacher | null> {
  const teacherRef = doc(db, 'teachers', uid);
  const teacherSnap = await getDoc(teacherRef);
  
  if (teacherSnap.exists()) {
    return teacherSnap.data() as Teacher;
  }
  return null;
}

// 선생님 정보 수정
export async function updateTeacher(
  uid: string,
  data: Partial<Pick<Teacher, 'name' | 'schoolName' | 'dahandinApiKey'>>
): Promise<void> {
  const teacherRef = doc(db, 'teachers', uid);
  await updateDoc(teacherRef, data);
}

// ========================================
// 학급 API
// ========================================

// 학급 생성
export async function createClass(
  teacherId: string,
  classId: string,
  className: string
): Promise<void> {
  const classRef = doc(db, 'teachers', teacherId, 'classes', classId);
  await setDoc(classRef, {
    id: classId,
    name: className,
    studentCount: 0,
    active: true,
    teacherId,
    createdAt: serverTimestamp()
  });
}

// 선생님의 학급 목록 조회
export async function getClasses(teacherId: string): Promise<ClassInfo[]> {
  const classesRef = collection(db, 'teachers', teacherId, 'classes');
  const q = query(classesRef, where('active', '==', true));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ClassInfo[];
}

// 학급 정보 수정
export async function updateClass(
  teacherId: string,
  classId: string,
  data: Partial<ClassInfo>
): Promise<void> {
  const classRef = doc(db, 'teachers', teacherId, 'classes', classId);
  await updateDoc(classRef, data);
}

// ========================================
// 학생 API
// ========================================

// 학생 등록
export async function createStudent(
  teacherId: string,
  classId: string,
  student: Omit<Student, 'teacherId' | 'classId' | 'lastUpdate'>
): Promise<void> {
  const studentRef = doc(db, 'teachers', teacherId, 'students', student.code);
  await setDoc(studentRef, {
    ...student,
    teacherId,
    classId,
    lastUpdate: serverTimestamp()
  });
  
  // 학급 학생 수 증가
  const classRef = doc(db, 'teachers', teacherId, 'classes', classId);
  await updateDoc(classRef, {
    studentCount: increment(1)
  });
}

// 학생코드로 학생 찾기 (로그인용) - 모든 선생님의 학생 검색
export async function findStudentByCode(code: string): Promise<{
  student: Student;
  teacherId: string;
  teacher: Teacher;
} | null> {
  // 모든 teachers의 students 서브컬렉션에서 검색
  const teachersRef = collection(db, 'teachers');
  const teachersSnap = await getDocs(teachersRef);
  
  for (const teacherDoc of teachersSnap.docs) {
    const studentRef = doc(db, 'teachers', teacherDoc.id, 'students', code);
    const studentSnap = await getDoc(studentRef);
    
    if (studentSnap.exists()) {
      const student = studentSnap.data() as Student;
      const teacher = teacherDoc.data() as Teacher;
      
      return {
        student,
        teacherId: teacherDoc.id,
        teacher
      };
    }
  }
  
  return null;
}

// 특정 학생 조회
export async function getStudent(
  teacherId: string,
  studentCode: string
): Promise<Student | null> {
  const studentRef = doc(db, 'teachers', teacherId, 'students', studentCode);
  const studentSnap = await getDoc(studentRef);
  
  if (studentSnap.exists()) {
    return studentSnap.data() as Student;
  }
  return null;
}

// 학급의 모든 학생 조회
export async function getClassStudents(
  teacherId: string,
  classId: string
): Promise<Student[]> {
  const studentsRef = collection(db, 'teachers', teacherId, 'students');
  const q = query(studentsRef, where('classId', '==', classId), orderBy('number'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => doc.data()) as Student[];
}

// 학생 정보 수정
export async function updateStudent(
  teacherId: string,
  studentCode: string,
  data: Partial<Student>
): Promise<void> {
  const studentRef = doc(db, 'teachers', teacherId, 'students', studentCode);
  await updateDoc(studentRef, {
    ...data,
    lastUpdate: serverTimestamp()
  });
}

// 학생에게 쿠키 부여 (교사용)
export async function addCookiesToStudent(
  teacherId: string,
  studentCode: string,
  amount: number
): Promise<void> {
  const studentRef = doc(db, 'teachers', teacherId, 'students', studentCode);
  await updateDoc(studentRef, {
    cookie: increment(amount),
    totalCookie: increment(amount),
    lastUpdate: serverTimestamp()
  });
}

// 학생 삭제
export async function deleteStudent(
  teacherId: string,
  classId: string,
  studentCode: string
): Promise<void> {
  const studentRef = doc(db, 'teachers', teacherId, 'students', studentCode);
  await deleteDoc(studentRef);

  // 학급 학생 수 감소
  const classRef = doc(db, 'teachers', teacherId, 'classes', classId);
  await updateDoc(classRef, {
    studentCount: increment(-1)
  });
}

// 학급의 모든 학생 삭제
export async function deleteAllStudents(
  teacherId: string,
  classId: string
): Promise<number> {
  const students = await getClassStudents(teacherId, classId);
  let deletedCount = 0;

  for (const student of students) {
    const studentRef = doc(db, 'teachers', teacherId, 'students', student.code);
    await deleteDoc(studentRef);
    deletedCount++;
  }

  // 학급 학생 수 0으로 설정
  const classRef = doc(db, 'teachers', teacherId, 'classes', classId);
  await updateDoc(classRef, {
    studentCount: 0
  });

  return deletedCount;
}

// 실시간 학생 목록 구독
export function subscribeToClassStudents(
  teacherId: string,
  classId: string,
  callback: (students: Student[]) => void
): () => void {
  const studentsRef = collection(db, 'teachers', teacherId, 'students');
  const q = query(studentsRef, where('classId', '==', classId), orderBy('number'));
  
  return onSnapshot(q, (snapshot) => {
    const students = snapshot.docs.map(doc => doc.data()) as Student[];
    callback(students);
  });
}

// ========================================
// 소원 API
// ========================================

// 오늘 소원을 이미 작성했는지 확인
export async function checkTodayWish(
  teacherId: string,
  classId: string,
  studentCode: string
): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 모든 클래스룸에서 소원 공유 - teacher 레벨에 저장
  const wishesRef = collection(db, 'teachers', teacherId, 'wishes');
  const q = query(wishesRef, where('studentCode', '==', studentCode));
  const snapshot = await getDocs(q);

  return snapshot.docs.some(doc => {
    const wish = doc.data();
    const wishDate = wish.createdAt?.toDate?.();
    if (!wishDate) return false;
    wishDate.setHours(0, 0, 0, 0);
    return wishDate.getTime() === today.getTime();
  });
}

// 소원 추가 (하루 1개 제한)
export async function addWish(
  teacherId: string,
  classId: string,
  studentCode: string,
  studentName: string,
  content: string
): Promise<{ success: boolean; wishId?: string; error?: string }> {
  // 오늘 이미 소원을 작성했는지 확인
  const alreadyWrote = await checkTodayWish(teacherId, classId, studentCode);
  if (alreadyWrote) {
    return { success: false, error: '오늘은 이미 소원을 작성했어요! 내일 다시 도전해주세요.' };
  }

  // 모든 클래스룸에서 소원 공유 - teacher 레벨에 저장
  const wishesRef = collection(db, 'teachers', teacherId, 'wishes');
  const wishRef = doc(wishesRef);

  await setDoc(wishRef, {
    id: wishRef.id,
    studentCode,
    studentName,
    content,
    createdAt: serverTimestamp(),
    likes: [],
    isGranted: false,
    grantedReward: 0
  });

  // 소원 streak 업데이트
  await updateWishStreak(teacherId, studentCode);

  return { success: true, wishId: wishRef.id };
}

// 소원 streak 업데이트
export async function updateWishStreak(
  teacherId: string,
  studentCode: string
): Promise<void> {
  const studentRef = doc(db, 'teachers', teacherId, 'students', studentCode);
  const studentSnap = await getDoc(studentRef);

  if (!studentSnap.exists()) return;

  const student = studentSnap.data();
  const lastWishDate = student.lastWishDate?.toDate?.();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let newStreak = 1;
  let bestStreak = student.bestWishStreak || 0;

  if (lastWishDate) {
    lastWishDate.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 어제 소원을 작성했으면 streak 연속
    if (lastWishDate.getTime() === yesterday.getTime()) {
      newStreak = (student.wishStreak || 0) + 1;
    }
  }

  if (newStreak > bestStreak) {
    bestStreak = newStreak;
  }

  await updateDoc(studentRef, {
    wishStreak: newStreak,
    bestWishStreak: bestStreak,
    lastWishDate: serverTimestamp()
  });
}

// 소원 목록 조회 (모든 클래스룸 공유)
export async function getWishes(
  teacherId: string,
  classId: string
): Promise<Wish[]> {
  // 모든 클래스룸에서 소원 공유 - teacher 레벨에서 조회
  const wishesRef = collection(db, 'teachers', teacherId, 'wishes');
  const q = query(wishesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => doc.data()) as Wish[];
}

// 소원 좋아요 (모든 클래스룸 공유)
export async function likeWish(
  teacherId: string,
  classId: string,
  wishId: string,
  studentCode: string
): Promise<void> {
  const wishRef = doc(db, 'teachers', teacherId, 'wishes', wishId);
  await updateDoc(wishRef, {
    likes: arrayUnion(studentCode)
  });
}

// 소원 좋아요 취소 (모든 클래스룸 공유)
export async function unlikeWish(
  teacherId: string,
  classId: string,
  wishId: string,
  studentCode: string
): Promise<void> {
  const wishRef = doc(db, 'teachers', teacherId, 'wishes', wishId);
  await updateDoc(wishRef, {
    likes: arrayRemove(studentCode)
  });
}

// 소원 선정 (모든 클래스룸 공유)
export async function grantWish(
  teacherId: string,
  classId: string,
  wishId: string,
  message: string
): Promise<void> {
  const wishRef = doc(db, 'teachers', teacherId, 'wishes', wishId);
  await updateDoc(wishRef, {
    isGranted: true,
    grantedMessage: message
  });
}

// 소원 삭제 (모든 클래스룸 공유)
export async function deleteWish(
  teacherId: string,
  classId: string,
  wishId: string
): Promise<void> {
  const wishRef = doc(db, 'teachers', teacherId, 'wishes', wishId);
  await deleteDoc(wishRef);
}

// 실시간 소원 구독 (모든 클래스룸 공유)
export function subscribeToWishes(
  teacherId: string,
  classId: string,
  callback: (wishes: Wish[]) => void
): () => void {
  const wishesRef = collection(db, 'teachers', teacherId, 'wishes');
  const q = query(wishesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const wishes = snapshot.docs.map(doc => doc.data()) as Wish[];
    callback(wishes);
  });
}

// ========================================
// 팀 API
// ========================================

// 팀 저장 (전체 덮어쓰기)
export async function saveTeams(
  teacherId: string,
  classId: string,
  teams: Team[]
): Promise<void> {
  const teamsRef = collection(db, 'teachers', teacherId, 'classes', classId, 'teams');
  
  // 기존 팀 삭제
  const existingTeams = await getDocs(teamsRef);
  for (const teamDoc of existingTeams.docs) {
    await deleteDoc(teamDoc.ref);
  }
  
  // 새 팀 저장
  for (const team of teams) {
    await setDoc(doc(teamsRef, team.teamId), team);
  }
}

// 팀 목록 조회
export async function getTeams(
  teacherId: string,
  classId: string
): Promise<Team[]> {
  const teamsRef = collection(db, 'teachers', teacherId, 'classes', classId, 'teams');
  const snapshot = await getDocs(teamsRef);

  return snapshot.docs.map(doc => doc.data()) as Team[];
}

// 팀 생성
export async function createTeam(
  teacherId: string,
  classId: string,
  teamName: string,
  flag: string
): Promise<string> {
  const teamsRef = collection(db, 'teachers', teacherId, 'classes', classId, 'teams');
  const teamRef = doc(teamsRef);

  await setDoc(teamRef, {
    teamId: teamRef.id,
    teamName,
    flag,
    members: [],
    teamCookie: 0
  });

  return teamRef.id;
}

// 팀 수정
export async function updateTeam(
  teacherId: string,
  classId: string,
  teamId: string,
  data: Partial<Team>
): Promise<void> {
  const teamRef = doc(db, 'teachers', teacherId, 'classes', classId, 'teams', teamId);
  await updateDoc(teamRef, data);
}

// 팀 삭제
export async function deleteTeam(
  teacherId: string,
  classId: string,
  teamId: string
): Promise<void> {
  const teamRef = doc(db, 'teachers', teacherId, 'classes', classId, 'teams', teamId);
  await deleteDoc(teamRef);
}

// 팀에 멤버 추가
export async function addTeamMember(
  teacherId: string,
  classId: string,
  teamId: string,
  studentCode: string
): Promise<void> {
  const teamRef = doc(db, 'teachers', teacherId, 'classes', classId, 'teams', teamId);
  await updateDoc(teamRef, {
    members: arrayUnion(studentCode)
  });
}

// 팀에서 멤버 제거
export async function removeTeamMember(
  teacherId: string,
  classId: string,
  teamId: string,
  studentCode: string
): Promise<void> {
  const teamRef = doc(db, 'teachers', teacherId, 'classes', classId, 'teams', teamId);
  await updateDoc(teamRef, {
    members: arrayRemove(studentCode)
  });
}

// 팀 쿠키 업데이트
export async function updateTeamCookie(
  teacherId: string,
  classId: string,
  teamId: string,
  cookieChange: number
): Promise<void> {
  const teamRef = doc(db, 'teachers', teacherId, 'classes', classId, 'teams', teamId);
  await updateDoc(teamRef, {
    teamCookie: increment(cookieChange)
  });
}

// ========================================
// 상점 API
// ========================================

// 상점 아이템 목록 조회 (공용)
export async function getShopItems(): Promise<ShopItem[]> {
  const itemsRef = collection(db, 'shop');
  const snapshot = await getDocs(itemsRef);
  
  return snapshot.docs.map(doc => ({
    code: doc.id,
    ...doc.data()
  })) as ShopItem[];
}

// 아이템 구매
export async function purchaseItem(
  teacherId: string,
  studentCode: string,
  itemCode: string,
  price: number
): Promise<void> {
  const studentRef = doc(db, 'teachers', teacherId, 'students', studentCode);

  await updateDoc(studentRef, {
    cookie: increment(-price),
    usedCookie: increment(price),
    ownedItems: arrayUnion(itemCode),
    lastUpdate: serverTimestamp()
  });
}

// 칭호권 활성화
export async function activateTitlePermit(
  teacherId: string,
  studentCode: string
): Promise<void> {
  const studentRef = doc(db, 'teachers', teacherId, 'students', studentCode);

  await updateDoc(studentRef, {
    'profile.titlePermitActive': true,
    lastUpdate: serverTimestamp()
  });
}

// 선생님별 상점 아이템 조회
export async function getTeacherShopItems(teacherId: string): Promise<ShopItem[]> {
  const itemsRef = collection(db, 'teachers', teacherId, 'shop');
  const snapshot = await getDocs(itemsRef);

  return snapshot.docs.map(doc => ({
    code: doc.id,
    ...doc.data()
  })) as ShopItem[];
}

// 상점 아이템 추가
export async function addShopItem(
  teacherId: string,
  item: Omit<ShopItem, 'code'>
): Promise<string> {
  const itemsRef = collection(db, 'teachers', teacherId, 'shop');
  const itemRef = doc(itemsRef);

  await setDoc(itemRef, {
    code: itemRef.id,
    ...item
  });

  return itemRef.id;
}

// 상점 아이템 수정
export async function updateShopItem(
  teacherId: string,
  itemCode: string,
  data: Partial<ShopItem>
): Promise<void> {
  const itemRef = doc(db, 'teachers', teacherId, 'shop', itemCode);
  await updateDoc(itemRef, data);
}

// 상점 아이템 삭제
export async function deleteShopItem(
  teacherId: string,
  itemCode: string
): Promise<void> {
  const itemRef = doc(db, 'teachers', teacherId, 'shop', itemCode);
  await deleteDoc(itemRef);
}

// 상점 아이템 전체 삭제
export async function deleteAllShopItems(teacherId: string): Promise<number> {
  const shopRef = collection(db, 'teachers', teacherId, 'shop');
  const shopSnap = await getDocs(shopRef);

  let deletedCount = 0;
  for (const itemDoc of shopSnap.docs) {
    await deleteDoc(itemDoc.ref);
    deletedCount++;
  }

  return deletedCount;
}

// ========================================
// 프로필 API
// ========================================

// 프로필 저장
export async function saveProfile(
  teacherId: string,
  studentCode: string,
  profile: Partial<Student['profile']>
): Promise<void> {
  const studentRef = doc(db, 'teachers', teacherId, 'students', studentCode);
  
  const updateData: Record<string, unknown> = {
    lastUpdate: serverTimestamp()
  };
  
  for (const [key, value] of Object.entries(profile)) {
    if (value !== undefined) {
      updateData[`profile.${key}`] = value;
    }
  }
  
  await updateDoc(studentRef, updateData);
}

// ========================================
// 잔디(Grass) API
// ========================================

// 잔디 기록 추가
export async function addGrassRecord(
  teacherId: string,
  classId: string,
  studentCode: string,
  cookieChange: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const grassRef = doc(db, 'teachers', teacherId, 'classes', classId, 'grass', today);
  
  const grassSnap = await getDoc(grassRef);
  
  if (grassSnap.exists()) {
    const records = grassSnap.data().records || {};
    const currentData = records[studentCode] || { change: 0, count: 0 };
    
    await updateDoc(grassRef, {
      [`records.${studentCode}`]: {
        change: currentData.change + cookieChange,
        count: currentData.count + 1
      }
    });
  } else {
    await setDoc(grassRef, {
      date: today,
      records: {
        [studentCode]: { change: cookieChange, count: 1 }
      }
    });
  }
}

// 잔디 데이터 조회
export async function getGrassData(
  teacherId: string,
  classId: string,
  studentCode?: string
): Promise<Array<{ date: string; studentCode: string; cookieChange: number; count: number }>> {
  const grassRef = collection(db, 'teachers', teacherId, 'classes', classId, 'grass');
  const snapshot = await getDocs(grassRef);
  
  const grassData: Array<{ date: string; studentCode: string; cookieChange: number; count: number }> = [];
  
  snapshot.docs.forEach(doc => {
    const date = doc.id;
    const records = doc.data().records || {};
    
    for (const [code, data] of Object.entries(records)) {
      if (!studentCode || code === studentCode) {
        const record = data as { change: number; count: number };
        grassData.push({
          date,
          studentCode: code,
          cookieChange: record.change,
          count: record.count
        });
      }
    }
  });
  
  return grassData;
}

// 잔디 데이터 초기화 (전체 삭제)
export async function resetGrassData(
  teacherId: string,
  classId: string
): Promise<{ success: boolean; deletedCount: number }> {
  const grassRef = collection(db, 'teachers', teacherId, 'classes', classId, 'grass');
  const snapshot = await getDocs(grassRef);

  let deletedCount = 0;
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, 'teachers', teacherId, 'classes', classId, 'grass', docSnap.id));
    deletedCount++;
  }

  return { success: true, deletedCount };
}

// ========================================
// 다했니 API 연동
// ========================================

// 다했니 API에서 학급 목록 가져오기
export async function fetchClassroomsFromDahandin(apiKey: string): Promise<Array<{
  name: string;
  totalCookies: number;
  cookies: number;
  usedCookies: number;
}>> {
  const response = await fetch(
    'https://api.dahandin.com/openapi/v1/get/class/list',
    {
      headers: { 'X-API-Key': apiKey }
    }
  );
  
  const data = await response.json();
  
  if (data.result && data.data) {
    return data.data;
  }
  
  throw new Error(data.message || '학급 목록을 가져올 수 없습니다.');
}

// 다했니 API에서 학생 정보 가져오기
export async function fetchStudentFromDahandin(
  apiKey: string,
  studentCode: string
): Promise<{
  cookie: number;
  usedCookie: number;
  totalCookie: number;
  chocoChips: number;
  badges: Record<string, Badge>;
}> {
  const response = await fetch(
    `https://api.dahandin.com/openapi/v1/get/student/total?code=${studentCode}`,
    {
      headers: { 'X-API-Key': apiKey }
    }
  );

  const data = await response.json();

  if (data.result && data.data) {
    return {
      cookie: data.data.cookie || 0,
      usedCookie: data.data.usedCookie || 0,
      totalCookie: data.data.totalCookie || 0,
      chocoChips: data.data.chocoChips || 0,
      badges: data.data.badges || {}
    };
  }

  throw new Error(data.message || '학생 정보를 가져올 수 없습니다.');
}

// 마지막 새로고침 시간 확인
export async function getLastRefreshTime(
  teacherId: string,
  classId: string
): Promise<Date | null> {
  const classRef = doc(db, 'teachers', teacherId, 'classes', classId);
  const classSnap = await getDoc(classRef);

  if (classSnap.exists()) {
    const data = classSnap.data();
    return data.lastCookieRefresh?.toDate?.() || null;
  }
  return null;
}

// 새로고침 가능 여부 확인 (4시간 경과 여부)
export async function canRefreshCookies(
  teacherId: string,
  classId: string
): Promise<{ canRefresh: boolean; remainingMinutes: number }> {
  const lastRefresh = await getLastRefreshTime(teacherId, classId);

  if (!lastRefresh) {
    return { canRefresh: true, remainingMinutes: 0 };
  }

  const now = new Date();
  const timeSinceRefresh = now.getTime() - lastRefresh.getTime();
  const remainingMs = REFRESH_INTERVAL_MS - timeSinceRefresh;

  if (remainingMs <= 0) {
    return { canRefresh: true, remainingMinutes: 0 };
  }

  return {
    canRefresh: false,
    remainingMinutes: Math.ceil(remainingMs / (60 * 1000))
  };
}

// 쿠키 새로고침 (다했니 API에서 가져와서 Firestore에 저장)
// 수동 새로고침은 언제든 가능, 잔디 기록은 4시간마다만 추가
export async function refreshStudentCookies(
  teacherId: string,
  classId: string,
  apiKey: string
): Promise<{ success: boolean; count: number; error?: string }> {
  // 4시간 경과 여부 확인 (잔디 기록 추가 여부 결정용)
  const { canRefresh: canRecordGrass } = await canRefreshCookies(teacherId, classId);

  const students = await getClassStudents(teacherId, classId);
  let updatedCount = 0;

  for (const student of students) {
    try {
      const dahandinData = await fetchStudentFromDahandin(apiKey, student.code);

      // 첫 로드인지 확인 (previousCookie가 0이면 첫 등록 후 첫 동기화)
      const isFirstLoad = student.previousCookie === 0;
      const cookieChange = dahandinData.cookie - student.previousCookie;

      // 학생 정보 업데이트 (뱃지 포함)
      await updateStudent(teacherId, student.code, {
        cookie: dahandinData.cookie,
        usedCookie: dahandinData.usedCookie,
        totalCookie: dahandinData.totalCookie,
        chocoChips: dahandinData.chocoChips,
        previousCookie: dahandinData.cookie,
        badges: dahandinData.badges
      });

      // 잔디 기록 (4시간 경과 시에만, 쿠키가 증가했을 때만, 첫 로드는 제외)
      if (canRecordGrass && cookieChange > 0 && !isFirstLoad) {
        await addGrassRecord(teacherId, classId, student.code, cookieChange);
      }

      updatedCount++;
    } catch (error) {
      console.error(`Failed to refresh ${student.code}:`, error);
    }
  }

  // 잔디 기록이 추가된 경우에만 새로고침 시간 업데이트
  if (canRecordGrass) {
    const classRef = doc(db, 'teachers', teacherId, 'classes', classId);
    await updateDoc(classRef, {
      lastCookieRefresh: serverTimestamp()
    });
  }

  return { success: true, count: updatedCount };
}

// ========================================
// 배틀 API
// ========================================

// 배틀 정보
export interface Battle {
  id: string;
  title: string;
  description: string;
  team1Id: string;
  team2Id: string;
  team1Score: number;
  team2Score: number;
  status: 'pending' | 'ongoing' | 'completed';
  winnerId: string | null;
  reward: number;
  createdAt: Timestamp;
  endedAt: Timestamp | null;
}

// 배틀 생성
export async function createBattle(
  teacherId: string,
  classId: string,
  title: string,
  description: string,
  team1Id: string,
  team2Id: string,
  reward: number
): Promise<string> {
  const battlesRef = collection(db, 'teachers', teacherId, 'classes', classId, 'battles');
  const battleRef = doc(battlesRef);

  await setDoc(battleRef, {
    id: battleRef.id,
    title,
    description,
    team1Id,
    team2Id,
    team1Score: 0,
    team2Score: 0,
    status: 'ongoing',
    winnerId: null,
    reward,
    createdAt: serverTimestamp(),
    endedAt: null
  });

  return battleRef.id;
}

// 배틀 목록 조회
export async function getBattles(
  teacherId: string,
  classId: string
): Promise<Battle[]> {
  const battlesRef = collection(db, 'teachers', teacherId, 'classes', classId, 'battles');
  const q = query(battlesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => doc.data()) as Battle[];
}

// 배틀 점수 업데이트
export async function updateBattleScore(
  teacherId: string,
  classId: string,
  battleId: string,
  team1Score: number,
  team2Score: number
): Promise<void> {
  const battleRef = doc(db, 'teachers', teacherId, 'classes', classId, 'battles', battleId);
  await updateDoc(battleRef, {
    team1Score,
    team2Score
  });
}

// 배틀 종료
export async function endBattle(
  teacherId: string,
  classId: string,
  battleId: string,
  winnerId: string | null
): Promise<void> {
  const battleRef = doc(db, 'teachers', teacherId, 'classes', classId, 'battles', battleId);
  await updateDoc(battleRef, {
    status: 'completed',
    winnerId,
    endedAt: serverTimestamp()
  });
}

// 배틀 삭제
export async function deleteBattle(
  teacherId: string,
  classId: string,
  battleId: string
): Promise<void> {
  const battleRef = doc(db, 'teachers', teacherId, 'classes', classId, 'battles', battleId);
  await deleteDoc(battleRef);
}

// ========================================
// 추가 타입 및 호환 API
// ========================================

// CSV 및 기존 코드 호환용 타입
export interface StoredStudent {
  number: number;
  name: string;
  code: string;
}

// 랭킹용 학생 타입
export interface RankedStudent extends Student {
  rank: number;
}

// 쿠키 랭킹 조회
export async function getCookieRanking(
  teacherId: string,
  classId: string
): Promise<RankedStudent[]> {
  const students = await getClassStudents(teacherId, classId);

  // 쿠키 순으로 정렬
  const sorted = [...students].sort((a, b) => b.cookie - a.cookie);

  // 순위 부여 (동점자 처리)
  let currentRank = 1;
  let previousCookie = -1;

  return sorted.map((student, idx) => {
    if (student.cookie !== previousCookie) {
      currentRank = idx + 1;
    }
    previousCookie = student.cookie;

    return {
      ...student,
      rank: currentRank
    };
  });
}

// 오늘 잔디 여부 확인
export async function checkTodayGrass(
  teacherId: string,
  classId: string,
  studentCode: string
): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const grassRef = doc(db, 'teachers', teacherId, 'classes', classId, 'grass', today);
  const grassSnap = await getDoc(grassRef);

  if (!grassSnap.exists()) {
    return false;
  }

  const records = grassSnap.data().records || {};
  return !!records[studentCode];
}

// 잔디 추가 (미션 완료용)
export async function addGrass(
  teacherId: string,
  classId: string,
  studentCode: string,
  count: number = 1
): Promise<{ success: boolean; message?: string }> {
  try {
    await addGrassRecord(teacherId, classId, studentCode, count);
    return { success: true };
  } catch (error) {
    console.error('Failed to add grass:', error);
    return { success: false, message: '잔디 추가에 실패했습니다.' };
  }
}

// 잔디 데이터 조회 (날짜 배열 형태)
export async function getGrass(
  teacherId: string,
  classId: string,
  studentCode: string
): Promise<Array<{ date: string; count: number }>> {
  const grassData = await getGrassData(teacherId, classId, studentCode);

  return grassData.map(g => ({
    date: g.date,
    count: g.count
  }));
}

// 학생 정보 조회 (다했니 API 호환)
export interface StudentInfo {
  name: string;
  cookie: number;
  usedCookie: number;
  totalCookie: number;
  badges: Record<string, { hasBadge: boolean; imgUrl: string; title: string }>;
}

// 여러 학생 정보 조회 (다했니 API)
export async function getMultipleStudentsInfo(
  apiKey: string,
  codes: string[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, StudentInfo | null>> {
  const results = new Map<string, StudentInfo | null>();

  for (let i = 0; i < codes.length; i++) {
    try {
      const response = await fetch(
        `https://api.dahandin.com/openapi/v1/get/student/total?code=${codes[i]}`,
        { headers: { 'X-API-Key': apiKey } }
      );
      const data = await response.json();

      if (data.result && data.data) {
        results.set(codes[i], {
          name: data.data.name || '',
          cookie: data.data.cookie || 0,
          usedCookie: data.data.usedCookie || 0,
          totalCookie: data.data.totalCookie || 0,
          badges: data.data.badges || {}
        });
      } else {
        results.set(codes[i], null);
      }
    } catch {
      results.set(codes[i], null);
    }

    onProgress?.(i + 1, codes.length);
  }

  return results;
}