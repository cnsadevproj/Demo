/**
 * 다했니? 자동 쿠키 새로고침 Cloud Functions
 * 매일 오전 2시(KST)에 모든 교사의 학급 쿠키를 자동으로 새로고침합니다.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

// Type imports for explicit typing
import { Request, Response } from 'firebase-functions/v1';
import { EventContext } from 'firebase-functions';
import { QueryDocumentSnapshot } from 'firebase-functions/v1/firestore';

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

  // 모든 학생 가져오기 (학급별 루프 제거 - 학생의 실제 classId 사용)
  const studentsSnap = await teacherRef.collection('students').get();

  // 처리된 학급 ID 추적
  const processedClassIds = new Set<string>();

  for (const studentDoc of studentsSnap.docs) {
    const student = studentDoc.data();
    const studentCode = studentDoc.id;
    const studentClassId = student.classId; // 학생의 실제 classId 사용

    if (!studentClassId) {
      console.log(`Student ${studentCode} has no classId, skipping`);
      continue;
    }

    processedClassIds.add(studentClassId);

    try {
      // 다했니 API에서 최신 쿠키 정보 가져오기
      const dahandinData = await fetchStudentFromDahandin(apiKey, studentCode);

      if (dahandinData) {
        // previousCookie가 없으면 현재 저장된 cookie 값을 사용 (첫 새로고침 시 잘못된 증가분 방지)
        const previousCookie = student.previousCookie ?? student.cookie ?? dahandinData.cookie;
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

        // 쿠키가 증가했으면 잔디에 기록 (학생의 실제 classId 사용)
        if (cookieChange > 0) {
          await addGrassRecord(teacherId, studentClassId, studentCode, cookieChange);
        }

        studentsUpdated++;
      }

      // API Rate Limiting 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to refresh student ${studentCode}:`, error);
    }
  }

  classesProcessed = processedClassIds.size;
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
  .onRun(async (_context: EventContext) => {
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
export const manualCookieRefresh = functions.https.onRequest(async (req: Request, res: Response) => {
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

// ============================================================
// 쿠키 상점 신청 이메일 발송 기능
// ============================================================

interface CookieShopRequestData {
  id: string;
  itemId: string;
  itemName: string;
  itemPrice: number;
  studentCode: string;
  studentName: string;
  studentNumber: number;
  classId: string;
  className: string;
  quantity: number;
  totalPrice: number;
  status: string;
  createdAt: admin.firestore.Timestamp;
}

// 교사별 대기 중인 쿠키 상점 신청 가져오기
async function getPendingRequestsForTeacher(teacherId: string): Promise<{
  requests: CookieShopRequestData[];
  teacherEmail: string | null;
  teacherName: string | null;
}> {
  const teacherRef = db.collection('teachers').doc(teacherId);
  const teacherSnap = await teacherRef.get();

  if (!teacherSnap.exists) {
    return { requests: [], teacherEmail: null, teacherName: null };
  }

  const teacherData = teacherSnap.data();
  const teacherEmail = teacherData?.email || null;
  const teacherName = teacherData?.name || teacherData?.displayName || '선생님';

  // 모든 학급의 대기 중인 신청 가져오기
  const classesSnap = await teacherRef.collection('classes').get();
  const requests: CookieShopRequestData[] = [];

  for (const classDoc of classesSnap.docs) {
    const classId = classDoc.id;
    const className = classDoc.data()?.name || classId;

    const requestsSnap = await teacherRef
      .collection('classes')
      .doc(classId)
      .collection('cookieShopRequests')
      .where('status', '==', 'pending')
      .get();

    for (const reqDoc of requestsSnap.docs) {
      const data = reqDoc.data();
      requests.push({
        id: reqDoc.id,
        itemId: data.itemId,
        itemName: data.itemName,
        itemPrice: data.itemPrice,
        studentCode: data.studentCode,
        studentName: data.studentName,
        studentNumber: data.studentNumber || 0,
        classId: classId,
        className: className,
        quantity: data.quantity || 1,
        totalPrice: data.totalPrice,
        status: data.status,
        createdAt: data.createdAt
      });
    }
  }

  return { requests, teacherEmail, teacherName };
}

// 이메일 HTML 생성
function generateEmailHtml(
  teacherName: string,
  requests: CookieShopRequestData[]
): string {
  // 학급별로 그룹화
  const byClass: Record<string, CookieShopRequestData[]> = {};
  for (const req of requests) {
    if (!byClass[req.className]) {
      byClass[req.className] = [];
    }
    byClass[req.className].push(req);
  }

  let classTablesHtml = '';
  let totalCookies = 0;

  for (const [className, classRequests] of Object.entries(byClass)) {
    // 학생별로 정렬
    classRequests.sort((a, b) => a.studentNumber - b.studentNumber);

    let rowsHtml = '';
    let classTotalCookies = 0;

    for (const req of classRequests) {
      classTotalCookies += req.totalPrice;
      rowsHtml += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${req.studentNumber}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${req.studentName}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${req.itemName}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${req.quantity}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">🍪 ${req.totalPrice}</td>
        </tr>
      `;
    }

    totalCookies += classTotalCookies;

    classTablesHtml += `
      <h3 style="color: #1976d2; margin-top: 24px;">${className}</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">번호</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">이름</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">상품</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">수량</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">쿠키</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="background-color: #fff3e0; font-weight: bold;">
            <td colspan="4" style="padding: 8px; border: 1px solid #ddd; text-align: right;">소계</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">🍪 ${classTotalCookies}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>다했니? 쿠키 상점 신청 현황</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <h1 style="margin: 0;">🍪 쿠키 상점 신청 현황</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">다했니? 주간 신청 요약</p>
      </div>

      <p style="font-size: 16px; color: #333;">
        안녕하세요, <strong>${teacherName}</strong>님!<br>
        이번 주 쿠키 상점에 <strong>${requests.length}건</strong>의 신청이 있습니다.
      </p>

      ${classTablesHtml}

      <div style="background-color: #e3f2fd; padding: 16px; border-radius: 8px; margin-top: 24px;">
        <h3 style="margin: 0 0 8px 0; color: #1565c0;">📊 총 요약</h3>
        <p style="margin: 0; font-size: 18px;">
          총 신청: <strong>${requests.length}건</strong><br>
          총 차감 쿠키: <strong>🍪 ${totalCookies}</strong>
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

      <p style="color: #666; font-size: 14px;">
        이 메일은 다했니? 서비스에서 매주 목요일 오전 8시에 자동 발송됩니다.<br>
        신청 처리는 다했니? 대시보드의 상점 탭에서 확인하세요.
      </p>
    </body>
    </html>
  `;
}

// 이메일 발송 함수
async function sendCookieShopEmail(
  toEmail: string,
  teacherName: string,
  requests: CookieShopRequestData[]
): Promise<boolean> {
  // Gmail SMTP 설정 (Firebase 환경변수에서 가져오기)
  const gmailUser = functions.config().gmail?.user;
  const gmailPass = functions.config().gmail?.pass;

  if (!gmailUser || !gmailPass) {
    console.error('Gmail credentials not configured. Set using: firebase functions:config:set gmail.user="your@gmail.com" gmail.pass="your-app-password"');
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass
    }
  });

  const mailOptions = {
    from: `"다했니? 알림" <${gmailUser}>`,
    to: toEmail,
    subject: `[다했니?] 🍪 쿠키 상점 신청 현황 (${requests.length}건)`,
    html: generateEmailHtml(teacherName, requests)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${toEmail}:`, error);
    return false;
  }
}

/**
 * 매주 목요일 오전 8시(KST)에 쿠키 상점 신청 이메일 발송
 * Cron: "0 8 * * 4" (매주 목요일 8시)
 */
