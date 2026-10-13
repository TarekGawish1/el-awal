import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom Metrics to provide detailed insights into platform capacity
const failureRate = new Rate('failed_requests_rate');
const frontendDuration = new Trend('frontend_page_duration_ms', true);
const backendApiDuration = new Trend('backend_api_duration_ms', true);
const serverErrors5xx = new Counter('http_5xx_errors');
const rateLimit429 = new Counter('http_429_rate_limited');
const successfulRequests = new Counter('successful_2xx_requests');

// Realistic Stress Test Configuration: Ramp up gradually to discover breaking point
export const options = {
  stages: [
    // 1. Warm-up: Baseline check with initial traffic
    { duration: '15s', target: 50 },
    // 2. High Load: Normal peak period (150 concurrent active users)
    { duration: '30s', target: 150 },
    // 3. Maximum Peak: Stress testing platform limits (300 concurrent active users)
    { duration: '40s', target: 300 },
    // 4. Recovery & Ramp-down
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    // Platform health thresholds
    'http_req_duration': ['p(95)<3000'], // 95% of requests should complete under 3s under stress
    'failed_requests_rate': ['rate<0.15'], // Less than 15% errors across extreme stress stages
  },
  userAgent: 'k6-RealUserSimulation/2.2.0 (Mozilla/5.0 Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
};

const BASE_URL = 'https://al-awal.online';
const API_URL = 'https://api.al-awal.online/api/v1';

export default function () {
  // Distribute Virtual Users across 3 realistic personas:
  // - 55% Browsing Students/Parents (Landing, courses, certificates, login page)
  // - 35% API Interaction (Catalog querying, health/status checking, registration forms)
  // - 10% High-Intensity Repeat Visitors (Fast navigation, frequent requests)
  const rand = Math.random();

  if (rand < 0.55) {
    // Persona 1: General Student / Visitor Journey
    group('Visitor Flow', function () {
      // 1. Home Landing Page
      const resHome = http.get(`${BASE_URL}/`, {
        tags: { type: 'frontend_page', page: 'home' },
      });
      frontendDuration.add(resHome.timings.duration);
      recordStatus(resHome);
      check(resHome, {
        'Home status is 200': (r) => r.status === 200,
        'Home loads fast (<2s)': (r) => r.timings.duration < 2000,
      });

      // Realistic reading/thinking time
      sleep(Math.random() * 1.5 + 0.5);

      // 2. Public Certificates / Honors Wall
      const resCert = http.get(`${API_URL}/certificates/public`, {
        tags: { type: 'backend_api', endpoint: 'certificates' },
      });
      backendApiDuration.add(resCert.timings.duration);
      recordStatus(resCert);
      check(resCert, {
        'Certificates API 200': (r) => r.status === 200,
      });

      sleep(Math.random() * 1.0 + 0.5);

      // 3. Login Page
      const resLogin = http.get(`${BASE_URL}/login`, {
        tags: { type: 'frontend_page', page: 'login' },
      });
      frontendDuration.add(resLogin.timings.duration);
      recordStatus(resLogin);
      check(resLogin, {
        'Login page status is 200': (r) => r.status === 200,
      });

      sleep(Math.random() * 1.0 + 0.5);
    });

  } else if (rand < 0.90) {
    // Persona 2: Active Student / Parent Catalog & Services Flow
    group('Student Services Flow', function () {
      // 1. Course Catalog API
      const resCatalog = http.get(`${API_URL}/courses/catalog`, {
        tags: { type: 'backend_api', endpoint: 'courses_catalog' },
      });
      backendApiDuration.add(resCatalog.timings.duration);
      recordStatus(resCatalog);
      check(resCatalog, {
        'Catalog API status 200': (r) => r.status === 200,
      });

      // 2. Public Centers Schedules
      const resCenters = http.get(`${API_URL}/schedules/public/centers`, {
        tags: { type: 'backend_api', endpoint: 'public_centers' },
      });
      backendApiDuration.add(resCenters.timings.duration);
      recordStatus(resCenters);
      check(resCenters, {
        'Centers API status 200': (r) => r.status === 200,
      });

      sleep(Math.random() * 0.8 + 0.3);

      // 3. Testimonials & Honors
      const resTestimonials = http.get(`${API_URL}/testimonials/public`, {
        tags: { type: 'backend_api', endpoint: 'testimonials' },
      });
      backendApiDuration.add(resTestimonials.timings.duration);
      recordStatus(resTestimonials);

      // 4. Parent Access Portal Page
      const resParent = http.get(`${BASE_URL}/parent-access`, {
        tags: { type: 'frontend_page', page: 'parent_access' },
      });
      frontendDuration.add(resParent.timings.duration);
      recordStatus(resParent);
      check(resParent, {
        'Parent Access 200': (r) => r.status === 200,
      });

      // 5. System Heartbeat / Health Check
      const resHealth = http.get(`${API_URL}/health`, {
        tags: { type: 'backend_api', endpoint: 'health' },
      });
      backendApiDuration.add(resHealth.timings.duration);
      recordStatus(resHealth);
      check(resHealth, {
        'Health status 200': (r) => r.status === 200,
      });

      sleep(Math.random() * 1.0 + 0.5);
    });

  } else {
    // Persona 3: High-Frequency Actions (Rapid queries, registration page)
    group('High Frequency Flow', function () {
      const resReg = http.get(`${BASE_URL}/register/student`, {
        tags: { type: 'frontend_page', page: 'register_student' },
      });
      frontendDuration.add(resReg.timings.duration);
      recordStatus(resReg);
      check(resReg, {
        'Register student status is 200': (r) => r.status === 200,
      });

      const resTerms = http.get(`${BASE_URL}/terms`, {
        tags: { type: 'frontend_page', page: 'terms' },
      });
      frontendDuration.add(resTerms.timings.duration);
      recordStatus(resTerms);

      sleep(0.3); // Short interval simulating eager navigation
    });
  }
}

function recordStatus(res) {
  if (res.status >= 200 && res.status < 400) {
    successfulRequests.add(1);
    failureRate.add(0);
  } else {
    failureRate.add(1);
    if (res.status >= 500) {
      serverErrors5xx.add(1);
    } else if (res.status === 429) {
      rateLimit429.add(1);
    }
  }
}
