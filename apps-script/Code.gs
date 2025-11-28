// ========================================
// 다했니 Google Sheets 연동 Apps Script
// 리팩토링 버전 v2.0
// ========================================

const API_BASE = 'https://api.dahandin.com/openapi/v1';

// ========================================
// 시트 구조
// ========================================
// 공용: 설정, 학급목록, 상점
// 클래스별: {학급}_학생, {학급}_팀, {학급}_잔디, {학급}_소원, {학급}_전투

// ========================================
// 학생 시트 컬럼 (프로필 통합)
// ========================================
// A: 번호
// B: 이름
// C: 학생코드
// D: 쿠키
// E: 사용쿠키
// F: 총쿠키
// G: 초코칩
// H: 이전쿠키 (전투 기준점)
// I: 이모지코드
// J: 칭호
// K: 칭호색상코드
// L: 테두리코드
// M: 이름효과코드
// N: 배경코드
// O: 구매목록 (쉼표 구분)
// P: 마지막업데이트

const STUDENT_HEADERS = [
  '번호', '이름', '학생코드', '쿠키', '사용쿠키', '총쿠키', '초코칩',
  '이전쿠키', '이모지코드', '칭호', '칭호색상코드', '테두리코드',
  '이름효과코드', '배경코드', '구매목록', '마지막업데이트'
];

const TEAM_HEADERS = ['팀ID', '팀명', '플래그', '멤버(학생코드)', '팀쿠키'];
// 잔디 시트: 열 기반 구조 (학생코드, 이름, 날짜1, 날짜2, ...)
const GRASS_HEADERS = ['학생코드', '이름'];
const WISH_HEADERS = ['ID', '학생코드', '학생이름', '내용', '작성일시', '좋아요', '선정여부', '보상쿠키'];
const BATTLE_HEADERS = ['전투ID', '날짜', '팀ID', '공격대상', '공격배팅', '방어배팅', '승패', '쿠키변동', '라운드증가량'];
const SHOP_HEADERS = ['코드', '카테고리', '이름', '가격', '값', '설명'];

// ========================================
// 0. Web App 엔드포인트 (GET)
// ========================================
function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action;

    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    let result;

    switch (action) {
      // === 기본 ===
      case 'ping':
        result = { success: true, message: '연결 성공! v2.0' };
        break;

      case 'getClassList':
        result = getClassListFromSheets();
        break;

      case 'setClassActivation':
        result = setClassActivation(params.className, params.active);
        break;

      case 'findStudent':
        result = findStudentInAllClasses(params.code);
        break;

      // === 학생 ===
      case 'getStudent':
        result = getStudentData(params.className, params.code);
        break;

      case 'getClassStudents':
        result = getClassStudentsData(params.className);
        break;

      // === 팀 ===
      case 'getTeams':
        result = getTeamsData(params.className);
        break;

      // === 잔디 ===
      case 'getGrass':
        result = getGrassData(params.className, params.code);
        break;

      case 'checkTodayGrass':
        result = checkTodayGrass(params.className, params.code);
        break;

      // === 소원 ===
      case 'getWishes':
        result = getWishesData(params.className);
        break;

      case 'getStudentWishToday':
        result = getStudentWishToday(params.className, params.code);
        break;

      case 'getWishStreak':
        result = getWishStreak(params.className, params.code);
        break;

      // === 전투 ===
      case 'getBattles':
        result = getBattlesData(params.className);
        break;

      case 'getLastBattle':
        result = getLastBattleDate(params.className);
        break;

      // === 상점 ===
      case 'getShopItems':
        result = getShopItems();
        break;

      default:
        result = { success: false, message: '올바르지 않은 action입니다.' };
    }

    output.setContent(JSON.stringify(result));
    return output;

  } catch (error) {
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    output.setContent(JSON.stringify({ success: false, message: error.message }));
    return output;
  }
}

// ========================================
// 0. Web App 엔드포인트 (POST)
// ========================================
function doPost(e) {
  try {
    const params = e.parameter;
    const action = params.action;

    let postData = {};
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (err) {}
    }

    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    let result;

    switch (action) {
      // === 소원 ===
      case 'addWish':
        result = addWish(params.className, params.code, params.name, params.content);
        break;

      case 'likeWish':
        result = likeWish(params.className, params.wishId, params.code);
        break;

      case 'unlikeWish':
        result = unlikeWish(params.className, params.wishId, params.code);
        break;

      case 'grantWish':
        result = grantWish(params.className, params.wishId, Number(params.reward) || 50);
        break;

      case 'deleteWish':
        result = deleteWish(params.className, params.wishId);
        break;

      // === 프로필 ===
      case 'saveProfile':
        result = saveProfile(params.className, params.code, postData);
        break;

      // === 상점 ===
      case 'purchaseItem':
        result = purchaseItem(params.className, params.code, params.itemCode);
        break;

      // === 팀 ===
      case 'saveTeams':
        result = saveTeams(params.className, postData.teams);
        break;

      // === 전투 ===
      case 'saveBattleResult':
        result = saveBattleResult(params.className, postData);
        break;

      case 'updatePreviousCookies':
        result = updatePreviousCookies(params.className);
        break;

      // === 잔디 ===
      case 'addGrass':
        result = addGrass(params.className, params.code, Number(params.cookieChange) || 1);
        break;

      case 'refreshCookies':
        result = refreshCookies(params.className);
        break;

      default:
        result = { success: false, message: '올바르지 않은 action입니다.' };
    }

    output.setContent(JSON.stringify(result));
    return output;

  } catch (error) {
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    output.setContent(JSON.stringify({ success: false, message: error.message }));
    return output;
  }
}

