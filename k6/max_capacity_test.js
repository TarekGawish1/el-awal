import http from 'k6/http';
import { check, sleep } from 'k6';
import { getHeaders, randomItem } from './common/helpers.js';

// Load realistic test fixtures
const testData = JSON.parse(open('./data/test_data.json'));

export const options = {
  scenarios: {
    // 1. High-frequency compute & API layer capacity (RPS Ramp-up)
    api_throughput_capacity: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1000,
      stages: [
        { duration: '15s', target: 50 },    // 50 RPS (Warmup)
        { duration: '20s', target: 150 },   // 150 RPS (Normal load)
        { duration: '20s', target: 300 },   // 300 RPS (Medium spike)
        { duration: '20s', target: 500 },   // 500 RPS (High throughput)
        { duration: '20s', target: 800 },   // 800 RPS (Extreme throughput peak)
        { duration: '15s', target: 100 },   // Ramp-down
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'], // Max 5% errors
    http_req_duration: ['p(95)<1000'], // P95 under 1s
  },
};

export default function () {
  const vuId = __VU;
  const iter = __ITER;
  const baseUrl = testData.baseUrl;

  // Realistic endpoint mix across the platform:
  // 30% Public Catalog / Content
  // 25% Telemetry & Analytics Tracking
  // 20% Health & Telemetry Probes
  // 25% Authenticated Student / Teacher Profile and Badges
  const pick = (vuId * 13 + iter * 7) % 100;

  if (pick < 30) {
    // Course catalog discovery
    const headers = getHeaders(null, vuId, iter);
    const res = http.get(`${baseUrl}/courses/catalog`, { headers });
    check(res, { 'status is 200': (r) => r.status === 200 });
  } else if (pick < 55) {
    // Telemetry tracking ingestion
    const headers = getHeaders(null, vuId, iter);
    const payload = JSON.stringify({
      path: '/courses',
      referrer: 'https://al-awal.online',
      isLandingPage: false,
    });
    const res = http.post(`${baseUrl}/analytics/track`, payload, { headers });
    check(res, { 'status is 200/202': (r) => r.status === 200 || r.status === 202 });
  } else if (pick < 75) {
    // High-speed API probe / ping
    const headers = getHeaders(null, vuId, iter);
    const res = http.get(`${baseUrl}/health/ping`, { headers });
    check(res, { 'status is 200': (r) => r.status === 200 });
  } else {
    // Authenticated API request
    const student = randomItem(testData.students);
    const headers = getHeaders(student ? student.token : null, vuId, iter);
    const res = http.get(`${baseUrl}/users/me/badges`, { headers });
    check(res, { 'status is 200': (r) => r.status === 200 });
  }
}
