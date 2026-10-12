import http from 'k6/http';
import { check } from 'k6';
import {
  getHeaders,
  thinkTime,
  randomItem,
  studentLatency,
  parentLatency,
  teacherLatency,
  guestLatency,
  studentSuccess,
  parentSuccess,
  teacherSuccess,
  guestSuccess,
  studentRequests,
  parentRequests,
  teacherRequests,
  guestRequests,
} from '../common/helpers.js';

/**
 * 🎓 Realistic Student Journey
 */
export function simulateStudent(data, vuId, iter, enableThinkTime = true) {
  const student = randomItem(data.students);
  if (!student) return;

  const baseUrl = data.baseUrl;
  const headers = getHeaders(student.token, vuId, iter);

  // 1. Profile retrieval
  studentRequests.add(1);
  let start = Date.now();
  let res = http.get(`${baseUrl}/users/me`, { headers });
  studentLatency.add(Date.now() - start);
  studentSuccess.add(res.status === 200);
  check(res, { 'student: /users/me 200': (r) => r.status === 200 });

  if (enableThinkTime) thinkTime(0.3, 0.9);

  // 2. Badges and unread counters
  studentRequests.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/users/me/badges`, { headers });
  studentLatency.add(Date.now() - start);
  studentSuccess.add(res.status === 200);
  check(res, { 'student: /users/me/badges 200': (r) => r.status === 200 });

  // 3. Group and weekly timetable
  studentRequests.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/students/my-group`, { headers });
  studentLatency.add(Date.now() - start);
  studentSuccess.add(res.status === 200);
  check(res, { 'student: /students/my-group 200': (r) => r.status === 200 });

  if (enableThinkTime) thinkTime(0.4, 1.2);

  // 4. Group sessions & homework attachments
  studentRequests.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/students/my-group/sessions`, { headers });
  studentLatency.add(Date.now() - start);
  studentSuccess.add(res.status === 200);
  check(res, { 'student: /students/my-group/sessions 200': (r) => r.status === 200 });

  // 5. Notifications feed
  studentRequests.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/notifications`, { headers });
  studentLatency.add(Date.now() - start);
  studentSuccess.add(res.status === 200);
  check(res, { 'student: /notifications 200': (r) => r.status === 200 });

  // 6. Online course catalog
  studentRequests.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/courses/catalog`, { headers });
  studentLatency.add(Date.now() - start);
  studentSuccess.add(res.status === 200);
  check(res, { 'student: /courses/catalog 200': (r) => r.status === 200 });
}

/**
 * 👨‍👩‍👧 Realistic Parent Journey
 */
export function simulateParent(data, vuId, iter, enableThinkTime = true) {
  const parent = randomItem(data.parents);
  if (!parent) return;

  const baseUrl = data.baseUrl;
  const headers = getHeaders(parent.token, vuId, iter);

  // 1. Parent Profile
  parentRequests.add(1);
  let start = Date.now();
  let res = http.get(`${baseUrl}/users/me`, { headers });
  parentLatency.add(Date.now() - start);
  parentSuccess.add(res.status === 200);
  check(res, { 'parent: /users/me 200': (r) => r.status === 200 });

  if (enableThinkTime) thinkTime(0.3, 0.8);

  // 2. Linked Children List
  parentRequests.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/parent-portal/students`, { headers });
  parentLatency.add(Date.now() - start);
  parentSuccess.add(res.status === 200);
  check(res, { 'parent: /parent-portal/students 200': (r) => r.status === 200 });

  if (enableThinkTime) thinkTime(0.4, 1.1);

  // 3. Child Overview & KPI Report
  if (parent.linkedStudentId) {
    parentRequests.add(1);
    start = Date.now();
    res = http.get(`${baseUrl}/parent-portal/students/${parent.linkedStudentId}/overview`, { headers });
    parentLatency.add(Date.now() - start);
    parentSuccess.add(res.status === 200);
    check(res, { 'parent: child overview 200': (r) => r.status === 200 });

    // 4. Child Attendance History
    parentRequests.add(1);
    start = Date.now();
    res = http.get(`${baseUrl}/parent-portal/students/${parent.linkedStudentId}/attendance`, { headers });
    parentLatency.add(Date.now() - start);
    parentSuccess.add(res.status === 200);
    check(res, { 'parent: child attendance 200': (r) => r.status === 200 });
  }
}

