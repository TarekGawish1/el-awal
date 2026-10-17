import { sleep } from 'k6';
import { runScenarioPublic } from './scenarios/scenario_a_public.js';
import { runScenarioStudent } from './scenarios/scenario_b_student.js';
import { runScenarioTeacher } from './scenarios/scenario_c_teacher.js';
import { runScenarioParentAndSync } from './scenarios/scenario_d_parent_sync.js';

// Load pre-generated realistic test data & tokens
const testData = JSON.parse(open('./data/test_data.json'));

const profile = __ENV.TEST_PROFILE || 'full';

function getStages(profileType) {
  if (profileType === 'validation' || profileType === 'smoke') {
    return [
      { duration: '10s', target: 5 },
      { duration: '15s', target: 15 },
      { duration: '5s', target: 0 },
    ];
  }

  if (profileType === 'fast_stress') {
    return [
      { duration: '30s', target: 30 },   // Warm-up & baseline
      { duration: '45s', target: 100 },  // Normal peak load
      { duration: '60s', target: 250 },  // Stress ramp
      { duration: '45s', target: 400 },  // Extreme capacity probe
      { duration: '20s', target: 0 },    // Cool-down
    ];
  }

  // Phase 4 Standard Execution Profile:
  // 1. Warm-up & Baseline: 10 -> 50 VUs (1m)
  // 2. Normal Peak Load: 50 -> 150 VUs (2m)
  // 3. Stress & Breaking Point: 150 -> 300 -> 500+ VUs (3m)
  // 4. Cool-down: Ramp down to 0 VUs (30s)
  return [
    { duration: '60s', target: 50 },   // Stage 1: Warm-up & Baseline
    { duration: '120s', target: 150 }, // Stage 2: Normal Peak Load
    { duration: '90s', target: 300 },  // Stage 3a: Stress Ramp
    { duration: '90s', target: 500 },  // Stage 3b: Breaking Point Discovery
    { duration: '30s', target: 0 },    // Stage 4: Cool-down
  ];
}

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  scenarios: {
    el_awal_full_system_rush: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: getStages(profile),
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.15'], // Breaking-point threshold tolerance
    http_req_duration: ['p(95)<10000'], // Latency ceiling
  },
};

export default function () {
  const vuId = __VU;
  const iter = __ITER;

  // Realistic Traffic Distribution:
  // - Scenario A (Public & Landing Catalog): 20%
  // - Scenario B (Student Portal & Live Exam Rush): 40%
  // - Scenario C (Teacher & Assistant Operations): 25%
  // - Scenario D (Parent Portal & Offline Sync): 15%
  const rand = (vuId * 13 + iter * 17) % 100;

  if (rand < 20) {
    // Scenario A: 20%
    runScenarioPublic(testData, vuId, iter, true);
  } else if (rand < 60) {
    // Scenario B: 40%
    runScenarioStudent(testData, vuId, iter, true);
  } else if (rand < 85) {
    // Scenario C: 25%
    runScenarioTeacher(testData, vuId, iter, true);
  } else {
    // Scenario D: 15%
    runScenarioParentAndSync(testData, vuId, iter, true);
  }

  sleep(0.5);
}

