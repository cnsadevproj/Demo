// Google Sheets Web App 서비스

// Sheets 응답 타입
export interface SheetsResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// 뱃지 정보 타입
export interface BadgeInfo {
  title: string;
  imgUrl: string;
  hasBadge: boolean;
}

// Sheets 학생 정보 타입
export interface SheetsStudentData {
  number: number;
  name: string;
  code: string;
  cookie: number;
  usedCookie: number;
  totalCookie: number;
  chocoChips: number;
  lastUpdate: string;
  badges: Record<string, BadgeInfo>;
}

// Sheets 팀 정보 타입
export interface SheetsTeamData {
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

// 잔디 데이터 타입 (열 기반 구조)
export interface SheetsGrassData {
  date: string;           // 기본 날짜 (2024-11-28)
  dateColumn?: string;    // 열 헤더 (2024-11-28(2))
  studentCode: string;
  studentName?: string;
  cookieChange: number;   // 해당 날짜의 쿠키 변화량
  refreshCount?: number;  // 새로고침 횟수 (같은 날 2회 이상이면 진한 잔디)
}

// 스냅샷 데이터 타입
export interface SheetsSnapshotData {
  week: number;
  studentCode: string;
  teamId: string;
  bMon: number;
  bWed: number;
  earnedRound: number;
  date: string;
}

// Sheets URL 저장/조회
const STORAGE_KEY = 'dahandin_sheets_url';

export function getSheetsUrl(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setSheetsUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY, url);
}