// ========================================
// 1. 유틸리티 함수
// ========================================

function getApiKey() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName('설정');
  if (!settingsSheet) throw new Error('⚠️ [설정] 시트를 찾을 수 없습니다.');
  const apiKey = settingsSheet.getRange('A2').getValue();
  if (!apiKey) throw new Error('⚠️ [설정] 시트의 A2 셀에 API 키를 입력해주세요.');
  return apiKey;
}

function callApi(endpoint, params = {}) {
  const apiKey = getApiKey();
  let url = API_BASE + endpoint;
  if (Object.keys(params).length > 0) {
    const queryString = Object.keys(params).map(key => `${key}=${encodeURIComponent(params[key])}`).join('&');
    url += '?' + queryString;
  }
  const options = { method: 'get', headers: { 'X-API-Key': apiKey }, muteHttpExceptions: true };
  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  if (!json.result) throw new Error('API 오류: ' + json.message);
  return json.data;
}

function getOrCreateSheet(sheetName, headers = []) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function sanitizeSheetName(name) {
  if (!name) return 'Unnamed';
  return String(name).replace(/[\[\]\*\?\\\/]/g, '').substring(0, 100);
}

// ========================================
// 2. 클래스 및 학생 기본 기능
// ========================================

function getClassListFromSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 먼저 학급목록 시트에서 활성화 정보 가져오기
  const listSheet = ss.getSheetByName('학급목록');
  const activationMap = {};

  if (listSheet) {
    const lastRow = listSheet.getLastRow();
    if (lastRow > 1) {
      const data = listSheet.getRange(2, 1, lastRow - 1, 4).getValues();
      data.forEach(row => {
        const className = sanitizeSheetName(row[0]);
        // D열 (index 3): 활성화 상태, 기본값은 1
        activationMap[className] = row[3] === 0 ? false : true;
      });
    }
  }

  const sheets = ss.getSheets();
  const classList = [];

  for (let i = 0; i < sheets.length; i++) {
    const sheetName = sheets[i].getName();
    if (sheetName.endsWith('_학생')) {
      const className = sheetName.replace('_학생', '');
      classList.push({
        name: className,
        studentCount: Math.max(0, sheets[i].getLastRow() - 1),
        active: activationMap[className] !== undefined ? activationMap[className] : true
      });
    }
  }

  return { success: true, data: classList };
}

