import http from 'k6/http';
import { check } from 'k6';
import {
  getHeaders,
  thinkTime,
  randomItem,
  latencyParent,
  latencyParentPortal,
  latencySync,
  latencySyncBootstrap,
  rateParentSuccess,
  rateSyncSuccess,
  reqsParent,
  reqsSync,
} from '../common/helpers.js';

export function runScenarioParentAndSync(data, vuId, iter, enableThinkTime = true) {
  const parent = randomItem(data.parents);
  if (!parent || !parent.token) return;

  const baseUrl = data.baseUrl;
  const bypass = data.bypassToken;
  const headers = getHeaders(parent.token, vuId, iter, bypass);
  const childId = parent.linkedStudentId || (data.students[0] ? data.students[0].id : null);

  // 1. Parent Unified Dashboard (Children + Primary Child Overview)
  reqsParent.add(1);
  let start = Date.now();
  let res = http.get(`${baseUrl}/parent-portal/dashboard`, { headers });
  let dur = Date.now() - start;
  latencyParent.add(dur);
  latencyParentPortal.add(dur);
  let ok = check(res, { 'parent: /parent-portal/dashboard 200': (r) => r.status === 200 });
  rateParentSuccess.add(ok);

  if (enableThinkTime) thinkTime(0.2, 0.4);

  // 2. List Linked Children
  reqsParent.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/parent-portal/students`, { headers });
  dur = Date.now() - start;
  latencyParent.add(dur);
  latencyParentPortal.add(dur);
  ok = check(res, { 'parent: /parent-portal/students 200': (r) => r.status === 200 });
  rateParentSuccess.add(ok);

  if (childId) {
    // 3. Child Real-time Overview KPI Card (Attendance %, Exam averages, Billing alerts)
    reqsParent.add(1);
    start = Date.now();
    res = http.get(`${baseUrl}/parent-portal/students/${childId}/overview`, { headers });
    dur = Date.now() - start;
    latencyParent.add(dur);
    latencyParentPortal.add(dur);
    ok = check(res, { 'parent: /parent-portal/students/:id/overview 200': (r) => r.status === 200 });
    rateParentSuccess.add(ok);

    // 4. Child Classroom Attendance Log
    reqsParent.add(1);
    start = Date.now();
    res = http.get(`${baseUrl}/parent-portal/students/${childId}/attendance?limit=10`, { headers });
    dur = Date.now() - start;
    latencyParent.add(dur);
    latencyParentPortal.add(dur);
    ok = check(res, { 'parent: /parent-portal/students/:id/attendance 200': (r) => r.status === 200 });
    rateParentSuccess.add(ok);

    // 5. Child Assessment & Exam Results
    reqsParent.add(1);
    start = Date.now();
    res = http.get(`${baseUrl}/parent-portal/students/${childId}/assessments`, { headers });
    dur = Date.now() - start;
    latencyParent.add(dur);
    latencyParentPortal.add(dur);
    ok = check(res, { 'parent: /parent-portal/students/:id/assessments 200': (r) => r.status === 200 });
    rateParentSuccess.add(ok);
  }

  if (enableThinkTime) thinkTime(0.3, 0.6);

  // 6. Offline Sync Engine: Zero Cold-Start Bootstrap Snapshot Pull (Heavy snapshot endpoint)
  reqsSync.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/sync/bootstrap`, { headers });
  dur = Date.now() - start;
  latencySync.add(dur);
  latencySyncBootstrap.add(dur);
  ok = check(res, { 'sync: /sync/bootstrap 200': (r) => r.status === 200 });
  rateSyncSuccess.add(ok);

  // 7. Offline Sync Engine: Bi-directional Sync Delta Diff
  const sinceTimestamp = encodeURIComponent(new Date(Date.now() - 24 * 3600000).toISOString());
  reqsSync.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/sync/diff?since=${sinceTimestamp}`, { headers });
  dur = Date.now() - start;
  latencySync.add(dur);
  ok = check(res, { 'sync: /sync/diff 200': (r) => r.status === 200 });
  rateSyncSuccess.add(ok);
}