/**
 * 👨‍🏫 Realistic Teacher / Admin Journey
 */
export function simulateTeacher(data, vuId, iter, enableThinkTime = true) {
  if (!data.teacher) return;

  const baseUrl = data.baseUrl;
  const headers = getHeaders(data.teacher.token, vuId, iter);

  // 1. Teacher Profile
  teacherRequests.add(1);
  let start = Date.now();
  let res = http.get(`${baseUrl}/users/me`, { headers });
  teacherLatency.add(Date.now() - start);
  teacherSuccess.add(res.status === 200);
  check(res, { 'teacher: /users/me 200': (r) => r.status === 200 });

  if (enableThinkTime) thinkTime(0.3, 0.8);

  // 2. Teacher Managed Groups
  teacherRequests.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/groups/my-groups`, { headers });
  teacherLatency.add(Date.now() - start);
  teacherSuccess.add(res.status === 200);
  check(res, { 'teacher: /groups/my-groups 200': (r) => r.status === 200 });

  // 3. All Academic Groups
  teacherRequests.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/groups`, { headers });
  teacherLatency.add(Date.now() - start);
  teacherSuccess.add(res.status === 200);
  check(res, { 'teacher: /groups 200': (r) => r.status === 200 });

  if (enableThinkTime) thinkTime(0.4, 1.2);

  // 4. Session Attendance Report
  const session = randomItem(data.sessions);
  if (session) {
    teacherRequests.add(1);
    start = Date.now();
    res = http.get(`${baseUrl}/attendance/sessions/${session.id}/report`, { headers });
    teacherLatency.add(Date.now() - start);
    teacherSuccess.add(res.status === 200);
    check(res, { 'teacher: attendance report 200': (r) => r.status === 200 });
  }

  // 5. Site Settings control
  teacherRequests.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/site-settings`, { headers });
  teacherLatency.add(Date.now() - start);
  teacherSuccess.add(res.status === 200);
  check(res, { 'teacher: /site-settings 200': (r) => r.status === 200 });
}

/**
 * 🌐 Realistic Public Visitor / Guest Journey
 */
export function simulateGuest(data, vuId, iter, enableThinkTime = true) {
  const baseUrl = data.baseUrl;
  const headers = getHeaders(null, vuId, iter);

  // 1. Health check & version
  guestRequests.add(1);
  let start = Date.now();
  let res = http.get(`${baseUrl}/health/ping`, { headers });
  guestLatency.add(Date.now() - start);
  guestSuccess.add(res.status === 200);
  check(res, { 'guest: /health/ping 200': (r) => r.status === 200 });

  if (enableThinkTime) thinkTime(0.2, 0.6);

  // 2. Public course catalog
  guestRequests.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/courses/catalog`, { headers });
  guestLatency.add(Date.now() - start);
  guestSuccess.add(res.status === 200);
  check(res, { 'guest: /courses/catalog 200': (r) => r.status === 200 });

  // 3. Public Testimonials
  guestRequests.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/testimonials/public`, { headers });
  guestLatency.add(Date.now() - start);
  guestSuccess.add(res.status === 200);
  check(res, { 'guest: /testimonials/public 200': (r) => r.status === 200 });

  if (enableThinkTime) thinkTime(0.3, 0.7);

  // 4. Public Site Settings
  guestRequests.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/site-settings/public`, { headers });
  guestLatency.add(Date.now() - start);
  guestSuccess.add(res.status === 200);
  check(res, { 'guest: /site-settings/public 200': (r) => r.status === 200 });

  // 5. Analytics page-view telemetry tracking
  guestRequests.add(1);
  start = Date.now();
  const trackPayload = JSON.stringify({
    path: '/',
    referrer: 'https://google.com',
    isLandingPage: true,
  });
  res = http.post(`${baseUrl}/analytics/track`, trackPayload, { headers });
  guestLatency.add(Date.now() - start);
  guestSuccess.add(res.status === 200 || res.status === 202);
  check(res, { 'guest: /analytics/track 200/202': (r) => r.status === 200 || r.status === 202 });
}
