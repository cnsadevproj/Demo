import { StoredStudent } from '../services/firestoreApi';
import * as XLSX from 'xlsx';

// UTF-8 BOM (한글 깨짐 방지)
const UTF8_BOM = '\uFEFF';

// 다했니 XLSX 파일에서 학생 정보 추출 (이름 + 코드)
export interface StudentCodeData {
  name: string;
  code: string;
}

// XLSX 파일 파싱 (다했니 웹에서 다운로드한 파일 - B열이 이름, D열이 학생코드)
export function parseXlsxFile(file: File): Promise<StudentCodeData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        // 첫 번째 시트 사용
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 시트를 JSON으로 변환 (헤더 없이 배열로)
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        const studentCodes: StudentCodeData[] = [];

        // 첫 번째 행은 헤더이므로 스킵, B열(인덱스 1)에서 이름, D열(인덱스 3)에서 학생코드 추출
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row && row.length > 3) {
            const name = String(row[1] || '').trim();
            const code = String(row[3] || '').trim();
            if (code && code.length > 0) {
              studentCodes.push({
                name: name || `학생${i}`,  // 이름이 없으면 기본값
                code: code.toUpperCase()
              });
            }
          }
        }

        if (studentCodes.length === 0) {
          reject(new Error('유효한 학생코드가 없습니다. D열에 학생코드가 있는지 확인해주세요.'));
          return;
        }

        resolve(studentCodes);
      } catch (error) {
        reject(new Error('XLSX 파일 파싱 중 오류가 발생했습니다.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

// CSV 템플릿 생성 및 다운로드 (기존 호환용)
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

// CSV 파일 파싱 (기존 호환용)
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

// 과거 잔디 데이터 파싱 결과
export interface PastGrassData {
  name: string;
  date: string; // YYYY-MM-DD 형식
  cookies: number;
  sheetName: string; // 어떤 시트에서 왔는지 (디버깅용)
}

// 과거 잔디 XLSX 파일 파싱 (n회차 시트들에서 A열=이름, B열=제출시각, D열=쿠키)
export function parsePastGrassXlsx(file: File, year?: number): Promise<PastGrassData[]> {
  const targetYear = year || new Date().getFullYear();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        const results: PastGrassData[] = [];

        // "n회차" 패턴의 시트들만 처리
        const roundSheetPattern = /^(\d+)회차$/;

        for (const sheetName of workbook.SheetNames) {
          if (!roundSheetPattern.test(sheetName)) continue;

          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

          // 첫 번째 행은 헤더이므로 스킵
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 4) continue;

            const name = String(row[0] || '').trim(); // A열 (인덱스 0)
            const timeStr = String(row[1] || '').trim(); // B열 (인덱스 1)
            const cookieStr = String(row[3] || '').trim(); // D열 (인덱스 3)

            if (!name || !timeStr) continue;

            // 쿠키 파싱
            const cookies = parseInt(cookieStr, 10);
            if (isNaN(cookies) || cookies <= 0) continue;

            // 날짜 파싱: "08-25 (월) 21:53" -> "YYYY-08-25"
            const dateMatch = timeStr.match(/^(\d{2})-(\d{2})/);
            if (!dateMatch) continue;

            const month = dateMatch[1];
            const day = dateMatch[2];
            const dateStr = `${targetYear}-${month}-${day}`;

            results.push({
              name,
              date: dateStr,
              cookies,
              sheetName
            });
          }
        }

        if (results.length === 0) {
          reject(new Error('유효한 잔디 데이터가 없습니다. "n회차" 시트에 A열(이름), B열(제출시각), D열(쿠키)이 있는지 확인해주세요.'));
          return;
        }

        resolve(results);
      } catch (error) {
        reject(new Error('XLSX 파일 파싱 중 오류가 발생했습니다.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    };

    reader.readAsArrayBuffer(file);
  });
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
