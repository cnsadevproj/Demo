/**
 * 실시간 워드 클라우드 시스템
 * 멘티미터 스타일의 학생 참여형 워드 클라우드
 */

// ============================================
// 설정
// ============================================
const CONFIG = {
  SHEET_NAME: '응답',
  SESSION_SHEET: '세션',
  SETTINGS_SHEET: '설정',
  MAX_WORD_LENGTH: 20,
  MIN_WORD_LENGTH: 1
};

// ============================================
// 설정 관리
// ============================================
function getSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let settingsSheet = ss.getSheetByName(CONFIG.SETTINGS_SHEET);
  
  // 기본값
  const defaults = {
    customUrl: '',
    useCustomUrl: false
  };
  
  if (!settingsSheet) {
    return defaults;
  }
  
  const data = settingsSheet.getDataRange().getValues();
  const settings = Object.assign({}, defaults);
  
  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    const value = data[i][1];
    
    if (key === 'customUrl') {
      settings.customUrl = value || '';
      settings.useCustomUrl = !!value && value.toString().trim() !== '';
    }
  }
  
  return settings;
}

function saveSettings(customUrl) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let settingsSheet = ss.getSheetByName(CONFIG.SETTINGS_SHEET);
  
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(CONFIG.SETTINGS_SHEET);
    settingsSheet.appendRow(['설정키', '설정값', '설명']);
    settingsSheet.appendRow(['customUrl', '', '학생 참여 페이지 커스텀 URL (비워두면 기본 URL 사용)']);
    settingsSheet.setFrozenRows(1);
    settingsSheet.setColumnWidth(1, 120);
    settingsSheet.setColumnWidth(2, 350);
    settingsSheet.setColumnWidth(3, 300);
  }
  
  // customUrl 업데이트
  const data = settingsSheet.getDataRange().getValues();
  let found = false;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'customUrl') {
      settingsSheet.getRange(i + 1, 2).setValue(customUrl);
      found = true;
      break;
    }
  }
  
  if (!found) {
    settingsSheet.appendRow(['customUrl', customUrl, '학생 참여 페이지 커스텀 URL (비워두면 기본 URL 사용)']);
  }
  
  return { success: true };
}

function getStudentPageUrl(sessionCode) {
  const settings = getSettings();
  const baseApiUrl = ScriptApp.getService().getUrl();
  
  if (settings.useCustomUrl && settings.customUrl) {
    // 커스텀 URL 사용 (GitHub Pages)
    let url = settings.customUrl;
    
    // URL에 api와 code 파라미터 추가
    if (url.indexOf('?') === -1) {
      url += '?';
    } else {
      url += '&';
    }
    url += 'api=' + encodeURIComponent(baseApiUrl);
    url += '&code=' + sessionCode;
    
    return url;
  } else {
    // 기본 URL 사용
    return baseApiUrl + '?page=student&code=' + sessionCode;
  }
}

// ============================================
// 웹앱 라우팅
// ============================================
function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'student';
  const sessionCode = (e && e.parameter && e.parameter.code) ? e.parameter.code : '';
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
  const callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : '';
  
  // API 요청 처리 (GitHub Pages용)
  if (action) {
    let result;
    
    if (action === 'getSessionInfo') {
      result = getSessionInfo();
    } else if (action === 'submitWord') {
      const word = e.parameter.word || '';
      const code = e.parameter.sessionCode || '';
      result = submitWord(word, code);
    } else {
      result = { error: 'Unknown action' };
    }
    
    // JSONP 콜백이 있으면 JSONP로 반환
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // HTML 페이지 반환
  if (page === 'teacher') {
    return HtmlService.createTemplateFromFile('TeacherView')
      .evaluate()
      .setTitle('Word Cloud - 교사용')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else {
    const template = HtmlService.createTemplateFromFile('StudentView');
    template.sessionCode = sessionCode || '';
    return template.evaluate()
      .setTitle('Word Cloud - 참여하기')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const result = submitWord(data.word, data.sessionCode);
    
    // CORS 헤더 추가
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 외부 API 요청 처리 (GitHub Pages용)
function doGetApi(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;
  
  let result;
  
  if (action === 'getSessionInfo') {
    result = getSessionInfo();
  } else if (action === 'submitWord') {
    const word = e.parameter.word;
    const sessionCode = e.parameter.sessionCode;
    result = submitWord(word, sessionCode);
  } else {
    result = { error: 'Unknown action' };
  }
  
  // JSONP 콜백이 있으면 JSONP로 반환
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// HTML 파일 포함용
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================
// 세션 관리
// ============================================
function createSession(title) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sessionSheet = ss.getSheetByName(CONFIG.SESSION_SHEET);
  
  if (!sessionSheet) {
    sessionSheet = ss.insertSheet(CONFIG.SESSION_SHEET);
    sessionSheet.appendRow(['세션코드', '제목', '생성시간', '상태']);
  }
  
  const sessionCode = generateSessionCode();
  sessionSheet.appendRow([sessionCode, title, new Date(), '활성']);
  
  // 응답 시트 초기화
  let responseSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!responseSheet) {
    responseSheet = ss.insertSheet(CONFIG.SHEET_NAME);
    responseSheet.appendRow(['타임스탬프', '단어', '세션코드']);
  }
  
  return { success: true, sessionCode: sessionCode, title: title };
}

function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getActiveSession() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessionSheet = ss.getSheetByName(CONFIG.SESSION_SHEET);
  
  if (!sessionSheet) return null;
  
  const data = sessionSheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][3] === '활성') {
      return {
        code: data[i][0],
        title: data[i][1],
        createdAt: data[i][2]
      };
    }
  }
  return null;
}

