/**
 * 다했니? 자동 쿠키 새로고침 Cloud Functions
 * 매일 오전 2시(KST)에 모든 교사의 학급 쿠키를 자동으로 새로고침합니다.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Firebase Admin 초기화
admin.initializeApp();
const db = admin.firestore();

// 다했니 API에서 학생 쿠키 정보 가져오기
async function fetchStudentFromDahandin(
  apiKey: string,
  studentCode: string
): Promise<{
  cookie: number;
  usedCookie: number;
  totalCookie: number;
  chocoChips: number;
} | null> {
  try {
    const response = await fetch(
      `https://api.dahandin.com/openapi/v1/get/student/total?code=${studentCode}`,
      {
        headers: { 'X-API-Key': apiKey }
      }
    );

    const data = await response.json();

    if (data.result && data.data) {
      return {
        cookie: data.data.cookie || 0,
        usedCookie: data.data.usedCookie || 0,
        totalCookie: data.data.totalCookie || 0,
        chocoChips: data.data.chocoChips || 0
      };
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch student ${studentCode}:`, error);
    return null;
  }
}

// 잔디 기록 추가 (주말은 금요일로 반영)
async function addGrassRecord(
  teacherId: string,
  classId: string,
  studentCode: string,
  cookieChange: number
): Promise<void> {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=일, 1=월, ..., 5=금, 6=토

  // 주말이면 금요일로 조정
  let targetDate = new Date(today);
  if (dayOfWeek === 0) { // 일요일 -> 금요일 (-2일)
    targetDate.setDate(targetDate.getDate() - 2);
  } else if (dayOfWeek === 6) { // 토요일 -> 금요일 (-1일)
    targetDate.setDate(targetDate.getDate() - 1);
  }

  const dateStr = targetDate.toISOString().split('T')[0];
  const grassRef = db
    .collection('teachers')
    .doc(teacherId)
    .collection('classes')
    .doc(classId)
    .collection('grass')
    .doc(dateStr);

  const grassSnap = await grassRef.get();

  if (grassSnap.exists) {
    const records = grassSnap.data()?.records || {};
    const currentData = records[studentCode] || { change: 0, count: 0 };

    await grassRef.update({
      [`records.${studentCode}`]: {
        change: currentData.change + cookieChange,
        count: currentData.count + 1
      }
    });
  } else {
    await grassRef.set({
      date: today,
      records: {
        [studentCode]: { change: cookieChange, count: 1 }
      }
    });
  }
}

// 한 교사의 모든 학급 쿠키 새로고침
async function refreshTeacherCookies(teacherId: string): Promise<{
  classesProcessed: number;
  studentsUpdated: number;
}> {
  let classesProcessed = 0;
  let studentsUpdated = 0;

  // 교사 정보 가져오기
  const teacherRef = db.collection('teachers').doc(teacherId);
  const teacherSnap = await teacherRef.get();

  if (!teacherSnap.exists) {
    console.log(`Teacher ${teacherId} not found`);
    return { classesProcessed, studentsUpdated };
  }

  const teacher = teacherSnap.data();
  const apiKey = teacher?.dahandinApiKey;

  if (!apiKey) {
    console.log(`Teacher ${teacherId} has no API key`);
    return { classesProcessed, studentsUpdated };
  }

  // 모든 학급 가져오기
  const classesSnap = await teacherRef.collection('classes').get();

  for (const classDoc of classesSnap.docs) {
    const classId = classDoc.id;
    classesProcessed++;

    // 학급의 모든 학생 가져오기
    const studentsSnap = await teacherRef.collection('students').get();

    for (const studentDoc of studentsSnap.docs) {
      const student = studentDoc.data();
      const studentCode = studentDoc.id;

      try {
        // 다했니 API에서 최신 쿠키 정보 가져오기
        const dahandinData = await fetchStudentFromDahandin(apiKey, studentCode);

        if (dahandinData) {
          const previousCookie = student.previousCookie || 0;
          const lastSyncedCookie = student.lastSyncedCookie ?? student.cookie ?? 0;
          const currentJelly = student.jelly ?? student.cookie ?? 0;
          const cookieChange = dahandinData.cookie - previousCookie;

          // 캔디 동기화: 쿠키가 증가했을 때만 캔디도 증가
          const cookieDiff = dahandinData.cookie - lastSyncedCookie;
          let newJelly = currentJelly;
          if (cookieDiff > 0) {
            newJelly = currentJelly + cookieDiff;
          }

          // 학생 정보 업데이트
          await studentDoc.ref.update({
            cookie: dahandinData.cookie,
            usedCookie: dahandinData.usedCookie,
            totalCookie: dahandinData.totalCookie,
            chocoChips: dahandinData.chocoChips,
            previousCookie: dahandinData.cookie,
            lastSyncedCookie: dahandinData.cookie,
            jelly: newJelly,
            lastAutoRefresh: admin.firestore.FieldValue.serverTimestamp()
          });

          // 쿠키가 증가했으면 잔디에 기록
          if (cookieChange > 0) {
            await addGrassRecord(teacherId, classId, studentCode, cookieChange);
          }

          studentsUpdated++;
        }

        // API Rate Limiting 방지를 위한 딜레이
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to refresh student ${studentCode}:`, error);
      }
    }
  }

  return { classesProcessed, studentsUpdated };
}

// 6시간마다 실행되는 스케줄 함수
// Cron: "0 *\/6 * * *" (매 6시간: 0시, 6시, 12시, 18시)
export const scheduledCookieRefresh = functions
  .runWith({
    timeoutSeconds: 540, // 9분 (최대 허용 시간)
    memory: '512MB'
  })
  .pubsub.schedule('0 */6 * * *')
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    console.log('Starting scheduled cookie refresh at', new Date().toISOString());

    const startTime = Date.now();
    let totalTeachers = 0;
    let totalClasses = 0;
    let totalStudents = 0;

    try {
      // 모든 교사 가져오기
      const teachersSnap = await db.collection('teachers').get();

      for (const teacherDoc of teachersSnap.docs) {
        const teacherId = teacherDoc.id;
        totalTeachers++;

        console.log(`Processing teacher ${teacherId}...`);

        const result = await refreshTeacherCookies(teacherId);
        totalClasses += result.classesProcessed;
        totalStudents += result.studentsUpdated;
      }

      const duration = (Date.now() - startTime) / 1000;

      console.log('Scheduled cookie refresh completed:', {
        duration: `${duration.toFixed(2)}s`,
        teachers: totalTeachers,
        classes: totalClasses,
        students: totalStudents
      });

      // 실행 로그 저장
      await db.collection('system').doc('logs').collection('cookieRefresh').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        duration,
        teachers: totalTeachers,
        classes: totalClasses,
        students: totalStudents,
        status: 'success'
      });

    } catch (error) {
      console.error('Scheduled cookie refresh failed:', error);

      // 에러 로그 저장
      await db.collection('system').doc('logs').collection('cookieRefresh').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        error: String(error),
        status: 'error'
      });
    }

    return null;
  });

/**
 * HTTP 트리거 - 수동으로 쿠키 새로고침 실행 (테스트/디버깅용)
 * 사용법: https://<region>-<project-id>.cloudfunctions.net/manualCookieRefresh?teacherId=xxx
 */
export const manualCookieRefresh = functions.https.onRequest(async (req, res) => {
  // CORS 헤더
  res.set('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  const teacherId = req.query.teacherId as string;

  if (!teacherId) {
    res.status(400).json({ error: 'teacherId is required' });
    return;
  }

  console.log(`Manual refresh requested for teacher ${teacherId}`);

  try {
    const result = await refreshTeacherCookies(teacherId);

    res.json({
      success: true,
      message: `Refreshed ${result.studentsUpdated} students across ${result.classesProcessed} classes`,
      ...result
    });
  } catch (error) {
    console.error('Manual refresh failed:', error);
    res.status(500).json({ error: String(error) });
  }
});