// 클래스 활성화 상태 설정
function setClassActivation(className, active) {
  if (!className) {
    return { success: false, message: '학급명이 필요합니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const listSheet = ss.getSheetByName('학급목록');

  if (!listSheet) {
    return { success: false, message: '학급목록 시트를 찾을 수 없습니다.' };
  }

  const lastRow = listSheet.getLastRow();
  if (lastRow < 2) {
    return { success: false, message: '학급목록이 비어있습니다.' };
  }

  // 학급명 찾기
  const classNames = listSheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  const sanitizedTarget = sanitizeSheetName(className);

  for (let i = 0; i < classNames.length; i++) {
    if (sanitizeSheetName(classNames[i]) === sanitizedTarget) {
      // D열에 활성화 상태 설정 (1 또는 0)
      const activeValue = (active === 'true' || active === true || active === '1' || active === 1) ? 1 : 0;
      listSheet.getRange(i + 2, 4).setValue(activeValue);
      return {
        success: true,
        message: `${className} 활성화 상태: ${activeValue === 1 ? '활성' : '비활성'}`
      };
    }
  }

  return { success: false, message: '학급을 찾을 수 없습니다.' };
}

function findStudentInAllClasses(studentCode) {
  if (!studentCode) return { success: false, message: '학생 코드가 필요합니다.' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();

  for (let i = 0; i < sheets.length; i++) {
    const sheetName = sheets[i].getName();
    if (sheetName.endsWith('_학생')) {
      const className = sheetName.replace('_학생', '');
      const lastRow = sheets[i].getLastRow();
      if (lastRow < 2) continue;

      const data = sheets[i].getRange(2, 1, lastRow - 1, 3).getValues();
      for (let j = 0; j < data.length; j++) {
        if (data[j][2] === studentCode) {
          return {
            success: true,
            data: {
              className: className,
              number: Number(data[j][0]) || 0,
              name: String(data[j][1] || ''),
              code: String(data[j][2] || '')
            }
          };
        }
      }
    }
  }

  return { success: false, message: '학생을 찾을 수 없습니다.' };
}

function getStudentData(className, studentCode) {
  if (!className || !studentCode) return { success: false, message: '학급명과 학생코드가 필요합니다.' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(`${sanitizeSheetName(className)}_학생`);
  if (!sheet) return { success: false, message: '학급 시트를 찾을 수 없습니다.' };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false, message: '학생 데이터가 없습니다.' };

  const data = sheet.getRange(2, 1, lastRow - 1, 16).getValues();

  for (let i = 0; i < data.length; i++) {
    if (data[i][2] === studentCode) {
      return {
        success: true,
        data: {
          number: Number(data[i][0]) || 0,
          name: String(data[i][1] || ''),
          code: String(data[i][2] || ''),
          cookie: Number(data[i][3]) || 0,
          usedCookie: Number(data[i][4]) || 0,
          totalCookie: Number(data[i][5]) || 0,
          chocoChips: Number(data[i][6]) || 0,
          previousCookie: Number(data[i][7]) || 0,
          // 프로필
          emojiCode: String(data[i][8] || 'emoji_00'),
          title: String(data[i][9] || ''),
          titleColorCode: String(data[i][10] || 'title_00'),
          borderCode: String(data[i][11] || 'border_00'),
          nameEffectCode: String(data[i][12] || 'name_00'),
          backgroundCode: String(data[i][13] || 'bg_00'),
          ownedItems: data[i][14] ? String(data[i][14]).split(',').filter(x => x) : [],
          lastUpdate: String(data[i][15] || '')
        }
      };
    }
  }

  return { success: false, message: '학생을 찾을 수 없습니다.' };
}

function getClassStudentsData(className) {
  if (!className) return { success: false, message: '학급명이 필요합니다.' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(`${sanitizeSheetName(className)}_학생`);
  if (!sheet) return { success: false, message: '학급 시트를 찾을 수 없습니다.' };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, data: [] };

  const data = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
  const students = data.filter(row => row[2]).map(row => ({
    number: Number(row[0]) || 0,
    name: String(row[1] || ''),
    code: String(row[2] || ''),
    cookie: Number(row[3]) || 0,
    usedCookie: Number(row[4]) || 0,
    totalCookie: Number(row[5]) || 0,
    chocoChips: Number(row[6]) || 0,
    previousCookie: Number(row[7]) || 0,
    emojiCode: String(row[8] || 'emoji_00'),
    title: String(row[9] || ''),
    titleColorCode: String(row[10] || 'title_00'),
    borderCode: String(row[11] || 'border_00'),
    nameEffectCode: String(row[12] || 'name_00'),
    backgroundCode: String(row[13] || 'bg_00'),
    ownedItems: row[14] ? String(row[14]).split(',').filter(x => x) : [],
    lastUpdate: String(row[15] || '')
  }));

  return { success: true, data: students };
}

// ========================================
// 3. 프로필 저장
// ========================================

function saveProfile(className, studentCode, profileData) {
  if (!className || !studentCode) return { success: false, message: '필수 값이 누락되었습니다.' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(`${sanitizeSheetName(className)}_학생`);
  if (!sheet) return { success: false, message: '학급 시트를 찾을 수 없습니다.' };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false, message: '학생을 찾을 수 없습니다.' };

  const codes = sheet.getRange(2, 3, lastRow - 1, 1).getValues().flat();
  const rowIndex = codes.indexOf(studentCode);
  if (rowIndex < 0) return { success: false, message: '학생을 찾을 수 없습니다.' };

  const row = rowIndex + 2;

  // 프로필 컬럼 업데이트 (I~N: 9~14)
  sheet.getRange(row, 9).setValue(profileData.emojiCode || 'emoji_00');
  sheet.getRange(row, 10).setValue((profileData.title || '').substring(0, 5));
  sheet.getRange(row, 11).setValue(profileData.titleColorCode || 'title_00');
  sheet.getRange(row, 12).setValue(profileData.borderCode || 'border_00');
  sheet.getRange(row, 13).setValue(profileData.nameEffectCode || 'name_00');
  sheet.getRange(row, 14).setValue(profileData.backgroundCode || 'bg_00');
  sheet.getRange(row, 16).setValue(new Date());

  return { success: true };
}

// ========================================
// 4. 상점
// ========================================

function getShopItems() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet('상점', SHOP_HEADERS);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    // 기본 상점 아이템 생성
    initializeShopItems();
    return getShopItems();
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const items = data.filter(row => row[0]).map(row => ({
    code: String(row[0]),
    category: String(row[1]),
    name: String(row[2]),
    price: Number(row[3]) || 0,
    value: String(row[4]),
    description: String(row[5] || '')
  }));

  return { success: true, data: items };
}

function initializeShopItems() {
  const sheet = getOrCreateSheet('상점', SHOP_HEADERS);

  // 기본 아이템 목록
  const items = [
    // 이모지
    ['emoji_00', 'emoji', '😀 기본', 0, '😀', '기본 이모지'],
    ['emoji_01', 'emoji', '😎 쿨한', 5, '😎', ''],
    ['emoji_02', 'emoji', '🤩 스타', 5, '🤩', ''],
    ['emoji_03', 'emoji', '🥳 파티', 10, '🥳', ''],
    ['emoji_04', 'emoji', '🦁 사자', 15, '🦁', ''],
    ['emoji_05', 'emoji', '🐉 드래곤', 20, '🐉', ''],
    ['emoji_06', 'emoji', '👑 왕관', 30, '👑', ''],
    ['emoji_07', 'emoji', '💎 다이아', 30, '💎', ''],
    // 테두리
    ['border_00', 'border', '없음', 0, 'none', ''],
    ['border_01', 'border', '기본', 0, 'solid', ''],
    ['border_02', 'border', '🌈 무지개', 20, 'gradient-rainbow', ''],
    ['border_03', 'border', '🥇 골드', 25, 'gradient-gold', ''],
    ['border_04', 'border', '💙 네온블루', 30, 'neon-blue', ''],
    ['border_05', 'border', '💗 네온핑크', 30, 'neon-pink', ''],
    ['border_06', 'border', '✨ 반짝임', 35, 'sparkle', ''],
    // 이름효과
    ['name_00', 'nameEffect', '기본', 0, 'none', ''],
    ['name_01', 'nameEffect', '🌈 무지개', 15, 'gradient-rainbow', ''],
    ['name_02', 'nameEffect', '🔥 불꽃', 15, 'gradient-fire', ''],
    ['name_03', 'nameEffect', '✨ 골드글로우', 25, 'glow-gold', ''],
    // 배경
    ['bg_00', 'background', '없음', 0, 'none', ''],
    ['bg_01', 'background', '점무늬', 10, 'dots', ''],
    ['bg_02', 'background', '⭐ 별', 15, 'stars', ''],
    ['bg_03', 'background', '💕 하트', 15, 'hearts', ''],
    // 칭호색상
    ['title_00', 'titleColor', '빨강', 0, '0', ''],
    ['title_01', 'titleColor', '파랑', 0, '4', ''],
    ['title_05', 'titleColor', '💜 보라', 10, '5', ''],
    ['title_08', 'titleColor', '🥇 골드', 20, '8', ''],
    ['title_09', 'titleColor', '🌈 무지개', 25, '9', ''],
  ];

  sheet.getRange(2, 1, items.length, 6).setValues(items);
}

function purchaseItem(className, studentCode, itemCode) {
  if (!className || !studentCode || !itemCode) {
    return { success: false, message: '필수 값이 누락되었습니다.' };
  }

  // 학생 정보 가져오기
  const studentResult = getStudentData(className, studentCode);
  if (!studentResult.success) return studentResult;
  const student = studentResult.data;

  // 이미 구매한 아이템인지 확인
  if (student.ownedItems.includes(itemCode)) {
    return { success: false, message: '이미 보유 중인 아이템입니다.' };
  }

  // 상점 아이템 정보 가져오기
  const shopResult = getShopItems();
  if (!shopResult.success) return shopResult;
  const item = shopResult.data.find(i => i.code === itemCode);
  if (!item) return { success: false, message: '아이템을 찾을 수 없습니다.' };

  // 가격 확인 (총쿠키로 구매)
  if (student.totalCookie < item.price) {
    return { success: false, message: `쿠키가 부족합니다. (필요: ${item.price}, 보유: ${student.totalCookie})` };
  }

  // 시트 업데이트
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(`${sanitizeSheetName(className)}_학생`);
  const lastRow = sheet.getLastRow();
  const codes = sheet.getRange(2, 3, lastRow - 1, 1).getValues().flat();
  const rowIndex = codes.indexOf(studentCode);
  if (rowIndex < 0) return { success: false, message: '학생을 찾을 수 없습니다.' };
  const row = rowIndex + 2;

  // 구매목록 업데이트 (O열: 15)
  const newOwnedItems = [...student.ownedItems, itemCode];
  sheet.getRange(row, 15).setValue(newOwnedItems.join(','));

  // 사용쿠키 업데이트 (E열: 5)
  sheet.getRange(row, 5).setValue(student.usedCookie + item.price);

  return { success: true, data: { itemCode, price: item.price } };
}

// ========================================
// 5. 팀 관리
// ========================================

function getTeamsData(className) {
  if (!className) return { success: false, message: '학급명이 필요합니다.' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(`${sanitizeSheetName(className)}_팀`);
  if (!sheet) return { success: true, data: [] };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, data: [] };

  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const teams = data.filter(row => row[0]).map(row => ({
    teamId: String(row[0]),
    teamName: String(row[1]),
    flag: String(row[2]),
    members: row[3] ? String(row[3]).split(',').filter(x => x) : [],
    teamCookie: Number(row[4]) || 0
  }));

  return { success: true, data: teams };
}

function saveTeams(className, teams) {
  if (!className || !teams) return { success: false, message: '필수 값이 누락되었습니다.' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(`${sanitizeSheetName(className)}_팀`, TEAM_HEADERS);

  // 기존 데이터 삭제
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 5).clearContent();
  }

  // 새 데이터 입력
  if (teams.length > 0) {
    const data = teams.map(team => [
      team.teamId,
      team.teamName,
      team.flag || '',
      team.members ? team.members.join(',') : '',
      team.teamCookie || 0
    ]);
    sheet.getRange(2, 1, data.length, 5).setValues(data);
  }

  return { success: true };
}

// ========================================
// 6. 잔디 (매일 쿠키 변화량)
// ========================================

function getGrassData(className, studentCode) {
  if (!className) return { success: false, message: '학급명이 필요합니다.' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(`${sanitizeSheetName(className)}_잔디`);
  if (!sheet) return { success: true, data: [] };

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 3) return { success: true, data: [] };

  // 헤더 (날짜들) 가져오기
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  // headers[0] = '학생코드', headers[1] = '이름', headers[2+] = 날짜들

  // 데이터 가져오기
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  let grassData = [];

  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    const code = String(row[0]);
    const name = String(row[1]);

    // 특정 학생 필터링
    if (studentCode && code !== studentCode) continue;

    // 각 날짜별 데이터 추출
    for (let colIdx = 2; colIdx < headers.length; colIdx++) {
      const dateHeader = String(headers[colIdx]);
      if (!dateHeader) continue;

      const cookieChange = Number(row[colIdx]) || 0;

      // 날짜에서 기본 날짜 추출 (2024-11-28(2) -> 2024-11-28)
      const baseDate = dateHeader.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || dateHeader;
      // 새로고침 횟수 추출 (2024-11-28(2) -> 2)
      const refreshMatch = dateHeader.match(/\((\d+)\)$/);
      const refreshCount = refreshMatch ? parseInt(refreshMatch[1]) : 1;

      grassData.push({
        date: baseDate,
        dateColumn: dateHeader,
        studentCode: code,
        studentName: name,
        cookieChange: cookieChange,
        refreshCount: refreshCount
      });
    }
  }

  return { success: true, data: grassData };
}