function endSession(sessionCode) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessionSheet = ss.getSheetByName(CONFIG.SESSION_SHEET);
  
  if (!sessionSheet) return { success: false, error: '세션을 찾을 수 없습니다.' };
  
  const data = sessionSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sessionCode) {
      sessionSheet.getRange(i + 1, 4).setValue('종료');
      return { success: true };
    }
  }
  return { success: false, error: '세션을 찾을 수 없습니다.' };
}

function clearCurrentSessionData(sessionCode) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) return { success: false, error: '시트를 찾을 수 없습니다.' };
  
  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][2] === sessionCode) {
      rowsToDelete.push(i + 1);
    }
  }
  
  rowsToDelete.forEach(row => sheet.deleteRow(row));
  
  return { success: true, deletedCount: rowsToDelete.length };
}

// ============================================
// 단어 제출 및 조회
// ============================================
function submitWord(word, sessionCode) {
  // 유효성 검사
  word = word.toString().trim();
  
  if (word.length < CONFIG.MIN_WORD_LENGTH) {
    return { success: false, error: '단어를 입력해주세요.' };
  }
  
  if (word.length > CONFIG.MAX_WORD_LENGTH) {
    return { success: false, error: `${CONFIG.MAX_WORD_LENGTH}자 이내로 입력해주세요.` };
  }
  
  // 세션 확인
  const session = getActiveSession();
  if (!session) {
    return { success: false, error: '활성화된 세션이 없습니다.' };
  }
  
  if (sessionCode && sessionCode !== session.code) {
    return { success: false, error: '세션 코드가 일치하지 않습니다.' };
  }
  
  // 저장
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(['타임스탬프', '단어', '세션코드']);
  }
  
  sheet.appendRow([new Date(), word, session.code]);
  
  return { success: true, word: word };
}

function getWordCloudData(sessionCode) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    return { words: [], total: 0 };
  }
  
  const data = sheet.getDataRange().getValues();
  const wordCount = {};
  let total = 0;
  
  // 세션 코드가 없으면 활성 세션 사용
  if (!sessionCode) {
    const session = getActiveSession();
    sessionCode = session ? session.code : null;
  }
  
  for (let i = 1; i < data.length; i++) {
    const rowSessionCode = data[i][2];
    
    if (sessionCode && rowSessionCode !== sessionCode) continue;
    
    const word = data[i][1].toString().trim();
    if (word) {
      wordCount[word] = (wordCount[word] || 0) + 1;
      total++;
    }
  }
  
  // wordcloud2.js 형식으로 변환 [[단어, 빈도], ...]
  const words = Object.entries(wordCount)
    .map(([text, count]) => [text, count])
    .sort((a, b) => b[1] - a[1]);
  
  return { words: words, total: total };
}

function getSessionInfo() {
  const session = getActiveSession();
  if (!session) {
    return { active: false };
  }
  
  const wordData = getWordCloudData(session.code);
  const studentUrl = getStudentPageUrl(session.code);
  
  return {
    active: true,
    code: session.code,
    title: session.title,
    totalResponses: wordData.total,
    uniqueWords: wordData.words.length,
    studentUrl: studentUrl
  };
}

