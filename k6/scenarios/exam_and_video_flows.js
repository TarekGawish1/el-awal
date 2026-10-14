import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { getHeaders, thinkTime, randomItem } from '../common/helpers.js';

// Dedicated Metrics for Exam Taking and Video Watching
export const examLatency = new Trend('latency_exam_taking', true);
export const videoLatency = new Trend('latency_video_watching', true);

export const examSuccess = new Rate('rate_exam_success');
export const videoSuccess = new Rate('rate_video_success');

export const examRequests = new Counter('reqs_exam_taking');
export const videoRequests = new Counter('reqs_video_watching');

/**
 * 📝 المحاكاة 1: طلاب بيمتحنوا (Students Taking Exams)
 * يشمل: فتح الامتحان، قراءة الأسئلة، فحص المحاولات، وتسليم الإجابات للتصحيح التلقائي
 */
export function simulateStudentExam(data, vuId, iter) {
  const student = randomItem(data.students);
  if (!student) return;

  const baseUrl = data.baseUrl;
  const headers = getHeaders(student.token, vuId, iter);
  const assessment = randomItem(data.assessments);
  const assessmentId = assessment ? assessment.id : 'default-assessment';

  // 1. استعراض قائمة الامتحانات المتاحة
  examRequests.add(1);
  let start = Date.now();
  let res = http.get(`${baseUrl}/assessments`, { headers });
  examLatency.add(Date.now() - start);
  examSuccess.add(res.status === 200);
  check(res, { 'exam: list assessments 200': (r) => r.status === 200 });

  thinkTime(0.5, 1.2);

  // 2. فتح تفاصيل الامتحان والأسئلة (Zero-leak answer redaction)
  if (assessment && assessment.id) {
    examRequests.add(1);
    start = Date.now();
    res = http.get(`${baseUrl}/assessments/${assessment.id}`, { headers });
    examLatency.add(Date.now() - start);
    examSuccess.add(res.status === 200);
    check(res, { 'exam: get questions 200': (r) => r.status === 200 });

    // 3. فحص حالة محاولات الطالب الحالية (Attempt Policy check)
    examRequests.add(1);
    start = Date.now();
    res = http.get(`${baseUrl}/assessments/${assessment.id}/my-status`, { headers });
    examLatency.add(Date.now() - start);
    examSuccess.add(res.status === 200);
    check(res, { 'exam: check my-status 200': (r) => r.status === 200 });

    thinkTime(1.0, 2.5); // وقت تفكير وحل الأسئلة

    // 4. تسليم إجابات الامتحان للتصحيح التلقائي في قاعدة البيانات (Auto-Grading Submit)
    examRequests.add(1);
    start = Date.now();
    const targetQId = assessment.questions?.[0]?.id || 'e2779ef8-0585-41a0-b457-d84bdbbf8bf4';
    const submitPayload = JSON.stringify({
      answers: [
        { questionId: targetQId, answerGiven: 'الإزاحة' },
      ],
    });
    res = http.post(`${baseUrl}/assessments/${assessment.id}/submit`, submitPayload, { headers });
    examLatency.add(Date.now() - start);
    // يقبل 200 (تم التصحيح) أو 400 (تم استنفاد المحاولة - SINGLE_ATTEMPT) كلاهما رد طبيعي وسليم من السيرفر
    const isExpected = res.status === 200 || res.status === 400;
    examSuccess.add(isExpected);
    check(res, { 'exam: submit auto-grade valid': (r) => isExpected });
  }
}

/**
 * 🎥 المحاكاة 2: طلاب بيشوفوا فيديوهات (Students Watching Video Lessons)
 * يشمل: فتح الكورس، فتح الحصة ومرفقاتها، إرسال نبضات الحضور والتفاعل (Heartbeat & Telemetry)
 */
export function simulateStudentVideo(data, vuId, iter) {
  const student = randomItem(data.students);
  if (!student) return;

  const baseUrl = data.baseUrl;
  const headers = getHeaders(student.token, vuId, iter);

  // 1. فتح كتالوج الكورسات ومحتوى الحصص
  videoRequests.add(1);
  let start = Date.now();
  let res = http.get(`${baseUrl}/courses/catalog`, { headers });
  videoLatency.add(Date.now() - start);
  videoSuccess.add(res.status === 200);
  check(res, { 'video: catalog 200': (r) => r.status === 200 });

  thinkTime(0.4, 1.0);

  // 2. تحميل الحصص ومرفقات الفيديو والملفات
  videoRequests.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/students/my-group/sessions`, { headers });
  videoLatency.add(Date.now() - start);
  videoSuccess.add(res.status === 200);
  check(res, { 'video: sessions & media 200': (r) => r.status === 200 });

  // 3. إرسال نبضة مشاهدة وتفاعل ومتابعة وقت الفيديو (Video Playback Engagement Ping)
  videoRequests.add(1);
  start = Date.now();
  const trackPayload = JSON.stringify({
    path: '/courses/lessons/video-player',
    referrer: 'https://al-awal.online',
    isLandingPage: false,
  });
  res = http.post(`${baseUrl}/analytics/track`, trackPayload, { headers });
  videoLatency.add(Date.now() - start);
  videoSuccess.add(res.status === 200 || res.status === 202);
  check(res, { 'video: engagement ping 200/202': (r) => r.status === 200 || r.status === 202 });

  // 4. استطلاع الشارات والتنبيهات أثناء المشاهدة
  videoRequests.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/users/me/badges`, { headers });
  videoLatency.add(Date.now() - start);
  videoSuccess.add(res.status === 200);
  check(res, { 'video: badges update 200': (r) => r.status === 200 });

  thinkTime(1.0, 2.0); // محاكاة وقت مشاهدة مستمر في مشغل الفيديو
}
