// Google Sheets API 연동 서비스
// Apps Script Web App URL

const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycby4H0f81_e4o9yBXVwFG0uF_DRdWZhW5_SnrYEeeAzrEXaZRV5B-217GNcEdj2By4TR/exec';

// API 응답 타입
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// 학생 정보 타입
export interface SheetStudent {
  number: number;
  name: string;
  code: string;
  cookie: number;
  usedCookie: number;
  totalCookie: number;
  chocoChips: number;
  lastUpdate: string | null;
}

// 학급 정보 타입
export interface SheetClass {
  name: string;
  studentCount: number;
}

// 팀 정보 타입
export interface SheetTeam {
  week: number;
  teamId: string;
  teamName: string;
  flag: string;
  members: string[];
  earnedRound: number;
  attackTarget: string;
  attackBet: number;
  defense: number;
}

// 잔디 정보 타입
export interface SheetGrass {
  date: string;
  studentCode: string;
  completed: boolean;
  missionType: string;
}

// 스냅샷 정보 타입
export interface SheetSnapshot {
  week: number;
  studentCode: string;
  teamId: string;
  bMon: number;
  bWed: number;
  earnedRound: number;
  date: string;
}

// API 호출 함수
async function callSheetsApi<T>(action: string, params: Record<string, string> = {}): Promise<ApiResponse<T>> {
  const url = new URL(SHEETS_API_URL);
  url.searchParams.append('action', action);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.append(key, value);
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    console.error('Sheets API 호출 오류:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

// ========================================
// 공개 API 함수들
// ========================================

/**
 * 연결 테스트
 */
export async function pingApi(): Promise<boolean> {
  const result = await callSheetsApi<{ message: string }>('ping');
  return result.success;
}

/**
 * 학급 목록 조회 (교사용)
 */
export async function getClassList(): Promise<SheetClass[]> {
  const result = await callSheetsApi<SheetClass[]>('getClassList');
  return result.success ? result.data || [] : [];
}

/**
 * 학생 찾기 (로그인용) - 모든 학급에서 학생 코드로 검색
 */
export async function findStudent(code: string): Promise<{
  className: string;
  number: number;
  name: string;
  code: string;
} | null> {
  const result = await callSheetsApi<{
    className: string;
    number: number;
    name: string;
    code: string;
  }>('findStudent', { code });

  return result.success ? result.data || null : null;
}

/**
 * 학생 정보 조회
 */
export async function getStudent(code: string, className: string): Promise<SheetStudent | null> {
  const result = await callSheetsApi<SheetStudent>('getStudent', { code, className });
  return result.success ? result.data || null : null;
}

/**
 * 학급 전체 학생 목록 조회
 */
export async function getClassStudents(className: string): Promise<SheetStudent[]> {
  const result = await callSheetsApi<SheetStudent[]>('getClassStudents', { className });
  return result.success ? result.data || [] : [];
}

/**
 * 팀 정보 조회
 */
export async function getTeams(className: string): Promise<SheetTeam[]> {
  const result = await callSheetsApi<SheetTeam[]>('getTeams', { className });
  return result.success ? result.data || [] : [];
}

/**
 * 잔디 데이터 조회
 */
export async function getGrass(code: string, className: string): Promise<SheetGrass[]> {
  const result = await callSheetsApi<SheetGrass[]>('getGrass', { code, className });
  return result.success ? result.data || [] : [];
}

/**
 * 스냅샷 데이터 조회
 */
export async function getSnapshot(className: string, week?: number): Promise<SheetSnapshot[]> {
  const params: Record<string, string> = { className };
  if (week !== undefined) {
    params.week = String(week);
  }
  const result = await callSheetsApi<SheetSnapshot[]>('getSnapshot', params);
  return result.success ? result.data || [] : [];
}

// ========================================
// 쿠키 랭킹 관련 함수
// ========================================

/**
 * 학급 학생들의 쿠키 랭킹 조회
 * @param className 학급명
 * @param useEarnedRound true면 주간 증가량(earnedRound) 기준, false면 총 쿠키 기준
 */
export async function getCookieRanking(
  className: string,
  useEarnedRound: boolean = false,
  week?: number
): Promise<Array<SheetStudent & { rank: number; earnedRound?: number }>> {
  const students = await getClassStudents(className);

  if (useEarnedRound && week !== undefined) {
    // 주간 증가량 기준 랭킹
    const snapshots = await getSnapshot(className, week);
    const snapshotMap = new Map(snapshots.map(s => [s.studentCode, s]));

    const studentsWithEarned = students.map(student => ({
      ...student,
      earnedRound: snapshotMap.get(student.code)?.earnedRound || 0,
    }));

    // earnedRound 기준 정렬
    studentsWithEarned.sort((a, b) => b.earnedRound - a.earnedRound);

    return studentsWithEarned.map((student, index) => ({
      ...student,
      rank: index + 1,
    }));
  } else {
    // 총 쿠키 기준 랭킹
    students.sort((a, b) => b.cookie - a.cookie);

    return students.map((student, index) => ({
      ...student,
      rank: index + 1,
    }));
  }
}

// ========================================
// 로컬 스토리지 캐싱 (선택적)
// ========================================

const CACHE_PREFIX = 'sheets_cache_';
const CACHE_TTL = 5 * 60 * 1000; // 5분

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

function setCachedData<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // 캐시 저장 실패는 무시
  }
}

/**
 * 캐시된 학급 학생 목록 조회
 */
export async function getClassStudentsCached(className: string): Promise<SheetStudent[]> {
  const cacheKey = `students_${className}`;
  const cached = getCachedData<SheetStudent[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const students = await getClassStudents(className);
  if (students.length > 0) {
    setCachedData(cacheKey, students);
  }

  return students;
}

/**
 * 캐시 초기화
 */
export function clearSheetsCache(): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
}