// 잔디 추가 (미션 완료 시)
function addGrass(className, studentCode, cookieChange) {
  if (!className || !studentCode) {
    return { success: false, message: '학급명과 학생코드가 필요합니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(`${sanitizeSheetName(className)}_잔디`, GRASS_HEADERS);
  const today = new Date().toISOString().split('T')[0];

  // 오늘 이미 잔디가 있는지 확인
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (let i = 0; i < data.length; i++) {
      const rowDate = data[i][0] ? new Date(data[i][0]).toISOString().split('T')[0] : null;
      if (rowDate === today && data[i][1] === studentCode) {
        return { success: false, message: '오늘은 이미 잔디를 심었습니다.' };
      }
    }
  }

  // 잔디 추가
  sheet.appendRow([today, studentCode, cookieChange || 1]);

  return { success: true, data: { date: today, studentCode, cookieChange: cookieChange || 1 } };
}

// 오늘 잔디 여부 확인
function checkTodayGrass(className, studentCode) {
  if (!className || !studentCode) {
    return { success: false, message: '학급명과 학생코드가 필요합니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(`${sanitizeSheetName(className)}_잔디`);
  if (!sheet) return { success: true, data: { hasGrass: false } };

  const today = new Date().toISOString().split('T')[0];
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return { success: true, data: { hasGrass: false } };

  const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  for (let i = 0; i < data.length; i++) {
    const rowDate = data[i][0] ? new Date(data[i][0]).toISOString().split('T')[0] : null;
    if (rowDate === today && data[i][1] === studentCode) {
      return { success: true, data: { hasGrass: true } };
    }
  }

  return { success: true, data: { hasGrass: false } };
}

// 쿠키 새로고침 - 수동으로 현재 쿠키 상태를 잔디에 기록 (열 기반 구조)
// 같은 날 여러번 호출하면 (2), (3) 형태로 열 추가
function refreshCookies(className) {
  if (!className) {
    return { success: false, message: '학급명이 필요합니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sanitized = sanitizeSheetName(className);
  const studentSheet = ss.getSheetByName(`${sanitized}_학생`);

  if (!studentSheet) {
    return { success: false, message: '학생 시트를 찾을 수 없습니다.' };
  }

  const grassSheet = getOrCreateSheet(`${sanitized}_잔디`, GRASS_HEADERS);
  const today = new Date().toISOString().split('T')[0];

  // 학생 데이터 가져오기 (B열: 이름, C열: 학생코드, D열: 쿠키, H열: 이전쿠키)
  const studentLastRow = studentSheet.getLastRow();
  if (studentLastRow < 2) {
    return { success: false, message: '학생 데이터가 없습니다.' };
  }

  const studentData = studentSheet.getRange(2, 2, studentLastRow - 1, 7).getValues();

  // 잔디 시트의 현재 헤더 가져오기
  const grassLastCol = Math.max(grassSheet.getLastColumn(), 2);
  const headers = grassSheet.getRange(1, 1, 1, grassLastCol).getValues()[0];

  // 오늘 새로고침 횟수 확인 (기존 헤더에서)
  let refreshCount = 1;
  for (let i = 2; i < headers.length; i++) {
    const headerStr = String(headers[i]);
    const baseDateMatch = headerStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (baseDateMatch && baseDateMatch[1] === today) {
      const countMatch = headerStr.match(/\((\d+)\)$/);
      if (countMatch) {
        refreshCount = Math.max(refreshCount, parseInt(countMatch[1]) + 1);
      } else {
        refreshCount = Math.max(refreshCount, 2);
      }
    }
  }

  // 날짜 문자열 생성 (첫번째면 그냥 날짜, 두번째부터 (2), (3)...)
  const dateString = refreshCount === 1 ? today : `${today}(${refreshCount})`;

  // 새 열 추가 (헤더에 날짜 추가)
  const newColIndex = grassLastCol + 1;
  grassSheet.getRange(1, newColIndex).setValue(dateString);

  // 잔디 시트의 기존 학생 목록 가져오기
  const grassLastRow = grassSheet.getLastRow();
  let existingStudents = {};
  if (grassLastRow >= 2) {
    const grassData = grassSheet.getRange(2, 1, grassLastRow - 1, 2).getValues();
    grassData.forEach((row, idx) => {
      existingStudents[String(row[0])] = idx + 2; // 행 번호 저장
    });
  }

  let studentsUpdated = 0;
  let newRowIndex = grassLastRow + 1;

  for (const row of studentData) {
    const name = String(row[0]);
    const code = String(row[1]);
    const currentCookie = Number(row[2]) || 0;
    const previousCookie = Number(row[6]) || 0; // H열 (이전쿠키)

    if (!code) continue;

    const cookieChange = currentCookie - previousCookie;

    if (existingStudents[code]) {
      // 기존 학생: 새 열에 값 추가
      grassSheet.getRange(existingStudents[code], newColIndex).setValue(cookieChange);
    } else {
      // 새 학생: 행 추가
      grassSheet.getRange(newRowIndex, 1).setValue(code);
      grassSheet.getRange(newRowIndex, 2).setValue(name);
      grassSheet.getRange(newRowIndex, newColIndex).setValue(cookieChange);
      existingStudents[code] = newRowIndex;
      newRowIndex++;
    }
    studentsUpdated++;
  }

  // 이전쿠키 업데이트 (현재쿠키로)
  for (let i = 2; i <= studentLastRow; i++) {
    const currentCookie = studentSheet.getRange(i, 4).getValue();
    studentSheet.getRange(i, 8).setValue(currentCookie);
  }

  return {
    success: true,
    data: {
      date: dateString,
      refreshCount: refreshCount,
      studentsUpdated: studentsUpdated
    }
  };
}

// 매일 자동 실행될 함수 (트리거 설정 필요)
function dailyGrassUpdate() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const listSheet = ss.getSheetByName('학급목록');
  if (!listSheet) return;

  const lastRow = listSheet.getLastRow();
  if (lastRow < 2) return;

  const classNames = listSheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  const today = new Date().toISOString().split('T')[0];

  for (const className of classNames) {
    const sanitized = sanitizeSheetName(className);
    const studentSheet = ss.getSheetByName(`${sanitized}_학생`);
    if (!studentSheet) continue;

    const grassSheet = getOrCreateSheet(`${sanitized}_잔디`, GRASS_HEADERS);

    const studentLastRow = studentSheet.getLastRow();
    if (studentLastRow < 2) continue;

    // 학생 데이터 가져오기 (코드, 현재쿠키, 이전쿠키)
    const studentData = studentSheet.getRange(2, 3, studentLastRow - 1, 6).getValues();

    for (const row of studentData) {
      const code = row[0];
      const currentCookie = Number(row[1]) || 0;
      const previousCookie = Number(row[5]) || 0; // H열 (이전쿠키)

      if (!code) continue;

      const cookieChange = currentCookie - previousCookie;

      // 잔디 시트에 기록
      grassSheet.appendRow([today, code, cookieChange]);
    }

    // 이전쿠키 업데이트 (현재쿠키로)
    for (let i = 2; i <= studentLastRow; i++) {
      const currentCookie = studentSheet.getRange(i, 4).getValue();
      studentSheet.getRange(i, 8).setValue(currentCookie);
    }
  }
}

// ========================================
// 7. 소원의 돌
// ========================================

function getWishSheet(className) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return getOrCreateSheet(`${sanitizeSheetName(className)}_소원`, WISH_HEADERS);
}

function getWishesData(className) {
  if (!className) return { success: false, message: '학급명이 필요합니다.' };

  const sheet = getWishSheet(className);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, data: [] };

  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  const wishes = data.filter(row => row[0]).map(row => ({
    id: String(row[0]),
    studentCode: String(row[1]),
    studentName: String(row[2]),
    content: String(row[3]),
    createdAt: row[4] ? new Date(row[4]).toISOString() : null,
    likes: row[5] ? String(row[5]).split(',').filter(x => x) : [],
    isGranted: row[6] === true || row[6] === 'TRUE',
    grantedReward: Number(row[7]) || 0
  })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { success: true, data: wishes };
}

function getStudentWishToday(className, studentCode) {
  if (!className || !studentCode) return { success: false, message: '필수 값이 누락되었습니다.' };

  const result = getWishesData(className);
  if (!result.success) return result;

  const today = new Date().toISOString().split('T')[0];
  const todayWish = result.data.find(w =>
    w.studentCode === studentCode &&
    w.createdAt &&
    w.createdAt.startsWith(today)
  );

  return { success: true, data: todayWish || null };
}

function getWishStreak(className, studentCode) {
  if (!className || !studentCode) return { success: false, message: '필수 값이 누락되었습니다.' };

  const result = getWishesData(className);
  if (!result.success) return result;

  const wishes = result.data.filter(w => w.studentCode === studentCode);
  const dates = wishes.map(w => w.createdAt ? w.createdAt.split('T')[0] : null).filter(d => d);

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];

    if (dates.includes(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return { success: true, data: { total: wishes.length, streak } };
}

function addWish(className, studentCode, studentName, content) {
  if (!className || !studentCode || !content) {
    return { success: false, message: '필수 값이 누락되었습니다.' };
  }

  const existingWish = getStudentWishToday(className, studentCode);
  if (existingWish.success && existingWish.data) {
    return { success: false, message: '오늘은 이미 소원을 적었습니다.' };
  }

  const sheet = getWishSheet(className);
  const wishId = 'wish_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const now = new Date();

  sheet.appendRow([
    wishId,
    studentCode,
    studentName || '',
    content.substring(0, 50),
    now,
    '',
    false,
    0
  ]);

  return { success: true, data: { id: wishId, createdAt: now.toISOString() } };
}

function likeWish(className, wishId, studentCode) {
  if (!className || !wishId || !studentCode) return { success: false, message: '필수 값이 누락되었습니다.' };

  const sheet = getWishSheet(className);
  const lastRow = sheet.getLastRow();

  for (let i = 2; i <= lastRow; i++) {
    if (sheet.getRange(i, 1).getValue() === wishId) {
      const currentLikes = String(sheet.getRange(i, 6).getValue() || '');
      const likesArray = currentLikes.split(',').filter(x => x);
      if (!likesArray.includes(studentCode)) {
        likesArray.push(studentCode);
        sheet.getRange(i, 6).setValue(likesArray.join(','));
      }
      return { success: true, likes: likesArray };
    }
  }

  return { success: false, message: '소원을 찾을 수 없습니다.' };
}

function unlikeWish(className, wishId, studentCode) {
  if (!className || !wishId || !studentCode) return { success: false, message: '필수 값이 누락되었습니다.' };

  const sheet = getWishSheet(className);
  const lastRow = sheet.getLastRow();

  for (let i = 2; i <= lastRow; i++) {
    if (sheet.getRange(i, 1).getValue() === wishId) {
      const currentLikes = String(sheet.getRange(i, 6).getValue() || '');
      const likesArray = currentLikes.split(',').filter(x => x && x !== studentCode);
      sheet.getRange(i, 6).setValue(likesArray.join(','));
      return { success: true, likes: likesArray };
    }
  }

  return { success: false, message: '소원을 찾을 수 없습니다.' };
}

function grantWish(className, wishId, reward) {
  if (!className || !wishId) return { success: false, message: '필수 값이 누락되었습니다.' };

  const sheet = getWishSheet(className);
  const lastRow = sheet.getLastRow();

  for (let i = 2; i <= lastRow; i++) {
    if (sheet.getRange(i, 1).getValue() === wishId) {
      sheet.getRange(i, 7).setValue(true);
      sheet.getRange(i, 8).setValue(reward || 50);
      return { success: true };
    }
  }

  return { success: false, message: '소원을 찾을 수 없습니다.' };
}

function deleteWish(className, wishId) {
  if (!className || !wishId) return { success: false, message: '필수 값이 누락되었습니다.' };

  const sheet = getWishSheet(className);
  const lastRow = sheet.getLastRow();

  for (let i = 2; i <= lastRow; i++) {
    if (sheet.getRange(i, 1).getValue() === wishId) {
      sheet.deleteRow(i);
      return { success: true };
    }
  }

  return { success: false, message: '소원을 찾을 수 없습니다.' };
}

// ========================================
// 8. 전투
// ========================================

function getBattleSheet(className) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return getOrCreateSheet(`${sanitizeSheetName(className)}_전투`, BATTLE_HEADERS);
}

function getBattlesData(className) {
  if (!className) return { success: false, message: '학급명이 필요합니다.' };

  const sheet = getBattleSheet(className);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, data: [] };

  const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  const battles = data.filter(row => row[0]).map(row => ({
    battleId: String(row[0]),
    date: row[1] ? new Date(row[1]).toISOString().split('T')[0] : null,
    teamId: String(row[2]),
    attackTarget: String(row[3]),
    attackBet: Number(row[4]) || 0,
    defenseBet: Number(row[5]) || 0,
    result: String(row[6]),
    cookieChange: Number(row[7]) || 0,
    roundEarned: Number(row[8]) || 0
  }));

  return { success: true, data: battles };
}

function getLastBattleDate(className) {
  if (!className) return { success: false, message: '학급명이 필요합니다.' };

  const result = getBattlesData(className);
  if (!result.success) return result;

  if (result.data.length === 0) {
    return { success: true, data: null };
  }

  const dates = result.data.map(b => b.date).filter(d => d).sort().reverse();
  return { success: true, data: dates[0] || null };
}

function saveBattleResult(className, battleData) {
  if (!className || !battleData) return { success: false, message: '필수 값이 누락되었습니다.' };

  const sheet = getBattleSheet(className);
  const battleId = battleData.battleId || 'battle_' + Date.now();
  const today = new Date().toISOString().split('T')[0];

  // 각 팀별 결과 저장
  const results = battleData.results || [];
  for (const result of results) {
    sheet.appendRow([
      battleId,
      today,
      result.teamId,
      result.attackTarget || '',
      result.attackBet || 0,
      result.defenseBet || 0,
      result.result || '',
      result.cookieChange || 0,
      result.roundEarned || 0
    ]);
  }

  return { success: true, data: { battleId, date: today } };
}

function updatePreviousCookies(className) {
  if (!className) return { success: false, message: '학급명이 필요합니다.' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(`${sanitizeSheetName(className)}_학생`);
  if (!sheet) return { success: false, message: '학급 시트를 찾을 수 없습니다.' };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true };

  // 현재 쿠키를 이전쿠키로 복사
  for (let i = 2; i <= lastRow; i++) {
    const currentCookie = sheet.getRange(i, 4).getValue();
    sheet.getRange(i, 8).setValue(currentCookie);
  }

  return { success: true };
}

// ========================================
// 9. 메뉴 및 초기화
// ========================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎓 다했니 v2')
    .addItem('⚙️ 클래스 목록 불러오기', 'fetchClassList')
    .addItem('📤 학생목록 업로드', 'uploadStudentCsv')
    .addItem('🔄 학생 정보 동기화', 'syncStudentInfo')
    .addSeparator()
    .addItem('🛒 상점 초기화', 'initializeShopItems')
    .addItem('🌱 잔디 업데이트 (수동)', 'dailyGrassUpdate')
    .addSeparator()
    .addItem('❓ 도움말', 'showHelp')
    .addToUi();
}

function fetchClassList() {
  const ui = SpreadsheetApp.getUi();
  try {
    const classList = callApi('/get/class/list');
    if (!classList || classList.length === 0) {
      ui.alert('⚠️ 클래스 목록이 비어있습니다.');
      return;
    }

    const listSheet = getOrCreateSheet('학급목록', ['학급명', '학생수', '마지막 업데이트', '활성화']);

    // 기존 활성화 상태 보존
    const existingActivation = {};
    const existingLastRow = listSheet.getLastRow();
    if (existingLastRow > 1) {
      const existingData = listSheet.getRange(2, 1, existingLastRow - 1, 4).getValues();
      existingData.forEach(row => {
        if (row[0]) {
          existingActivation[sanitizeSheetName(row[0])] = row[3];
        }
      });
      listSheet.deleteRows(2, existingLastRow - 1);
    }

    const now = new Date().toLocaleString('ko-KR');
    const data = classList.map(cls => {
      const sanitizedName = sanitizeSheetName(cls.name);
      // 기존 활성화 상태가 있으면 유지, 없으면 기본값 1
      const activation = existingActivation[sanitizedName] !== undefined
        ? existingActivation[sanitizedName]
        : 1;
      return [cls.name, 0, now, activation];
    });

    listSheet.getRange(2, 1, data.length, 4).setValues(data);

    // 활성화된 학급만 시트 생성
    let createdCount = 0;
    classList.forEach((cls, index) => {
      const className = sanitizeSheetName(cls.name);
      const activation = data[index][3];
      if (activation === 1) {
        createClassSheets(className);
        createdCount++;
      }
    });

    ui.alert(`✅ 완료!\n\n전체 ${classList.length}개 학급 중 ${createdCount}개 활성화 학급의 시트가 생성되었습니다.\n\n💡 학급목록 시트의 D열(활성화)에서 활성화 여부를 설정하세요.\n(1=활성, 0=비활성)`);
  } catch (error) {
    ui.alert('❌ 오류 발생\n\n' + error.message);
  }
}

function createClassSheets(className) {
  getOrCreateSheet(`${className}_학생`, STUDENT_HEADERS);
  getOrCreateSheet(`${className}_팀`, TEAM_HEADERS);
  getOrCreateSheet(`${className}_잔디`, GRASS_HEADERS);
  getOrCreateSheet(`${className}_소원`, WISH_HEADERS);
  getOrCreateSheet(`${className}_전투`, BATTLE_HEADERS);
}

function uploadStudentCsv() {
  const html = HtmlService.createHtmlOutputFromFile('upload_csv_ui')
    .setWidth(400)
    .setHeight(220);
  SpreadsheetApp.getUi().showModalDialog(html, '학생 목록 CSV 업로드');
}

function processStudentCsv(filename, content) {
  try {
    if (!filename.startsWith("학생목록_템플릿_")) {
      throw new Error("파일명이 '학생목록_템플릿_학급명.csv' 형식이 아닙니다.");
    }

    const className = filename.replace("학생목록_템플릿_", "").replace(".csv", "");
    const sanitized = sanitizeSheetName(className);
    const targetSheetName = `${sanitized}_학생`;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(targetSheetName);
    if (!sheet) throw new Error(`시트 '${targetSheetName}' 을(를) 찾을 수 없습니다.`);

    let rows = Utilities.parseCsv(content);
    if (!rows || rows.length === 0) throw new Error("CSV 데이터가 비어있습니다.");

    rows = rows.slice(1);
    if (rows.length === 0) throw new Error("헤더를 제외한 데이터가 없습니다.");

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    }

    // CSV 데이터 + 기본 프로필 값 추가
    const fullRows = rows.map(row => {
      const fullRow = [...row];
      while (fullRow.length < 16) fullRow.push('');
      // 기본 프로필 설정
      if (!fullRow[8]) fullRow[8] = 'emoji_00';
      if (!fullRow[10]) fullRow[10] = 'title_00';
      if (!fullRow[11]) fullRow[11] = 'border_00';
      if (!fullRow[12]) fullRow[12] = 'name_00';
      if (!fullRow[13]) fullRow[13] = 'bg_00';
      return fullRow;
    });

    sheet.getRange(2, 1, fullRows.length, 16).setValues(fullRows);
    return true;
  } catch (err) {
    throw new Error(err.message);
  }
}

