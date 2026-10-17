import http from 'k6/http';
import { check } from 'k6';
import {
  getHeaders,
  thinkTime,
  randomItem,
  latencyStudent,
  latencyAuth,
  latencyCourses,
  latencyAssessments,
  latencyExamSubmit,
  latencyAttendance,
  rateStudentSuccess,
  reqsStudent,
} from '../common/helpers.js';

export function runScenarioStudent(data, vuId, iter, enableThinkTime = true) {
  const student = randomItem(data.students);
  if (!student) return;

  const baseUrl = data.baseUrl;
  const bypass = data.bypassToken;
  const headers = getHeaders(student.token, vuId, iter, bypass);

  // 1. Student Session Check / Identity
  reqsStudent.add(1);
  let start = Date.now();
  let res = http.get(`${baseUrl}/users/me`, { headers });
  let dur = Date.now() - start;
  latencyStudent.add(dur);
  latencyAuth.add(dur);
  let ok = check(res, { 'student: /users/me 200': (r) => r.status === 200 });
  rateStudentSuccess.add(ok);

  if (enableThinkTime) thinkTime(0.1, 0.4);

  // 2. Student Dashboard Overview (Profile, KPIs, Next Session, Courses)
  reqsStudent.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/students/dashboard/overview`, { headers });
  dur = Date.now() - start;
  latencyStudent.add(dur);
  ok = check(res, { 'student: /students/dashboard/overview 200': (r) => r.status === 200 });
  rateStudentSuccess.add(ok);

  // 3. Enrolled Courses List
  reqsStudent.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/courses/my-courses`, { headers });
  dur = Date.now() - start;
  latencyStudent.add(dur);
  latencyCourses.add(dur);
  ok = check(res, { 'student: /courses/my-courses 200': (r) => r.status === 200 });
  rateStudentSuccess.add(ok);

  // 4. Secure Lesson Viewer (Streaming Token & Resume State)
  if (data.course && data.course.primaryLessonId) {
    reqsStudent.add(1);
    start = Date.now();
    res = http.get(`${baseUrl}/courses/lessons/${data.course.primaryLessonId}/viewer`, { headers });
    dur = Date.now() - start;
    latencyStudent.add(dur);
    latencyCourses.add(dur);
    ok = check(res, { 'student: /courses/lessons/:id/viewer 200': (r) => r.status === 200 });
    rateStudentSuccess.add(ok);

    // 5. Video Watch Progress Update (Heartbeat)
    reqsStudent.add(1);
    const progressPayload = JSON.stringify({
      lastPositionSeconds: (iter * 45) % 1800,
      isCompleted: false,
    });
    start = Date.now();
    res = http.post(`${baseUrl}/courses/lessons/${data.course.primaryLessonId}/progress`, progressPayload, { headers });
    dur = Date.now() - start;
    latencyStudent.add(dur);
    latencyCourses.add(dur);
    ok = check(res, { 'student: /courses/lessons/:id/progress 200': (r) => r.status === 200 });
    rateStudentSuccess.add(ok);
  }

  if (enableThinkTime) thinkTime(0.2, 0.6);

  // 6. EXAM PEAK RUSH: Open Assessment & Randomized Questions
  if (data.assessment && data.assessment.id) {
    reqsStudent.add(1);
    start = Date.now();
    res = http.get(`${baseUrl}/assessments/${data.assessment.id}`, { headers });
    dur = Date.now() - start;
    latencyStudent.add(dur);
    latencyAssessments.add(dur);
    ok = check(res, { 'student: /assessments/:id 200': (r) => r.status === 200 });
    rateStudentSuccess.add(ok);

    // 7. Check Attempt Policy & Prior Score Status
    reqsStudent.add(1);
    start = Date.now();
    res = http.get(`${baseUrl}/assessments/${data.assessment.id}/my-status`, { headers });
    dur = Date.now() - start;
    latencyStudent.add(dur);
    latencyAssessments.add(dur);
    ok = check(res, { 'student: /assessments/:id/my-status 200': (r) => r.status === 200 });
    rateStudentSuccess.add(ok);

    if (enableThinkTime) thinkTime(0.3, 0.8);

    // 8. Submit Answers for Synchronous Auto-Grading
    const qList = data.assessment.questions || [];
    const answers = qList.map((q) => ({
      questionId: q.id,
      answerGiven: randomItem(q.options) || q.correctAnswer || 'خيار أ',
    }));

    reqsStudent.add(1);
    const submitPayload = JSON.stringify({
      answers: answers.length > 0 ? answers : [{ questionId: '7abb7d69-508c-484b-b31e-f06038830e8d', answerGiven: 'مبتدأ مؤخر مرفوع' }],
    });
    start = Date.now();
    res = http.post(`${baseUrl}/assessments/${data.assessment.id}/submit`, submitPayload, { headers });
    dur = Date.now() - start;
    latencyStudent.add(dur);
    latencyAssessments.add(dur);
    latencyExamSubmit.add(dur);
    ok = check(res, { 'student: /assessments/:id/submit 200': (r) => r.status === 200 });
    rateStudentSuccess.add(ok);
  }

  // 9. Physical Center Group & Timetable
  reqsStudent.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/students/my-group`, { headers });
  dur = Date.now() - start;
  latencyStudent.add(dur);
  ok = check(res, { 'student: /students/my-group 200': (r) => r.status === 200 });
  rateStudentSuccess.add(ok);

  // 10. Group Sessions & Attendance History
  reqsStudent.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/students/my-group/sessions`, { headers });
  dur = Date.now() - start;
  latencyStudent.add(dur);
  ok = check(res, { 'student: /students/my-group/sessions 200': (r) => r.status === 200 });
  rateStudentSuccess.add(ok);

  // 11. Retrieve Student QR Code Credential Badge
  reqsStudent.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/students/${student.studentProfileId || student.id}/qr-code`, { headers });
  dur = Date.now() - start;
  latencyStudent.add(dur);
  ok = check(res, { 'student: /students/:id/qr-code 200': (r) => r.status === 200 });
  rateStudentSuccess.add(ok);

  // 12. Student Paginated Attendance Records
  reqsStudent.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/attendance/student/${student.studentProfileId || student.id}?limit=10`, { headers });
  dur = Date.now() - start;
  latencyStudent.add(dur);
  latencyAttendance.add(dur);
  ok = check(res, { 'student: /attendance/student/:id 200': (r) => r.status === 200 });
  rateStudentSuccess.add(ok);
}
