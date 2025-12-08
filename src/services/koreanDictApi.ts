// 한국어기초사전 API 서비스
// 끝말잇기 단어 검증용

const API_KEY = 'FA814DCE964D009D50F04AA8E3A369E5';
const BASE_URL = 'https://krdict.korean.go.kr/api/search';

// 두음법칙 변환 맵
const DUEUM_MAP: Record<string, string[]> = {
  '녀': ['여'],
  '뇨': ['요'],
  '뉴': ['유'],
  '니': ['이'],
  '랴': ['야'],
  '려': ['여'],
  '례': ['예'],
  '료': ['요'],
  '류': ['유'],
  '리': ['이'],
  '라': ['나'],
  '래': ['내'],
  '로': ['노'],
  '뢰': ['뇌'],
  '루': ['누'],
  '르': ['느'],
};

// 역 두음법칙 맵 (예: '여' -> ['녀', '려'])
const REVERSE_DUEUM_MAP: Record<string, string[]> = {};
Object.entries(DUEUM_MAP).forEach(([key, values]) => {
  values.forEach(value => {
    if (!REVERSE_DUEUM_MAP[value]) {
      REVERSE_DUEUM_MAP[value] = [];
    }
    REVERSE_DUEUM_MAP[value].push(key);
  });
});

// 두음법칙 적용 가능한 글자들 반환
export function getDueumVariants(char: string): string[] {
  const variants = [char];

  // 정방향: 녀 -> 여
  if (DUEUM_MAP[char]) {
    variants.push(...DUEUM_MAP[char]);
  }

  // 역방향: 여 -> 녀, 려
  if (REVERSE_DUEUM_MAP[char]) {
    variants.push(...REVERSE_DUEUM_MAP[char]);
  }

  return [...new Set(variants)];
}

// 단어의 마지막 글자 가져오기
export function getLastChar(word: string): string {
  return word.charAt(word.length - 1);
}

// 단어의 첫 글자 가져오기
export function getFirstChar(word: string): string {
  return word.charAt(0);
}

// 끝말잇기 연결 가능 여부 확인
export function canConnect(prevWord: string, nextWord: string): boolean {
  const lastChar = getLastChar(prevWord);
  const firstChar = getFirstChar(nextWord);

  // 직접 연결
  if (lastChar === firstChar) return true;

  // 두음법칙 적용
  const variants = getDueumVariants(lastChar);
  return variants.includes(firstChar);
}

// API 응답 파싱
interface DictSearchResult {
  total: number;
  items: Array<{
    word: string;
    pos: string;
    sense: string;
  }>;
}

// XML 파싱 헬퍼
function parseXML(xmlString: string): DictSearchResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  const totalNode = doc.querySelector('total');
  const total = totalNode ? parseInt(totalNode.textContent || '0', 10) : 0;

  const items: DictSearchResult['items'] = [];
  const itemNodes = doc.querySelectorAll('item');

  itemNodes.forEach(item => {
    const wordNode = item.querySelector('word');
    const posNode = item.querySelector('pos');
    const definitionNode = item.querySelector('sense > definition');

    if (wordNode) {
      items.push({
        word: wordNode.textContent?.replace(/-/g, '').replace(/\^/g, '') || '',
        pos: posNode?.textContent || '',
        sense: definitionNode?.textContent || '',
      });
    }
  });

  return { total, items };
}

// 단어 검증 (한국어기초사전 API 사용)
export async function validateWord(word: string): Promise<{
  isValid: boolean;
  definition?: string;
  pos?: string;
}> {
  try {
    const params = new URLSearchParams({
      key: API_KEY,
      q: word,
      part: 'word',
      method: 'exact',
      pos: '1', // 명사만
      num: '10',
    });

    const response = await fetch(`${BASE_URL}?${params.toString()}`);

    if (!response.ok) {
      console.error('API 요청 실패:', response.status);
      return { isValid: false };
    }

    const xmlText = await response.text();
    const result = parseXML(xmlText);

    if (result.total > 0) {
      // 정확히 일치하는 단어 찾기
      const exactMatch = result.items.find(
        item => item.word.replace(/-/g, '').replace(/\^/g, '') === word
      );

      if (exactMatch) {
        return {
          isValid: true,
          definition: exactMatch.sense,
          pos: exactMatch.pos,
        };
      }

      // 첫 번째 결과 사용
      return {
        isValid: true,
        definition: result.items[0]?.sense,
        pos: result.items[0]?.pos,
      };
    }

    return { isValid: false };
  } catch (error) {
    console.error('단어 검증 오류:', error);
    // API 오류 시 일단 허용 (오프라인 모드)
    return { isValid: true };
  }
}

// 한방 단어 체크 (해당 글자로 시작하는 단어가 거의 없는 경우)
// 대표적인 한방 단어 끝글자 목록
const KILLER_ENDINGS = [
  '륨', '늄', '슘', '퓸', '뮴', // 원소 이름 등
  '즘', '틱', '릭', '닉',
  '꾼', '녘', '쁨', '쁜',
];

export function isKillerWord(word: string): boolean {
  const lastChar = getLastChar(word);
  return KILLER_ENDINGS.includes(lastChar);
}

// 글자 수 검증
export function isValidLength(word: string, minLength: number, maxLength: number): boolean {
  const length = word.length;
  return length >= minLength && length <= maxLength;
}

// 점수 계산 (글자 수 기반)
export function calculateScore(word: string): number {
  const length = word.length;
  if (length === 2) return 1;
  if (length === 3) return 2;
  if (length === 4) return 3;
  return 5; // 5글자 이상
}

// 사용된 단어 중복 체크
export function isWordUsed(word: string, usedWords: string[]): boolean {
  return usedWords.includes(word);
}

// 종합 단어 검증
export async function validateWordChainInput(
  word: string,
  prevWord: string | null,
  usedWords: string[],
  options: {
    minLength?: number;
    maxLength?: number;
    banKillerWords?: boolean;
  } = {}
): Promise<{
  isValid: boolean;
  error?: string;
  score?: number;
  definition?: string;
}> {
  const { minLength = 2, maxLength = 10, banKillerWords = true } = options;

  // 1. 글자 수 검증
  if (!isValidLength(word, minLength, maxLength)) {
    return {
      isValid: false,
      error: `${minLength}~${maxLength}글자 단어만 사용할 수 있습니다.`,
    };
  }

  // 2. 중복 단어 검증
  if (isWordUsed(word, usedWords)) {
    return {
      isValid: false,
      error: '이미 사용된 단어입니다.',
    };
  }

  // 3. 끝말잇기 연결 검증 (첫 단어가 아닌 경우)
  if (prevWord && !canConnect(prevWord, word)) {
    const lastChar = getLastChar(prevWord);
    const variants = getDueumVariants(lastChar);
    const variantStr = variants.length > 1 ? `(${variants.join(', ')})` : lastChar;
    return {
      isValid: false,
      error: `'${variantStr}'(으)로 시작하는 단어를 입력하세요.`,
    };
  }

  // 4. 한방 단어 검증
  if (banKillerWords && isKillerWord(word)) {
    return {
      isValid: false,
      error: '한방 단어는 사용할 수 없습니다.',
    };
  }

  // 5. 사전 검증
  const dictResult = await validateWord(word);
  if (!dictResult.isValid) {
    return {
      isValid: false,
      error: '사전에 없는 단어입니다.',
    };
  }

  // 모든 검증 통과
  return {
    isValid: true,
    score: calculateScore(word),
    definition: dictResult.definition,
  };
}
