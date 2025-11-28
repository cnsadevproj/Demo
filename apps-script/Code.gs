// ========================================
// 다했니 Google Sheets 연동 Apps Script
// ========================================

const API_BASE = 'https://api.dahandin.com/openapi/v1';

// ========================================
// 0. Web App 엔드포인트 (학생용 앱 연동)
// ========================================

/**
 * GET 요청 처리
 * URL 형식: ?action=getStudent&code=학생코드&className=학급명
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action;

    // CORS 헤더 설정
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    let result;

    switch (action) {
      case 'getStudent':
        result = getStudentData(params.code, params.className);
        break;

      case 'getClassStudents':
        result = getClassStudentsData(params.className);
        break;

      case 'getTeams':
        result = getTeamsData(params.className);
        break;

      case 'getGrass':
        result = getGrassData(params.code, params.className);
        break;

      case 'getSnapshot':
        result = getSnapshotData(params.className, params.week);
        break;

      case 'ping':
        result = { success: true, message: '연결 성공!' };
        break;

      default:
        result = { success: false, message: '올바르지 않은 action입니다.' };
    }

    output.setContent(JSON.stringify(result));
    return output;

  } catch (error) {
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    output.setContent(JSON.stringify({
      success: false,
      message: error.message
    }));
    return output;
  }
}

// 학생 정보 조회
function getStudentData(studentCode, className) {
  if (!studentCode || !className) {
    return { success: false, message: '학생 코드와 학급명이 필요합니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sanitizedName = sanitizeSheetName(className);
  const studentSheet = ss.getSheetByName(`${sanitizedName}_학생`);

  if (!studentSheet) {
    return { success: false, message: '학급 시트를 찾을 수 없습니다.' };
  }

  const lastRow = studentSheet.getLastRow();
  if (lastRow < 2) {
    return { success: false, message: '학생 데이터가 없습니다.' };
  }

  // 학생 데이터 검색
  const data = studentSheet.getRange(2, 1, lastRow - 1, 8).getValues();

  for (let i = 0; i < data.length; i++) {
    const [number, name, code, cookie, usedCookie, totalCookie, chocoChips, lastUpdate] = data[i];

    if (code === studentCode) {
      return {
        success: true,
        data: {
          number,
          name,
          code,
          cookie,
          usedCookie,
          totalCookie,
          chocoChips,
          lastUpdate: lastUpdate ? new Date(lastUpdate).toISOString() : null
        }
      };
    }
  }

  return { success: false, message: '학생을 찾을 수 없습니다.' };
}

// 학급 전체 학생 목록 조회
function getClassStudentsData(className) {
  if (!className) {
    return { success: false, message: '학급명이 필요합니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sanitizedName = sanitizeSheetName(className);
  const studentSheet = ss.getSheetByName(`${sanitizedName}_학생`);

  if (!studentSheet) {
    return { success: false, message: '학급 시트를 찾을 수 없습니다.' };
  }

  const lastRow = studentSheet.getLastRow();
  if (lastRow < 2) {
    return { success: true, data: [] };
  }

  const data = studentSheet.getRange(2, 1, lastRow - 1, 8).getValues();
  const students = data
    .filter(row => row[2]) // 학생 코드가 있는 경우만
    .map(row => ({
      number: row[0],
      name: row[1],
      code: row[2],
      cookie: row[3],
      usedCookie: row[4],
      totalCookie: row[5],
      chocoChips: row[6],
      lastUpdate: row[7] ? new Date(row[7]).toISOString() : null
    }));

  return { success: true, data: students };
}

// 팀 정보 조회
function getTeamsData(className) {
  if (!className) {
    return { success: false, message: '학급명이 필요합니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sanitizedName = sanitizeSheetName(className);
  const teamSheet = ss.getSheetByName(`${sanitizedName}_팀`);

  if (!teamSheet) {
    return { success: false, message: '팀 시트를 찾을 수 없습니다.' };
  }

  const lastRow = teamSheet.getLastRow();
  if (lastRow < 2) {
    return { success: true, data: [] };
  }

  const data = teamSheet.getRange(2, 1, lastRow - 1, 9).getValues();
  const teams = data
    .filter(row => row[0]) // 주차가 있는 경우만
    .map(row => ({
      week: row[0],
      teamId: row[1],
      teamName: row[2],
      flag: row[3],
      members: row[4] ? row[4].split(',') : [],
      earnedRound: row[5],
      attackTarget: row[6],
      attackBet: row[7],
      defense: row[8]
    }));

  return { success: true, data: teams };
}

// 잔디 데이터 조회
function getGrassData(studentCode, className) {
  if (!studentCode || !className) {
    return { success: false, message: '학생 코드와 학급명이 필요합니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sanitizedName = sanitizeSheetName(className);
  const grassSheet = ss.getSheetByName(`${sanitizedName}_잔디`);

  if (!grassSheet) {
    return { success: false, message: '잔디 시트를 찾을 수 없습니다.' };
  }

  const lastRow = grassSheet.getLastRow();
  if (lastRow < 2) {
    return { success: true, data: [] };
  }

  const data = grassSheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const grassData = data
    .filter(row => row[1] === studentCode)
    .map(row => ({
      date: row[0] ? new Date(row[0]).toISOString().split('T')[0] : null,
      studentCode: row[1],
      completed: row[2],
      missionType: row[3]
    }));

  return { success: true, data: grassData };
}

// 스냅샷 데이터 조회
function getSnapshotData(className, week) {
  if (!className) {
    return { success: false, message: '학급명이 필요합니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sanitizedName = sanitizeSheetName(className);
  const snapshotSheet = ss.getSheetByName(`${sanitizedName}_스냅샷`);

  if (!snapshotSheet) {
    return { success: false, message: '스냅샷 시트를 찾을 수 없습니다.' };
  }

  const lastRow = snapshotSheet.getLastRow();
  if (lastRow < 2) {
    return { success: true, data: [] };
  }

  const data = snapshotSheet.getRange(2, 1, lastRow - 1, 7).getValues();
  let snapshots = data
    .filter(row => row[0]) // 주차가 있는 경우만
    .map(row => ({
      week: row[0],
      studentCode: row[1],
      teamId: row[2],
      bMon: row[3],
      bWed: row[4],
      earnedRound: row[5],
      date: row[6] ? new Date(row[6]).toISOString() : null
    }));

  // 특정 주차 필터링
  if (week) {
    snapshots = snapshots.filter(s => s.week == week);
  }

  return { success: true, data: snapshots };
}

// ========================================
// 1. 메뉴 생성
// ========================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎓 다했니')
    .addItem('⚙️ 1. 클래스 목록 불러오기', 'fetchClassList')
    .addSeparator()
    .addItem('🔄 2. 학생 정보 동기화', 'syncStudentInfo')
    .addSeparator()
    .addItem('📸 3. 스냅샷 실행', 'createSnapshot')
    .addSeparator()
    .addItem('❓ 도움말', 'showHelp')
    .addToUi();
}

// ========================================
// 2. 유틸리티 함수
// ========================================

// API 키 가져오기
function getApiKey() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName('설정');

  if (!settingsSheet) {
    throw new Error('⚠️ [설정] 시트를 찾을 수 없습니다.');
  }

  const apiKey = settingsSheet.getRange('A2').getValue();

  if (!apiKey) {
    throw new Error('⚠️ [설정] 시트의 A2 셀에 다했니 API 키를 입력해주세요.');
  }

  return apiKey;
}

// API 호출 함수
function callApi(endpoint, params = {}) {
  const apiKey = getApiKey();

  let url = API_BASE + endpoint;

  // 쿼리 파라미터 추가
  if (Object.keys(params).length > 0) {
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    url += '?' + queryString;
  }

  const options = {
    method: 'get',
    headers: {
      'X-API-Key': apiKey
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());

  if (!json.result) {
    throw new Error('API 오류: ' + json.message);
  }

  return json.data;
}

// 시트 존재 여부 확인 및 생성
function getOrCreateSheet(sheetName, headers = []) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);

    // 헤더 추가
    if (headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }

  return sheet;
}

// 안전한 시트명 만들기 (특수문자 제거)
function sanitizeSheetName(name) {
  // null 또는 undefined 체크
  if (!name) return 'Unnamed';

  // 문자열로 변환
  const nameStr = String(name);

  // Google Sheets 시트명 제한: 100자, 특수문자 일부 제한
  return nameStr
    .replace(/[\[\]\*\?\\\/]/g, '') // 금지된 문자 제거
    .substring(0, 100); // 100자 제한
}

// ========================================
// 3. 클래스 목록 불러오기
// ========================================
function fetchClassList() {
  const ui = SpreadsheetApp.getUi();

  try {
    ui.alert('🔄 클래스 목록을 불러오는 중...');

    // API 호출
    const classList = callApi('/get/class/list');

    if (!classList || classList.length === 0) {
      ui.alert('⚠️ 클래스 목록이 비어있습니다.');
      return;
    }

    // 학급목록 시트 업데이트
    const listSheet = getOrCreateSheet('학급목록', ['학급명', '학생수', '마지막 업데이트']);

    // 기존 데이터 삭제 (헤더 제외)
    const lastRow = listSheet.getLastRow();
    if (lastRow > 1) {
      listSheet.deleteRows(2, lastRow - 1);
    }

    // 데이터 쓰기
    const now = new Date().toLocaleString('ko-KR');
    const data = classList.map(cls => [
      cls.name,
      0, // 학생수 (나중에 업데이트)
      now
    ]);

    listSheet.getRange(2, 1, data.length, 3).setValues(data);

    // 각 학급별 시트 생성
    classList.forEach(cls => {
      const className = sanitizeSheetName(cls.name);
      createClassSheets(className);
    });

    ui.alert(`✅ 완료!\n\n${classList.length}개 학급의 시트가 생성되었습니다.\n\n다음 단계:\n1. 각 학급 시트에 학생 코드 CSV를 붙여넣기\n2. [2. 학생 정보 동기화] 실행`);

  } catch (error) {
    ui.alert('❌ 오류 발생\n\n' + error.message);
  }
}

// 학급별 시트 생성
function createClassSheets(className) {
  // 학생 시트
  const studentHeaders = ['번호', '이름', '학생코드', '쿠키', '사용쿠키', '남은쿠키', '초코칩', '마지막 업데이트'];
  getOrCreateSheet(`${className}_학생`, studentHeaders);

  // 팀 시트
  const teamHeaders = ['주차', '팀ID', '팀명', '플래그', '멤버(학생코드)', '라운드쿠키', '공격대상', '베팅', '방어'];
  getOrCreateSheet(`${className}_팀`, teamHeaders);

  // 잔디 시트
  const grassHeaders = ['날짜', '학생코드', '완료여부', '미션타입'];
  getOrCreateSheet(`${className}_잔디`, grassHeaders);

  // 스냅샷 시트
  const snapshotHeaders = ['주차', '학생코드', '팀ID', 'B_mon', 'B_wed', 'earned_round', '날짜'];
  getOrCreateSheet(`${className}_스냅샷`, snapshotHeaders);
}

// ========================================
// 4. 학생 정보 동기화
// ========================================
function syncStudentInfo() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    // 학급목록 가져오기
    const listSheet = ss.getSheetByName('학급목록');
    if (!listSheet) {
      ui.alert('⚠️ 먼저 [1. 클래스 목록 불러오기]를 실행해주세요.');
      return;
    }

    const lastRow = listSheet.getLastRow();
    if (lastRow < 2) {
      ui.alert('⚠️ 학급목록이 비어있습니다.');
      return;
    }

    const classNames = listSheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();

    ui.alert(`🔄 ${classNames.length}개 학급의 학생 정보를 동기화합니다.\n\n잠시만 기다려주세요...`);

    let totalUpdated = 0;

    // 각 학급별 처리
    for (let i = 0; i < classNames.length; i++) {
      const className = sanitizeSheetName(classNames[i]);
      const studentSheet = ss.getSheetByName(`${className}_학생`);

      if (!studentSheet) {
        Logger.log(`${className}_학생 시트를 찾을 수 없습니다.`);
        continue;
      }

      const studentLastRow = studentSheet.getLastRow();
      if (studentLastRow < 2) {
        Logger.log(`${className}: 학생 데이터가 없습니다.`);
        continue;
      }

      // 학생 코드 가져오기 (C열)
      const studentCodes = studentSheet.getRange(2, 3, studentLastRow - 1, 1).getValues().flat();

      const now = new Date().toLocaleString('ko-KR');

      // 각 학생별 API 호출 (Rate Limit 고려)
      for (let j = 0; j < studentCodes.length; j++) {
        const code = studentCodes[j];

        if (!code) continue;

        try {
          // API 호출
          const studentInfo = callApi('/get/student/total', { code: code });

          // 데이터 업데이트 (D~H열: 쿠키, 사용쿠키, 남은쿠키, 초코칩, 마지막업데이트)
          const row = j + 2;
          studentSheet.getRange(row, 4, 1, 5).setValues([[
            studentInfo.cookie || 0,
            studentInfo.usedCookie || 0,
            studentInfo.totalCookie || 0,
            studentInfo.chocoChips || 0,
            now
          ]]);

          totalUpdated++;

          // Rate Limit 고려 (100ms 대기)
          Utilities.sleep(100);

        } catch (error) {
          Logger.log(`${className} - ${code}: ${error.message}`);
        }
      }

      // 학급목록 시트의 학생수 업데이트
      listSheet.getRange(i + 2, 2).setValue(studentCodes.filter(c => c).length);
    }

    ui.alert(`✅ 완료!\n\n${totalUpdated}명의 학생 정보가 업데이트되었습니다.`);

  } catch (error) {
    ui.alert('❌ 오류 발생\n\n' + error.message);
  }
}

// ========================================
// 5. 스냅샷 실행
// ========================================
function createSnapshot() {
  const ui = SpreadsheetApp.getUi();

  // 월요일/수요일 선택
  const response = ui.alert(
    '📸 스냅샷 실행',
    '어떤 스냅샷을 실행하시겠습니까?',
    ui.ButtonSet.YES_NO_CANCEL
  );

  if (response === ui.Button.CANCEL) {
    return;
  }

  const snapshotType = response === ui.Button.YES ? 'B_mon' : 'B_wed';
  const snapshotName = snapshotType === 'B_mon' ? '월요일 스냅샷' : '수요일 스냅샷';

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = ss.getSheetByName('설정');
    const currentWeek = settingsSheet.getRange('A8').getValue() || 1;

    ui.alert(`🔄 ${snapshotName}을 실행합니다...\n주차: ${currentWeek}`);

    // 학급목록 가져오기
    const listSheet = ss.getSheetByName('학급목록');
    const lastRow = listSheet.getLastRow();
    const classNames = listSheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();

    const now = new Date().toLocaleString('ko-KR');
    let totalSnapshots = 0;

    // 각 학급별 처리
    for (const className of classNames) {
      const sanitizedName = sanitizeSheetName(className);
      const studentSheet = ss.getSheetByName(`${sanitizedName}_학생`);
      const snapshotSheet = ss.getSheetByName(`${sanitizedName}_스냅샷`);

      if (!studentSheet || !snapshotSheet) continue;

      const studentLastRow = studentSheet.getLastRow();
      if (studentLastRow < 2) continue;

      // 학생 데이터 가져오기
      const studentData = studentSheet.getRange(2, 3, studentLastRow - 1, 4).getValues();

      // 스냅샷 기록
      for (const row of studentData) {
        const [code, cookie] = row;
        if (!code) continue;

        // 기존 스냅샷 찾기
        const snapshotLastRow = snapshotSheet.getLastRow();
        let existingRow = -1;

        if (snapshotLastRow > 1) {
          const snapshotData = snapshotSheet.getRange(2, 1, snapshotLastRow - 1, 2).getValues();
          for (let i = 0; i < snapshotData.length; i++) {
            if (snapshotData[i][0] == currentWeek && snapshotData[i][1] == code) {
              existingRow = i + 2;
              break;
            }
          }
        }

        if (existingRow > 0) {
          // 기존 행 업데이트
          const colIndex = snapshotType === 'B_mon' ? 4 : 5;
          snapshotSheet.getRange(existingRow, colIndex).setValue(cookie);

          // earned_round 계산 (수요일인 경우)
          if (snapshotType === 'B_wed') {
            const bMon = snapshotSheet.getRange(existingRow, 4).getValue();
            const earned = Math.max(0, cookie - bMon);
            snapshotSheet.getRange(existingRow, 6).setValue(earned);
          }
        } else {
          // 새 행 추가
          const newRow = [
            currentWeek,
            code,
            '', // 팀ID (나중에)
            snapshotType === 'B_mon' ? cookie : '',
            snapshotType === 'B_wed' ? cookie : '',
            '', // earned_round
            now
          ];
          snapshotSheet.appendRow(newRow);
        }

        totalSnapshots++;
      }
    }

    ui.alert(`✅ 완료!\n\n${snapshotName}이 완료되었습니다.\n${totalSnapshots}개 기록`);

  } catch (error) {
    ui.alert('❌ 오류 발생\n\n' + error.message);
  }
}

// ========================================
// 6. 도움말
// ========================================
function showHelp() {
  const ui = SpreadsheetApp.getUi();

  const helpText = `
📚 다했니 Google Sheets 사용 가이드

1️⃣ 클래스 목록 불러오기
   - 다했니 API에서 학급 목록을 가져옵니다
   - 각 학급별 시트를 자동 생성합니다

2️⃣ 학생 정보 동기화
   - 각 학급 시트의 학생 코드를 읽어
   - 다했니 API에서 최신 정보를 가져옵니다
   - 쿠키, 초코칩 등이 자동 업데이트됩니다

3️⃣ 스냅샷 실행
   - 월요일: B_mon (주간 시작 쿠키)
   - 수요일: B_wed (라운드 확정 쿠키)
   - earned_round = B_wed - B_mon

💡 사용 순서:
1. [설정] 시트에 API 키 입력
2. 클래스 목록 불러오기
3. 각 학급_학생 시트에 CSV 붙여넣기
4. 학생 정보 동기화
5. 매주 스냅샷 실행

📞 문의: GitHub Issues
  `;

  ui.alert('도움말', helpText, ui.ButtonSet.OK);
}