export const scheduledCookieShopEmail = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '256MB'
  })
  .pubsub.schedule('0 8 * * 4')
  .timeZone('Asia/Seoul')
  .onRun(async (_context: EventContext) => {
    console.log('Starting scheduled cookie shop email at', new Date().toISOString());

    let totalTeachers = 0;
    let emailsSent = 0;

    try {
      const teachersSnap = await db.collection('teachers').get();

      for (const teacherDoc of teachersSnap.docs) {
        const teacherId = teacherDoc.id;
        totalTeachers++;

        const { requests, teacherEmail, teacherName } = await getPendingRequestsForTeacher(teacherId);

        // 대기 중인 신청이 있고 이메일이 설정된 경우에만 발송
        if (requests.length > 0 && teacherEmail) {
          console.log(`Sending email to ${teacherEmail} with ${requests.length} requests`);

          const success = await sendCookieShopEmail(
            teacherEmail,
            teacherName || '선생님',
            requests
          );

          if (success) {
            emailsSent++;
          }
        } else if (requests.length > 0 && !teacherEmail) {
          console.log(`Teacher ${teacherId} has ${requests.length} pending requests but no email configured`);
        }
      }

      console.log('Cookie shop email completed:', {
        teachers: totalTeachers,
        emailsSent
      });

      // 실행 로그 저장
      await db.collection('system').doc('logs').collection('cookieShopEmail').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        teachers: totalTeachers,
        emailsSent,
        status: 'success'
      });

    } catch (error) {
      console.error('Cookie shop email failed:', error);

      await db.collection('system').doc('logs').collection('cookieShopEmail').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        error: String(error),
        status: 'error'
      });
    }

    return null;
  });

