// 다했니 Open API 서비스 모듈

const BASE_URL = 'https://api.dahandin.com/openapi/v1';

// API 응답 타입
export interface ApiResponse<T> {
  result: boolean;
  message: string;
  data?: T;
}

// 클래스 정보 타입
export interface ClassInfo {
  name: string;
  totalCookies: number | null;
  cookies: number;
  usedCookies?: number;
}

// 뱃지 정보 타입
export interface Badge {
  imgUrl: string;
  title: string;
  hasBadge: boolean;
}

// 학생 정보 타입 (API 응답)
export interface StudentInfo {
  code: string;
  number: string;
  name: string;
  cookie: number;
  usedCookie: number;
  totalCookie: number;
  chocoChips?: number;
  badges: Record<string, Badge>;
}

// 저장용 학생 데이터 타입
export interface StoredStudent {
  code: string;
  number: number;
  name: string;
}

// 클래스별 학생 데이터 타입
export interface ClassStudents {
  className: string;
  students: StoredStudent[];
  updatedAt: string;
}

// API 키 검증 (클래스 목록 조회로 검증)
export async function validateApiKey(apiKey: string): Promise<ApiResponse<ClassInfo[]>> {
  try {
    const response = await fetch(`${BASE_URL}/get/class/list`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
      },
    });
    return await response.json();
  } catch (error) {
    return {
      result: false,
      message: '네트워크 오류가 발생했습니다.',
    };
  }
}

// 클래스 목록 조회
export async function getClassList(apiKey: string): Promise<ApiResponse<ClassInfo[]>> {
  try {
    const response = await fetch(`${BASE_URL}/get/class/list`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
      },
    });
    return await response.json();
  } catch (error) {
    return {
      result: false,
      message: '클래스 목록을 불러오는데 실패했습니다.',
    };
  }
}

// 학생 정보 조회
export async function getStudentInfo(apiKey: string, studentCode: string): Promise<ApiResponse<StudentInfo>> {
  try {
    const response = await fetch(`${BASE_URL}/get/student/total?code=${studentCode}`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
      },
    });
    return await response.json();
  } catch (error) {
    return {
      result: false,
      message: '학생 정보를 불러오는데 실패했습니다.',
    };
  }
}

// 여러 학생 정보 일괄 조회 (Rate Limit 고려: 100ms 간격)
export async function getMultipleStudentsInfo(
  apiKey: string,
  studentCodes: string[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, StudentInfo | null>> {
  const results = new Map<string, StudentInfo | null>();

  for (let i = 0; i < studentCodes.length; i++) {
    const code = studentCodes[i];

    try {
      const response = await getStudentInfo(apiKey, code);
      if (response.result && response.data) {
        results.set(code, response.data);
      } else {
        results.set(code, null);
      }
    } catch {
      results.set(code, null);
    }

    // 진행률 콜백
    if (onProgress) {
      onProgress(i + 1, studentCodes.length);
    }

    // Rate Limit 방지: 100ms 대기 (마지막 요청 제외)
    if (i < studentCodes.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}