export function handleSummary(data) {
  const reqTotal = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const reqRate = data.metrics.http_reqs ? data.metrics.http_reqs.values.rate : 0;
  const failRate = data.metrics.http_req_failed ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0;
  const succRate = (100 - Number(failRate)).toFixed(2);

  const duration = data.metrics.http_req_duration ? data.metrics.http_req_duration.values : {};
  const avgLat = (duration.avg || 0).toFixed(1);
  const minLat = (duration.min || 0).toFixed(1);
  const medLat = (duration.med || 0).toFixed(1);
  const p90Lat = (duration['p(90)'] || 0).toFixed(1);
  const p95Lat = (duration['p(95)'] || 0).toFixed(1);
  const p99Lat = (duration['p(99)'] || 0).toFixed(1);
  const maxLat = (duration.max || 0).toFixed(1);

  const bytesRecv = data.metrics.data_received ? data.metrics.data_received.values.count : 0;
  const throughputMB = (bytesRecv / (1024 * 1024)).toFixed(2);
  const throughputRate = data.metrics.data_received ? (data.metrics.data_received.values.rate / (1024 * 1024)).toFixed(2) : 0;

  function getTrend(name) {
    const m = data.metrics[name];
    if (!m || !m.values) return { avg: '-', med: '-', p95: '-', p99: '-' };
    return {
      avg: (m.values.avg || 0).toFixed(1),
      med: (m.values.med || 0).toFixed(1),
      p95: (m.values['p(95)'] || 0).toFixed(1),
      p99: (m.values['p(99)'] || 0).toFixed(1),
    };
  }

  const modAuth = getTrend('latency_mod_auth');
  const modCourses = getTrend('latency_mod_courses');
  const modAssessments = getTrend('latency_mod_assessments');
  const modExamSubmit = getTrend('latency_mod_exam_submit');
  const modAttendance = getTrend('latency_mod_attendance');
  const modQrAttendance = getTrend('latency_mod_qr_attendance');
  const modPayments = getTrend('latency_mod_payments');
  const modQrPayment = getTrend('latency_mod_qr_payment');
  const modAnalytics = getTrend('latency_mod_analytics');
  const modParentPortal = getTrend('latency_mod_parent_portal');
  const modSync = getTrend('latency_sync');
  const modSyncBootstrap = getTrend('latency_mod_sync_bootstrap');

  const markdownReport = `# ⚡ EL-AWAL BACKEND LOAD & STRESS TEST BENCHMARK REPORT
Generated: ${new Date().toISOString()}
Target: ${testData.baseUrl}

---

## 1. Executive Performance & Capacity Summary
| Metric | Value | Status |
| :--- | :--- | :--- |
| **Max / Average RPS** | **${Number(reqRate).toFixed(1)} req/s** | Benchmark Rate |
| **Total Requests Handled** | **${reqTotal.toLocaleString()} requests** | Complete |
| **Success Rate** | **${succRate}%** (Failures: ${failRate}%) | ${Number(failRate) < 1 ? '🟢 Excellent' : Number(failRate) < 5 ? '🟡 Acceptable' : '🔴 Degraded'} |
| **Total Data Throughput** | **${throughputMB} MB** (~${throughputRate} MB/s) | Network IO |
| **Latency Min / Mean** | **${minLat}ms** / **${avgLat}ms** | Baseline |
| **Median (p50) Latency** | **${medLat}ms** | Half of traffic |
| **90th Percentile (p90)** | **${p90Lat}ms** | Peak traffic |
| **95th Percentile (p95)** | **${p95Lat}ms** | SLA Target (< 1,000ms) |
| **99th Percentile (p99)** | **${p99Lat}ms** | Tail latency |
| **Max Recorded Latency** | **${maxLat}ms** | Spike ceiling |

---

## 2. Granular Per-Module Latency Breakdown (Ranked)
| Module / Subsystem | Operation | p50 (ms) | p95 (ms) | p99 (ms) | Mean (ms) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Assessments (Auto-Grading)** | Exam Submission | ${modExamSubmit.med} | ${modExamSubmit.p95} | ${modExamSubmit.p99} | ${modExamSubmit.avg} |
| **Assessments (Catalog & Qs)** | Exam Retrieval & Status | ${modAssessments.med} | ${modAssessments.p95} | ${modAssessments.p99} | ${modAssessments.avg} |
| **Offline Sync Engine** | Bulk Bootstrap Snapshot | ${modSyncBootstrap.med} | ${modSyncBootstrap.p95} | ${modSyncBootstrap.p99} | ${modSyncBootstrap.avg} |
| **Offline Sync Engine** | Delta Sync Diff & Mutations | ${modSync.med} | ${modSync.p95} | ${modSync.p99} | ${modSync.avg} |
| **Payments & Financials** | Matrix Ledger & Analytics | ${modPayments.med} | ${modPayments.p95} | ${modPayments.p99} | ${modPayments.avg} |
| **Payments (Fast-Scan)** | QR Tuition Collection | ${modQrPayment.med} | ${modQrPayment.p95} | ${modQrPayment.p99} | ${modQrPayment.avg} |
| **Attendance (Fast-Scan)** | Roll-Call QR Scanning | ${modQrAttendance.med} | ${modQrAttendance.p95} | ${modQrAttendance.p99} | ${modQrAttendance.avg} |
| **Attendance (Roster)** | Reports & Student History | ${modAttendance.med} | ${modAttendance.p95} | ${modAttendance.p99} | ${modAttendance.avg} |
| **Parent Portal** | Dashboard & Student KPI | ${modParentPortal.med} | ${modParentPortal.p95} | ${modParentPortal.p99} | ${modParentPortal.avg} |
| **Analytics & Telemetry** | Overview & Geo-Ranking | ${modAnalytics.med} | ${modAnalytics.p95} | ${modAnalytics.p99} | ${modAnalytics.avg} |
| **Online Courses** | Catalog, Viewer & Progress | ${modCourses.med} | ${modCourses.p95} | ${modCourses.p99} | ${modCourses.avg} |
| **Authentication & Profile** | Session Check (/auth/me) | ${modAuth.med} | ${modAuth.p95} | ${modAuth.p99} | ${modAuth.avg} |

---

## 3. High-Concurrency Stress Observations
- Test Profile: **${profile}**
- Virtual Users (VUs): Max ramp achieved
- Global Requests: **${reqTotal}** requests executed
`;

  return {
    'k6/k6-summary.json': JSON.stringify(data, null, 2),
    'k6/k6-summary-report.md': markdownReport,
    stdout: `\n=======================================================\n` +
      `🎯 EL-AWAL LOAD BENCHMARK RESULTS:\n` +
      `   Total Requests: ${reqTotal} | Rate: ${Number(reqRate).toFixed(1)} req/s\n` +
      `   Success Rate:   ${succRate}% (Errors: ${failRate}%)\n` +
      `   Latency:        p50=${medLat}ms | p90=${p90Lat}ms | p95=${p95Lat}ms | p99=${p99Lat}ms\n` +
      `=======================================================\n`,
  };
}
