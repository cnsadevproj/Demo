// Google Sheets API 연동 서비스 v2.0
// Apps Script Web App URL - sheets.ts와 동일한 localStorage 키 사용

const STORAGE_KEY = 'dahandin_sheets_url';

// URL을 localStorage에서 가져옴 (sheets.ts와 동기화)
function getSheetsApiUrl(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

// API 응답 타입
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// ========================================
// 학생 정보 타입 (프로필 통합)
// ========================================
export interface SheetStudent {
  number: number;
  name: string;
  code: string;
  cookie: number;
  usedCookie: number;
  totalCookie: number;
  chocoChips: number;
  previousCookie: number;
  // 프로필 정보
  emojiCode: string;
  title: string;
  titleColorCode: string;
  borderCode: string;
  nameEffectCode: string;
  backgroundCode: string;
  ownedItems: string[];
  lastUpdate: string | null;
}

// 학급 정보 타입
export interface SheetClass {
  name: string;
  studentCount: number;
}

// 팀 정보 타입
export interface SheetTeam {
  teamId: string;
  teamName: string;
  flag: string;
  members: string[];
  teamCookie: number;
}

// 잔디 정보 타입
export interface SheetGrass {
  date: string;
  studentCode: string;
  cookieChange: number;
}

// 소원 정보 타입
export interface SheetWish {
  id: string;
  studentCode: string;
  studentName: string;
  content: string;
  createdAt: string;
  likes: string[];
  isGranted: boolean;
  grantedReward: number;
}

// 전투 기록 타입
export interface SheetBattle {
  battleId: string;
  date: string;
  teamId: string;
  attackTarget: string;
  attackBet: number;
  defenseBet: number;
  result: string;
  cookieChange: number;
  roundEarned: number;
}

// 상점 아이템 타입
export interface SheetShopItem {
  code: string;
  category: string;
  name: string;
  price: number;
  value: string;
  description: string;
}

// ========================================
// API 호출 함수
// ========================================
async function callSheetsApi<T>(
  action: string,
  params: Record<string, string> = {},
  method: 'GET' | 'POST' = 'GET',
  body?: unknown
): Promise<ApiResponse<T>> {
  const sheetsUrl = getSheetsApiUrl();

  if (!sheetsUrl) {
    console.error('[SheetsApi] URL이 설정되지 않았습니다. localStorage key:', STORAGE_KEY);
    return {
      success: false,
      message: 'Sheets URL이 설정되지 않았습니다. 먼저 로그인해주세요.',
    };
  }

  const url = new URL(sheetsUrl);
  url.searchParams.append('action', action);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  }

  console.log(`[SheetsApi] 호출: ${action}`, { url: url.toString(), params, method });

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Accept': 'application/json',
      },
    };

    if (method === 'POST' && body) {
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
      };
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      console.error(`[SheetsApi] HTTP 오류: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[SheetsApi] 응답: ${action}`, data);
    return data as ApiResponse<T>;
  } catch (error) {
    console.error('[SheetsApi] 호출 오류:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

// ========================================
// 기본 API 함수들
// ========================================

/**
 * 연결 테스트
 */
export async function pingApi(): Promise<boolean> {
  const result = await callSheetsApi<{ message: string }>('ping');
  return result.success;
}

/**
 * 학급 목록 조회
 */
export async function getClassList(): Promise<SheetClass[]> {
  const result = await callSheetsApi<SheetClass[]>('getClassList');
  return result.success ? result.data || [] : [];
}

/**
 * 학생 찾기 (로그인용)
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
 * 학생 정보 조회 (프로필 포함)
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

// ========================================
// 팀 API
// ========================================

/**
 * 팀 정보 조회
 */
export async function getTeams(className: string): Promise<SheetTeam[]> {
  const result = await callSheetsApi<SheetTeam[]>('getTeams', { className });
  return result.success ? result.data || [] : [];
}

/**
 * 팀 정보 저장
 */
export async function saveTeams(className: string, teams: SheetTeam[]): Promise<boolean> {
  const result = await callSheetsApi<void>('saveTeams', { className }, 'POST', { teams });
  return result.success;
}

// ========================================
// 잔디 API
// ========================================

/**
 * 잔디 데이터 조회
 */
export async function getGrass(className: string, code?: string): Promise<SheetGrass[]> {
  const params: Record<string, string> = { className };
  if (code) params.code = code;
  const result = await callSheetsApi<SheetGrass[]>('getGrass', params);
  return result.success ? result.data || [] : [];
}

/**
 * 오늘 잔디 여부 확인
 */
export async function checkTodayGrass(className: string, code: string): Promise<boolean> {
  const result = await callSheetsApi<{ hasGrass: boolean }>('checkTodayGrass', { className, code });
  return result.success ? result.data?.hasGrass || false : false;
}

/**
 * 잔디 추가 (미션 완료 시)
 */
export async function addGrass(
  className: string,
  code: string,
  cookieChange: number = 1
): Promise<{ success: boolean; message?: string }> {
  const result = await callSheetsApi<{ date: string; studentCode: string; cookieChange: number }>(
    'addGrass',
    { className, code, cookieChange: String(cookieChange) },
    'POST'
  );
  return { success: result.success, message: result.message };
}

// ========================================
// 소원 API
// ========================================

/**
 * 소원 목록 조회
 */
export async function getWishes(className: string): Promise<SheetWish[]> {
  const result = await callSheetsApi<SheetWish[]>('getWishes', { className });
  return result.success ? result.data || [] : [];
}

/**
 * 오늘 작성한 소원 조회
 */
export async function getStudentWishToday(className: string, code: string): Promise<SheetWish | null> {
  const result = await callSheetsApi<SheetWish>('getStudentWishToday', { className, code });
  return result.success ? result.data || null : null;
}

/**
 * 소원 연속 작성 기록 조회
 */
export async function getWishStreak(className: string, code: string): Promise<{ total: number; streak: number }> {
  const result = await callSheetsApi<{ total: number; streak: number }>('getWishStreak', { className, code });
  return result.success ? result.data || { total: 0, streak: 0 } : { total: 0, streak: 0 };
}

/**
 * 소원 추가
 */
export async function addWish(
  className: string,
  code: string,
  name: string,
  content: string
): Promise<{ id: string; createdAt: string } | null> {
  const result = await callSheetsApi<{ id: string; createdAt: string }>(
    'addWish',
    { className, code, name, content },
    'POST'
  );
  return result.success ? result.data || null : null;
}

/**
 * 소원 좋아요
 */
export async function likeWish(className: string, wishId: string, code: string): Promise<boolean> {
  const result = await callSheetsApi<void>('likeWish', { className, wishId, code }, 'POST');
  return result.success;
}

/**
 * 소원 좋아요 취소
 */
export async function unlikeWish(className: string, wishId: string, code: string): Promise<boolean> {
  const result = await callSheetsApi<void>('unlikeWish', { className, wishId, code }, 'POST');
  return result.success;
}

/**
 * 소원 선정 (교사)
 */
export async function grantWish(className: string, wishId: string, reward: number): Promise<boolean> {
  const result = await callSheetsApi<void>('grantWish', { className, wishId, reward: String(reward) }, 'POST');
  return result.success;
}

/**
 * 소원 삭제 (교사)
 */
export async function deleteWish(className: string, wishId: string): Promise<boolean> {
  const result = await callSheetsApi<void>('deleteWish', { className, wishId }, 'POST');
  return result.success;
}

// ========================================
// 상점 API
// ========================================

/**
 * 상점 아이템 목록 조회
 */
export async function getShopItems(): Promise<SheetShopItem[]> {
  const result = await callSheetsApi<SheetShopItem[]>('getShopItems');
  return result.success ? result.data || [] : [];
}

/**
 * 아이템 구매
 */
export async function purchaseItem(
  className: string,
  code: string,
  itemCode: string
): Promise<{ success: boolean; message?: string; itemCode?: string; price?: number }> {
  const result = await callSheetsApi<{ itemCode: string; price: number }>(
    'purchaseItem',
    { className, code, itemCode },
    'POST'
  );

  if (result.success && result.data) {
    return { success: true, itemCode: result.data.itemCode, price: result.data.price };
  }
  return { success: false, message: result.message };
}

// ========================================
// 프로필 API
// ========================================

/**
 * 프로필 저장
 */
export interface ProfileData {
  emojiCode?: string;
  title?: string;
  titleColorCode?: string;
  borderCode?: string;
  nameEffectCode?: string;
  backgroundCode?: string;
}

export async function saveProfile(
  className: string,
  code: string,
  profileData: ProfileData
): Promise<boolean> {
  const result = await callSheetsApi<void>('saveProfile', { className, code }, 'POST', profileData);
  return result.success;
}

// ========================================
// 전투 API
// ========================================

/**
 * 전투 기록 조회
 */
export async function getBattles(className: string): Promise<SheetBattle[]> {
  const result = await callSheetsApi<SheetBattle[]>('getBattles', { className });
  return result.success ? result.data || [] : [];
}

/**
 * 마지막 전투 날짜 조회
 */
export async function getLastBattleDate(className: string): Promise<string | null> {
  const result = await callSheetsApi<string>('getLastBattle', { className });
  return result.success ? result.data || null : null;
}

/**
 * 전투 결과 저장
 */
export interface BattleResultData {
  battleId?: string;
  results: Array<{
    teamId: string;
    attackTarget?: string;
    attackBet?: number;
    defenseBet?: number;
    result: string;
    cookieChange: number;
    roundEarned: number;
  }>;
}

export async function saveBattleResult(
  className: string,
  battleData: BattleResultData
): Promise<{ battleId: string; date: string } | null> {
  const result = await callSheetsApi<{ battleId: string; date: string }>(
    'saveBattleResult',
    { className },
    'POST',
    battleData
  );
  return result.success ? result.data || null : null;
}

/**
 * 이전 쿠키 업데이트 (전투 시작 시)
 */
export async function updatePreviousCookies(className: string): Promise<boolean> {
  const result = await callSheetsApi<void>('updatePreviousCookies', { className }, 'POST');
  return result.success;
}

// ========================================
// 랭킹 관련 함수
// ========================================

/**
 * 쿠키 랭킹 조회 (프론트엔드에서 정렬)
 */
export async function getCookieRanking(
  className: string,
  useEarnedRound: boolean = false
): Promise<Array<SheetStudent & { rank: number; cookieChange?: number }>> {
  const students = await getClassStudents(className);

  if (useEarnedRound) {
    // 쿠키 변화량 기준 랭킹 (cookie - previousCookie)
    const studentsWithChange = students.map(student => ({
      ...student,
      cookieChange: student.cookie - student.previousCookie,
    }));

    studentsWithChange.sort((a, b) => b.cookieChange - a.cookieChange);

    return studentsWithChange.map((student, index) => ({
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
// 로컬 스토리지 캐싱
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