/**
 * HTTP 트리거 - 수동으로 쿠키 상점 이메일 발송 (테스트용)
 * 사용법: https://<region>-<project-id>.cloudfunctions.net/manualCookieShopEmail?teacherId=xxx
 */
export const manualCookieShopEmail = functions.https.onRequest(async (req: Request, res: Response) => {
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

  console.log(`Manual cookie shop email requested for teacher ${teacherId}`);

  try {
    const { requests, teacherEmail, teacherName } = await getPendingRequestsForTeacher(teacherId);

    if (!teacherEmail) {
      res.status(400).json({ error: 'Teacher email not configured' });
      return;
    }

    if (requests.length === 0) {
      res.json({
        success: true,
        message: 'No pending requests to send',
        requestCount: 0
      });
      return;
    }

    const success = await sendCookieShopEmail(
      teacherEmail,
      teacherName || '선생님',
      requests
    );

    if (success) {
      res.json({
        success: true,
        message: `Email sent to ${teacherEmail}`,
        requestCount: requests.length
      });
    } else {
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Manual cookie shop email failed:', error);
    res.status(500).json({ error: String(error) });
  }
});

// ============================================================
// 피드백(버그보고/기능요청) 이메일 발송 기능
// ============================================================

const DEVELOPER_EMAIL = 'pantarei01@cnsa.hs.kr';

/**
 * 피드백 제출 시 개발자에게 이메일 발송
 * Firestore Trigger: feedback 컬렉션에 문서 생성 시 실행
 */
export const onFeedbackCreated = functions.firestore
  .document('feedback/{feedbackId}')
  .onCreate(async (snap: QueryDocumentSnapshot, context: EventContext) => {
    const feedback = snap.data();
    const feedbackId = context.params.feedbackId;

    console.log(`New feedback created: ${feedbackId}`);

    // Gmail SMTP 설정 확인
    const gmailUser = functions.config().gmail?.user;
    const gmailPass = functions.config().gmail?.pass;

    if (!gmailUser || !gmailPass) {
      console.error('Gmail credentials not configured');
      return null;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });

    const typeLabel = feedback.type === 'bug' ? '🐛 버그 보고' : '💡 기능 요청';
    const typeColor = feedback.type === 'bug' ? '#dc3545' : '#007bff';
    const userTypeLabel = feedback.userType === 'teacher' ? '교사' : '학생';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>다했니? 피드백</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
          <h1 style="margin: 0;">💬 새로운 피드백</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">다했니? 피드백 알림</p>
        </div>

        <div style="background-color: ${typeColor}15; border-left: 4px solid ${typeColor}; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
          <span style="font-size: 24px;">${typeLabel}</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; width: 100px;">제출자</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${feedback.userName || '익명'} (${userTypeLabel})</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">제목</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${feedback.title}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; vertical-align: top;">내용</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; white-space: pre-wrap;">${feedback.description}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold;">제출 시간</td>
            <td style="padding: 12px;">${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
          </tr>
        </table>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

        <p style="color: #666; font-size: 14px;">
          이 메일은 다했니? 서비스에서 자동 발송되었습니다.<br>
          피드백 ID: ${feedbackId}
        </p>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"다했니? 피드백" <${gmailUser}>`,
      to: DEVELOPER_EMAIL,
      subject: `[다했니? 피드백] ${typeLabel} - ${feedback.title}`,
      html: emailHtml
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Feedback email sent to ${DEVELOPER_EMAIL}`);

      // 이메일 발송 상태 업데이트
      await snap.ref.update({
        emailSent: true,
        emailSentAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to send feedback email:', error);

      await snap.ref.update({
        emailSent: false,
        emailError: String(error)
      });

      return { success: false, error: String(error) };
    }
  });