export function removeSheetsUrl(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// API 호출 헬퍼
async function callSheetsApi<T>(action: string, params: Record<string, string> = {}): Promise<SheetsResponse<T>> {
  const sheetsUrl = getSheetsUrl();

  if (!sheetsUrl) {
    console.error('[Sheets API] URL이 설정되지 않았습니다. localStorage key:', STORAGE_KEY);
    return {
      success: false,
      message: 'Sheets URL이 설정되지 않았습니다. 선생님께 문의하세요.'
    };
  }

  try {
    const queryParams = new URLSearchParams({
      action,
      ...params
    });

    const url = `${sheetsUrl}?${queryParams.toString()}`;
    console.log(`[Sheets API] 호출: ${action}`, { url, params });

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[Sheets API] HTTP 오류: ${response.status} ${response.statusText}`);
      return {
        success: false,
        message: `HTTP 오류: ${response.status}`
      };
    }

    const data = await response.json();
    console.log(`[Sheets API] 응답: ${action}`, data);

    return data;
  } catch (error) {
    console.error('[Sheets API] 네트워크 오류:', error);
    return {
      success: false,
      message: '네트워크 오류가 발생했습니다.'
    };
  }
}

// 연결 테스트
export async function testSheetsConnection(): Promise<SheetsResponse<null>> {
  return callSheetsApi('ping');
}

// 클래스 목록 조회 (Sheets에서)
export interface SheetsClassInfo {
  name: string;
  studentCount: number;
  active?: boolean; // 활성화 상태
}

export async function getClassListFromSheets(): Promise<SheetsResponse<SheetsClassInfo[]>> {
  return callSheetsApi('getClassList');
}

// 학급 활성화 상태 설정
export async function setClassActivation(
  className: string,
  active: boolean
): Promise<SheetsResponse<null>> {
  return callSheetsApi('setClassActivation', {
    className,
    active: active ? '1' : '0'
  });
}

// 학생 정보 조회
export async function getStudentFromSheets(
  studentCode: string,
  className: string
): Promise<SheetsResponse<SheetsStudentData>> {
  return callSheetsApi('getStudent', { code: studentCode, className });
}

// 학급 전체 학생 조회
export async function getClassStudents(className: string): Promise<SheetsResponse<SheetsStudentData[]>> {
  return callSheetsApi('getClassStudents', { className });
}

// 팀 정보 조회
export async function getTeams(className: string): Promise<SheetsResponse<SheetsTeamData[]>> {
  return callSheetsApi('getTeams', { className });
}

// 잔디 데이터 조회
export async function getGrass(
  studentCode: string,
  className: string
): Promise<SheetsResponse<SheetsGrassData[]>> {
  return callSheetsApi('getGrass', { code: studentCode, className });
}

// 스냅샷 데이터 조회
export async function getSnapshot(
  className: string,
  week?: number
): Promise<SheetsResponse<SheetsSnapshotData[]>> {
  const params: Record<string, string> = { className };
  if (week !== undefined) {
    params.week = week.toString();
  }
  return callSheetsApi('getSnapshot', params);
}

// 학생 코드로 학급 찾기 (Apps Script에서 자동으로 모든 시트 검색)
// API 키 불필요 - 학생 로그인 시 사용
export interface FindStudentResult {
  className: string;
  number: number;
  name: string;
  code: string;
}

export async function findStudentByCode(
  studentCode: string
): Promise<SheetsResponse<FindStudentResult>> {
  return callSheetsApi('findStudent', { code: studentCode });
}

// 학생 코드로 학급 찾기 (모든 학급을 순회하며 검색)
// 주의: 이 함수는 학급명을 모를 때 사용하며, 여러 학급을 검색하므로 느릴 수 있습니다.
// 더 이상 사용하지 않음 - findStudentByCode 사용 권장
export async function findStudentClass(
  studentCode: string,
  classNames: string[]
): Promise<{ className: string; student: SheetsStudentData } | null> {
  for (const className of classNames) {
    const response = await getStudentFromSheets(studentCode, className);
    if (response.success && response.data) {
      return {
        className,
        student: response.data
      };
    }
  }
  return null;
}

// ========================================
// 학급 가져오기 및 시트 생성 (교사용)
// ========================================

// 클래스룸에서 학급 목록 가져오기 (API에서 import)
export interface ImportClassroomsResult {
  totalClasses: number;
  activeClasses: number;
  message: string;
}

export async function importClassroomsFromApi(): Promise<SheetsResponse<ImportClassroomsResult>> {
  return callSheetsApi('importClassrooms');
}

// 활성화된 학급의 시트 생성
export interface CreateSheetsResult {
  createdCount: number;
  createdClasses: string[];
  message: string;
}

export async function createSheetsForActivatedClasses(): Promise<SheetsResponse<CreateSheetsResult>> {
  return callSheetsApi('createActivatedSheets');
}

// 학생 목록 저장 (CSV 업로드 시)
export interface SaveStudentsResult {
  savedCount: number;
}

export interface StudentToSave {
  number: number;
  name: string;
  code: string;
  cookie?: number;
  usedCookie?: number;
  totalCookie?: number;
  chocoChips?: number;
  previousCookie?: number;
  emojiCode?: string;
  title?: string;
  titleColorCode?: string;
  borderCode?: string;
  nameEffectCode?: string;
  backgroundCode?: string;
  ownedItems?: string[];
}

export async function saveStudentsToSheets(
  className: string,
  students: StudentToSave[]
): Promise<SheetsResponse<SaveStudentsResult>> {
  const sheetsUrl = getSheetsUrl();

  if (!sheetsUrl) {
    return {
      success: false,
      message: 'Sheets URL이 설정되지 않았습니다.'
    };
  }

  try {
    const url = `${sheetsUrl}?action=saveStudents&className=${encodeURIComponent(className)}`;
    console.log('[Sheets API] POST saveStudents:', { className, studentCount: students.length });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ students }),
    });

    if (!response.ok) {
      return {
        success: false,
        message: `HTTP 오류: ${response.status}`
      };
    }

    const data = await response.json();
    console.log('[Sheets API] saveStudents 응답:', data);
    return data;
  } catch (error) {
    console.error('[Sheets API] saveStudents 오류:', error);
    return {
      success: false,
      message: '네트워크 오류가 발생했습니다.'
    };
  }
}

// 학급목록 시트에서 모든 학급 가져오기 (시트 유무와 관계없이)
export interface ClassListItem {
  name: string;
  studentCount: number;
  lastUpdate: string;
  active: boolean;
}

export async function getAllClassesFromList(): Promise<SheetsResponse<ClassListItem[]>> {
  return callSheetsApi('getAllClassList');
}
