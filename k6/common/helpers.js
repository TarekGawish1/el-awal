import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom Metrics to track performance per user role/scenario
export const studentLatency = new Trend('latency_student', true);
export const parentLatency = new Trend('latency_parent', true);
export const teacherLatency = new Trend('latency_teacher', true);
export const guestLatency = new Trend('latency_guest', true);

export const studentSuccess = new Rate('rate_student_success');
export const parentSuccess = new Rate('rate_parent_success');
export const teacherSuccess = new Rate('rate_teacher_success');
export const guestSuccess = new Rate('rate_guest_success');

export const studentRequests = new Counter('reqs_student');
export const parentRequests = new Counter('reqs_parent');
export const teacherRequests = new Counter('reqs_teacher');
export const guestRequests = new Counter('reqs_guest');

/**
 * Returns realistic HTTP headers for a given virtual user.
 * Generates distinct virtual client IP to simulate real individual users across Egypt.
 */
export function getHeaders(token = null, vuId = 1, iter = 1) {
  // Rotate IP per VU and iteration to accurately simulate distinct individual mobile/broadband users
  const octet3 = (vuId % 250) + 1;
  const octet4 = (iter % 250) + 1;
  const simulatedIp = `197.35.${octet3}.${octet4}`; // Egyptian ISP IP range (TE Data / Telecom Egypt)

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'X-Forwarded-For': simulatedIp,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Realistic human think time pause (randomized between min and max seconds).
 */
export function thinkTime(minSec = 0.5, maxSec = 1.8) {
  const duration = minSec + Math.random() * (maxSec - minSec);
  sleep(duration);
}

/**
 * Picks a random item from an array.
 */
export function randomItem(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}