function syncStudentInfo() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    const listSheet = ss.getSheetByName('학급목록');
    if (!listSheet) {
      ui.alert('⚠️ 먼저 [클래스 목록 불러오기]를 실행해주세요.');
      return;
    }

    const lastRow = listSheet.getLastRow();
    if (lastRow < 2) {
      ui.alert('⚠️ 학급목록이 비어있습니다.');
      return;
    }

    // 활성화된 학급만 필터링
    const classData = listSheet.getRange(2, 1, lastRow - 1, 4).getValues();
    const activeClasses = classData.filter(row => row[3] !== 0).map(row => row[0]);

    if (activeClasses.length === 0) {
      ui.alert('⚠️ 활성화된 학급이 없습니다.\n학급목록 시트의 D열(활성화)을 확인해주세요.');
      return;
    }

    const classNames = activeClasses;
    let totalUpdated = 0;

    for (let i = 0; i < classNames.length; i++) {
      const className = sanitizeSheetName(classNames[i]);
      const studentSheet = ss.getSheetByName(`${className}_학생`);
      if (!studentSheet) continue;

      const studentLastRow = studentSheet.getLastRow();
      if (studentLastRow < 2) continue;

      const studentCodes = studentSheet.getRange(2, 3, studentLastRow - 1, 1).getValues().flat();
      const now = new Date().toLocaleString('ko-KR');

      for (let j = 0; j < studentCodes.length; j++) {
        const code = studentCodes[j];
        if (!code) continue;

        try {
          const studentInfo = callApi('/get/student/total', { code: code });
          const row = j + 2;
          studentSheet.getRange(row, 4, 1, 4).setValues([[
            studentInfo.cookie || 0,
            studentInfo.usedCookie || 0,
            studentInfo.totalCookie || 0,
            studentInfo.chocoChips || 0
          ]]);
          studentSheet.getRange(row, 16).setValue(now);
          totalUpdated++;
          Utilities.sleep(100);
        } catch (error) {
          Logger.log(`${className} - ${code}: ${error.message}`);
        }
      }

      listSheet.getRange(i + 2, 2).setValue(studentCodes.filter(c => c).length);
    }

    ui.alert(`✅ 완료!\n\n${totalUpdated}명의 학생 정보가 업데이트되었습니다.`);
  } catch (error) {
    ui.alert('❌ 오류 발생\n\n' + error.message);
  }
}

function showHelp() {
  const ui = SpreadsheetApp.getUi();
  const helpText = `
📚 다했니 v2.0 사용 가이드

📂 시트 구조:
- 공용: 설정, 학급목록, 상점
- 클래스별: _학생, _팀, _잔디, _소원, _전투

🔧 사용 순서:
1. [설정] 시트에 API 키 입력
2. 클래스 목록 불러오기
3. 학생 CSV 업로드
4. 학생 정보 동기화

🌱 잔디 자동 업데이트:
- 트리거 설정: 편집 > 현재 프로젝트의 트리거
- dailyGrassUpdate 함수를 매일 실행 설정

📞 문의: GitHub Issues
  `;
  ui.alert('도움말', helpText, ui.ButtonSet.OK);
}
