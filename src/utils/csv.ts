import { StoredStudent } from '../services/firestoreApi';

// UTF-8 BOM (한글 깨짐 방지)
const UTF8_BOM = '\uFEFF';

// CSV 템플릿 생성 및 다운로드
export function downloadCsvTemplate(className: string) {
  const header = '번호,이름,학생코드';
  const example1 = '1,홍길동,ABC123XYZ';
  const example2 = '2,김철수,DEF456UVW';

  const content = UTF8_BOM + [header, example1, example2].join('\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `학생목록_템플릿_${className || '클래스'}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// CSV 파일 파싱
export function parseCsvFile(file: File): Promise<StoredStudent[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const students = parseCsvText(text);
        resolve(students);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    };

    // UTF-8로 읽기
    reader.readAsText(file, 'UTF-8');
  });
}

// CSV 텍스트 파싱
export function parseCsvText(text: string): StoredStudent[] {
  // BOM 제거
  const cleanText = text.replace(/^\uFEFF/, '');

  // 줄 단위로 분리
  const lines = cleanText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV 파일에 데이터가 없습니다. 헤더와 최소 1명의 학생 정보가 필요합니다.');
  }

  // 헤더 확인 (첫 번째 줄)
  const header = lines[0].toLowerCase();
  if (!header.includes('번호') && !header.includes('이름') && !header.includes('코드')) {
    // 헤더가 없을 수도 있음 - 첫 줄이 데이터인지 확인
    const firstLine = parseCSVLine(lines[0]);
    if (firstLine.length >= 3 && !isNaN(Number(firstLine[0]))) {
      // 첫 줄이 데이터인 경우 - 헤더 없이 파싱
      return lines.map(parseLine).filter((s): s is StoredStudent => s !== null);
    }
  }

  // 헤더 제외하고 파싱
  const students: StoredStudent[] = [];

  for (let i = 1; i < lines.length; i++) {
    const student = parseLine(lines[i]);
    if (student) {
      students.push(student);
    }
  }

  if (students.length === 0) {
    throw new Error('유효한 학생 데이터가 없습니다.');
  }

  return students;
}

// CSV 라인 파싱 (쉼표 구분, 따옴표 처리)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// 한 줄 파싱
function parseLine(line: string): StoredStudent | null {
  const parts = parseCSVLine(line);

  if (parts.length < 3) {
    return null;
  }

  const [numberStr, name, code] = parts;

  const number = parseInt(numberStr, 10);
  if (isNaN(number)) {
    return null;
  }

  if (!name || !code) {
    return null;
  }

  return {
    number,
    name: name.trim(),
    code: code.trim().toUpperCase(),
  };
}

// 학생 목록을 CSV로 내보내기
export function exportStudentsToCsv(students: StoredStudent[], className: string) {
  const header = '번호,이름,학생코드';
  const rows = students.map(s => `${s.number},${s.name},${s.code}`);

  const content = UTF8_BOM + [header, ...rows].join('\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `학생목록_${className}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
