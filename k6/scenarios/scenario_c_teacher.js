import http from 'k6/http';
import { check } from 'k6';
import {
  getHeaders,
  thinkTime,
  randomItem,
  latencyTeacher,
  latencyAttendance,
  latencyQrAttendance,
  latencyPayments,
  latencyQrPayment,
  latencyAnalytics,
  rateTeacherSuccess,
  reqsTeacher,
} from '../common/helpers.js';

export function runScenarioTeacher(data, vuId, iter, enableThinkTime = true) {
  // Rotate between Teacher and Assistant tokens
  const isAssistant = iter % 2 === 0 && data.assistant && data.assistant.token;
  const activeUser = isAssistant ? data.assistant : data.teacher;
  if (!activeUser || !activeUser.token) return;

  const baseUrl = data.baseUrl;
  const bypass = data.bypassToken;
  const headers = getHeaders(activeUser.token, vuId, iter, bypass);
  const targetStudent = randomItem(data.students);

  // 1. Teacher Dashboard Init (Metrics + Dropdown Filters)
  reqsTeacher.add(1);
  let start = Date.now();
  let res = http.get(`${baseUrl}/teachers/dashboard/init`, { headers });
  let dur = Date.now() - start;
  latencyTeacher.add(dur);
  let ok = check(res, { 'teacher: /teachers/dashboard/init 200': (r) => r.status === 200 });
  rateTeacherSuccess.add(ok);

  if (enableThinkTime) thinkTime(0.2, 0.5);

  // 2. High-Speed QR Attendance Roll-Call Scanning
  if (data.activeSession && targetStudent && targetStudent.qrCodeToken) {
    reqsTeacher.add(1);
    const scanPayload = JSON.stringify({
      qrCodeToken: targetStudent.qrCodeToken,
      allowCrossGroup: true,
    });
    start = Date.now();
    res = http.post(`${baseUrl}/attendance/sessions/${data.activeSession.id}/scan-qr`, scanPayload, { headers });
    dur = Date.now() - start;
    latencyTeacher.add(dur);
    latencyAttendance.add(dur);
    latencyQrAttendance.add(dur);
    ok = check(res, { 'teacher: /attendance/sessions/:id/scan-qr 200': (r) => r.status === 200 });
    rateTeacherSuccess.add(ok);

    // 3. Session Roll-Call Report
    reqsTeacher.add(1);
    start = Date.now();
    res = http.get(`${baseUrl}/attendance/sessions/${data.activeSession.id}/report`, { headers });
    dur = Date.now() - start;
    latencyTeacher.add(dur);
    latencyAttendance.add(dur);
    ok = check(res, { 'teacher: /attendance/sessions/:id/report 200': (r) => r.status === 200 });
    rateTeacherSuccess.add(ok);
  }

  if (enableThinkTime) thinkTime(0.2, 0.4);

  // 4. High-Speed QR Payment Scanning (Tuition & Booklet collection)
  if (targetStudent && targetStudent.qrCodeToken) {
    reqsTeacher.add(1);
    const paymentPayload = JSON.stringify({
      qrCodeToken: targetStudent.qrCodeToken,
      amountPaid: 250,
      periodMonth: 10,
      periodYear: 2026,
      paymentMethod: 'CASH',
      notes: 'تحصيل كود السنتر - اختبار الحمل k6',
    });
    start = Date.now();
    res = http.post(`${baseUrl}/subscriptions/scan-qr`, paymentPayload, { headers });
    dur = Date.now() - start;
    latencyTeacher.add(dur);
    latencyPayments.add(dur);
    latencyQrPayment.add(dur);
    // 200, 201, 400 or 409 (already recorded/conflict) are valid domain outcomes
    const isPayOk = res.status === 200 || res.status === 201 || res.status === 400 || res.status === 409;
    ok = check(res, { 'teacher: /subscriptions/scan-qr valid': (r) => isPayOk });
    rateTeacherSuccess.add(ok);
  }

  // 5. Query Financial Matrix Ledger (Heavy aggregation endpoint)
  reqsTeacher.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/payments/matrix-ledger?academicYear=2026-2027&academicTerm=FIRST_TERM`, { headers });
  dur = Date.now() - start;
  latencyTeacher.add(dur);
  latencyPayments.add(dur);
  ok = check(res, { 'teacher: /payments/matrix-ledger 200': (r) => r.status === 200 });
  rateTeacherSuccess.add(ok);

  // 6. Granular Financial Analytics
  reqsTeacher.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/payments/dashboard-analytics?academicYear=2026-2027&academicTerm=FIRST_TERM`, { headers });
  dur = Date.now() - start;
  latencyTeacher.add(dur);
  latencyPayments.add(dur);
  ok = check(res, { 'teacher: /payments/dashboard-analytics 200': (r) => r.status === 200 });
  rateTeacherSuccess.add(ok);

  // 7. Analytics Overview (Traffic, Geo-ranking, Top Pages)
  reqsTeacher.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/analytics/overview?range=month`, { headers });
  dur = Date.now() - start;
  latencyTeacher.add(dur);
  latencyAnalytics.add(dur);
  ok = check(res, { 'teacher: /analytics/overview 200': (r) => r.status === 200 });
  rateTeacherSuccess.add(ok);

  // 8. Students Roster Search
  reqsTeacher.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/students?limit=20`, { headers });
  dur = Date.now() - start;
  latencyTeacher.add(dur);
  ok = check(res, { 'teacher: /students 200': (r) => r.status === 200 });
  rateTeacherSuccess.add(ok);

  // 9. Academic Groups
  reqsTeacher.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/groups`, { headers });
  dur = Date.now() - start;
  latencyTeacher.add(dur);
  ok = check(res, { 'teacher: /groups 200': (r) => r.status === 200 });
  rateTeacherSuccess.add(ok);

  // 10. Notifications Feed
  reqsTeacher.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/notifications`, { headers });
  dur = Date.now() - start;
  latencyTeacher.add(dur);
  ok = check(res, { 'teacher: /notifications 200': (r) => r.status === 200 });
  rateTeacherSuccess.add(ok);
}