// ============================================
// 초기 설정
// ============================================
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 응답 시트
  let responseSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!responseSheet) {
    responseSheet = ss.insertSheet(CONFIG.SHEET_NAME);
    responseSheet.appendRow(['타임스탬프', '단어', '세션코드']);
    responseSheet.setFrozenRows(1);
  }
  
  // 세션 시트
  let sessionSheet = ss.getSheetByName(CONFIG.SESSION_SHEET);
  if (!sessionSheet) {
    sessionSheet = ss.insertSheet(CONFIG.SESSION_SHEET);
    sessionSheet.appendRow(['세션코드', '제목', '생성시간', '상태']);
    sessionSheet.setFrozenRows(1);
  }
  
  // 설정 시트
  let settingsSheet = ss.getSheetByName(CONFIG.SETTINGS_SHEET);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(CONFIG.SETTINGS_SHEET);
    settingsSheet.appendRow(['설정키', '설정값', '설명']);
    settingsSheet.appendRow(['customUrl', '', '학생 참여 페이지 커스텀 URL (비워두면 기본 URL 사용)']);
    settingsSheet.setFrozenRows(1);
    settingsSheet.setColumnWidth(1, 120);
    settingsSheet.setColumnWidth(2, 350);
    settingsSheet.setColumnWidth(3, 300);
    
    // 설명 추가
    settingsSheet.getRange('A4').setValue('💡 사용법');
    settingsSheet.getRange('A5').setValue('customUrl에 원하는 URL을 입력하면 QR코드가 해당 URL로 생성됩니다.');
    settingsSheet.getRange('A6').setValue('예: https://myschool.com/wordcloud');
    settingsSheet.getRange('A7').setValue('세션 코드는 자동으로 ?code=XXXXXX 형태로 추가됩니다.');
  }
  
  return '설정이 완료되었습니다.';
}

// 메뉴 추가
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎨 워드 클라우드')
    .addItem('📋 초기 설정', 'setupSpreadsheet')
    .addItem('🚀 새 세션 시작', 'showNewSessionDialog')
    .addItem('📊 교사용 화면 열기', 'openTeacherView')
    .addItem('📱 학생 참여 링크 보기', 'showStudentLink')
    .addToUi();
}

function showNewSessionDialog() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: 'Google Sans', sans-serif; padding: 20px; }
      input { width: 100%; padding: 10px; margin: 10px 0; box-sizing: border-box; font-size: 16px; }
      button { width: 100%; padding: 12px; background: #4285f4; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
      button:hover { background: #3367d6; }
    </style>
    <input type="text" id="title" placeholder="세션 제목 (예: 환경 문제 핵심 키워드)" />
    <button onclick="createSession()">세션 시작</button>
    <script>
      function createSession() {
        const title = document.getElementById('title').value || '워드 클라우드';
        google.script.run.withSuccessHandler(function(result) {
          alert('세션이 생성되었습니다!\\n세션 코드: ' + result.sessionCode);
          google.script.host.close();
        }).createSession(title);
      }
    </script>
  `).setWidth(350).setHeight(150);
  
  SpreadsheetApp.getUi().showModalDialog(html, '새 세션 시작');
}

function openTeacherView() {
  const url = ScriptApp.getService().getUrl() + '?page=teacher';
  const html = HtmlService.createHtmlOutput(
    `<script>window.open('${url}', '_blank'); google.script.host.close();</script>`
  );
  SpreadsheetApp.getUi().showModalDialog(html, '교사용 화면 열기');
}

function showStudentLink() {
  const session = getActiveSession();
  if (!session) {
    SpreadsheetApp.getUi().alert('활성화된 세션이 없습니다. 먼저 새 세션을 시작해주세요.');
    return;
  }
  
  const url = getStudentPageUrl(session.code);
  const settings = getSettings();
  const urlTypeText = settings.useCustomUrl ? '(커스텀 URL)' : '(기본 URL)';
  
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: 'Google Sans', sans-serif; padding: 20px; text-align: center; }
      .code { font-size: 48px; font-weight: bold; color: #4285f4; letter-spacing: 8px; margin: 20px 0; }
      .url { font-size: 11px; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; }
      .url-type { font-size: 12px; color: #666; margin-top: 5px; }
      button { margin-top: 15px; padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; }
    </style>
    <p>세션 제목: <strong>${session.title}</strong></p>
    <div class="code">${session.code}</div>
    <p>참여 링크:</p>
    <div class="url">${url}</div>
    <div class="url-type">${urlTypeText}</div>
    <button onclick="navigator.clipboard.writeText('${url}'); alert('링크가 복사되었습니다!');">링크 복사</button>
  `).setWidth(420).setHeight(320);
  
  SpreadsheetApp.getUi().showModalDialog(html, '학생 참여 정보');
}