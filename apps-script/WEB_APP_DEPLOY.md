# 📱 Apps Script Web App 배포 가이드

## 🚀 1단계: Web App 배포

### 1. Apps Script 열기
1. Google Sheets → **확장 프로그램 → Apps Script**
2. `Code.gs` 파일에 최신 코드가 있는지 확인

### 2. Web App 배포
1. Apps Script 우측 상단 **배포 → 새 배포** 클릭
2. **유형 선택** → ⚙️ 웹 앱 선택
3. **설정**:
   ```
   설명: 다했니 Sheets API
   실행 사용자: 나
   액세스 권한: 모든 사용자
   ```
4. **배포** 클릭
5. **권한 승인**:
   - Google 계정 선택
   - "고급" → "안전하지 않은 페이지로 이동" 클릭
   - "허용" 클릭

### 3. Web App URL 복사
```
https://script.google.com/macros/s/XXXXXX.../exec
```
⚠️ **이 URL을 안전하게 보관하세요!**

---

## 🧪 2단계: 테스트

### 브라우저에서 직접 테스트

#### 연결 테스트
```
https://script.google.com/macros/s/XXXXXX/exec?action=ping
```
**응답**:
```json
{"success":true,"message":"연결 성공!"}
```

#### 학생 정보 조회
```
https://script.google.com/macros/s/XXXXXX/exec?action=getStudent&code=DAX96V5UG&className=가볍게 통과(14)
```
**응답**:
```json
{
  "success": true,
  "data": {
    "number": 1,
    "name": "이다은",
    "code": "DAX96V5UG",
    "cookie": 1250,
    "usedCookie": 150,
    "totalCookie": 1100,
    "chocoChips": 50,
    "lastUpdate": "2025-11-28T..."
  }
}
```

#### 학급 전체 학생 조회
```
https://script.google.com/macros/s/XXXXXX/exec?action=getClassStudents&className=가볍게 통과(14)
```

#### 팀 정보 조회
```
https://script.google.com/macros/s/XXXXXX/exec?action=getTeams&className=가볍게 통과(14)
```

#### 잔디 데이터 조회
```
https://script.google.com/macros/s/XXXXXX/exec?action=getGrass&code=DAX96V5UG&className=가볍게 통과(14)
```

#### 스냅샷 조회
```
https://script.google.com/macros/s/XXXXXX/exec?action=getSnapshot&className=가볍게 통과(14)&week=12
```

---

## 📋 API 엔드포인트 정리

### `?action=ping`
연결 테스트

### `?action=getStudent`
**파라미터**:
- `code`: 학생코드 (필수)
- `className`: 학급명 (필수)

**응답**: 학생 정보 (번호, 이름, 쿠키 등)

### `?action=getClassStudents`
**파라미터**:
- `className`: 학급명 (필수)

**응답**: 학급 전체 학생 목록

### `?action=getTeams`
**파라미터**:
- `className`: 학급명 (필수)

**응답**: 팀 정보 목록

### `?action=getGrass`
**파라미터**:
- `code`: 학생코드 (필수)
- `className`: 학급명 (필수)

**응답**: 학생의 잔디 데이터

### `?action=getSnapshot`
**파라미터**:
- `className`: 학급명 (필수)
- `week`: 주차 (선택)

**응답**: 스냅샷 데이터

---

## 🔧 3단계: 프론트엔드 연동

### 선생님이 할 일

1. **로그인 시 Web App URL 입력** (또는 설정에서)
2. URL은 localStorage에 저장
3. 학생들에게 공유 (자동)

### 학생 로그인 플로우
```
1. 학생 코드 입력
   ↓
2. Web App에서 학생 정보 조회
   ↓
3. 학급명 자동 감지
   ↓
4. 대시보드 표시
```

---

## 🔄 4단계: 재배포 (코드 업데이트 시)

1. Apps Script에서 코드 수정
2. **배포 → 배포 관리** 클릭
3. 기존 배포 옆 ✏️ 편집 아이콘
4. **버전 → 새 버전** 선택
5. **배포** 클릭

⚠️ **URL은 변경되지 않습니다!** 기존 URL 계속 사용 가능

---

## 🔒 보안 고려사항

### ✅ 안전
- Sheets는 비공개 유지
- 선생님 계정으로만 실행
- 데이터는 읽기 전용

### ⚠️ 주의
- Web App URL은 **누구나 접근 가능**
  - 학생 코드가 있어야 데이터 조회 가능
  - 학급명이 필요
- URL 공유 시 주의

### 💡 추가 보안 (선택)
인증 토큰을 추가하려면:
1. [설정] 시트에 토큰 저장
2. `doGet()`에서 토큰 검증
3. 클라이언트에서 `&token=xxx` 파라미터 추가

---

## 🎯 다음 단계

1. ✅ Web App 배포 완료
2. ✅ URL 테스트
3. 🔜 프론트엔드에 URL 설정 추가
4. 🔜 학생 대시보드 연동
5. 🔜 실시간 데이터 표시
