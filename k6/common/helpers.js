import { sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Global Role Latency Trends
export const latencyPublic = new Trend('latency_public', true);
export const latencyStudent = new Trend('latency_student', true);
export const latencyTeacher = new Trend('latency_teacher', true);
export const latencyParent = new Trend('latency_parent', true);
export const latencySync = new Trend('latency_sync', true);

// Per-Module Granular Latency Trends
export const latencyAuth = new Trend('latency_mod_auth', true);
export const latencyCourses = new Trend('latency_mod_courses', true);
export const latencyAssessments = new Trend('latency_mod_assessments', true);
export const latencyExamSubmit = new Trend('latency_mod_exam_submit', true);
export const latencyAttendance = new Trend('latency_mod_attendance', true);
export const latencyQrAttendance = new Trend('latency_mod_qr_attendance', true);
export const latencyPayments = new Trend('latency_mod_payments', true);
export const latencyQrPayment = new Trend('latency_mod_qr_payment', true);
export const latencyAnalytics = new Trend('latency_mod_analytics', true);
export const latencyParentPortal = new Trend('latency_mod_parent_portal', true);
export const latencySyncBootstrap = new Trend('latency_mod_sync_bootstrap', true);

// Success Rates
export const ratePublicSuccess = new Rate('rate_public_success');
export const rateStudentSuccess = new Rate('rate_student_success');
export const rateTeacherSuccess = new Rate('rate_teacher_success');
export const rateParentSuccess = new Rate('rate_parent_success');
export const rateSyncSuccess = new Rate('rate_sync_success');

// Request Counters
export const reqsPublic = new Counter('reqs_public');
export const reqsStudent = new Counter('reqs_student');
export const reqsTeacher = new Counter('reqs_teacher');
export const reqsParent = new Counter('reqs_parent');
export const reqsSync = new Counter('reqs_sync');

/**
 * Returns realistic HTTP headers for a given virtual user.
 * Generates distinct virtual client IP across Egyptian ISP ranges (TE Data / Vodafone EG)
 * and includes the load-test bypass header to evaluate raw backend/database limits.
 */
export function getHeaders(token = null, vuId = 1, iter = 1, bypassToken = 'el-awal-load-test-2026') {
  const octet3 = (vuId % 250) + 1;
  const octet4 = (iter % 250) + 1;
  const simulatedIp = `197.35.${octet3}.${octet4}`;

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'X-Forwarded-For': simulatedIp,
    'x-load-test-bypass': bypassToken,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Realistic human think time pause (randomized between min and max seconds).
 */
export function thinkTime(minSec = 0.2, maxSec = 0.8) {
  const duration = minSec + Math.random() * (maxSec - minSec);
  sleep(duration);
}

/**
 * Picks a random item from an array safely.
 */
export function randomItem(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}
