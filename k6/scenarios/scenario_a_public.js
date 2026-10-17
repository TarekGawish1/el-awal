import http from 'k6/http';
import { check } from 'k6';
import {
  getHeaders,
  thinkTime,
  latencyPublic,
  latencyCourses,
  ratePublicSuccess,
  reqsPublic,
} from '../common/helpers.js';

export function runScenarioPublic(data, vuId, iter, enableThinkTime = true) {
  const baseUrl = data.baseUrl;
  const bypass = data.bypassToken;
  const headers = getHeaders(null, vuId, iter, bypass);

  // 1. Fetch Public Course Catalog
  reqsPublic.add(1);
  let start = Date.now();
  let res = http.get(`${baseUrl}/courses/catalog?limit=10`, { headers });
  let dur = Date.now() - start;
  latencyPublic.add(dur);
  latencyCourses.add(dur);
  let ok = check(res, { 'public: /courses/catalog 200': (r) => r.status === 200 });
  ratePublicSuccess.add(ok);

  if (enableThinkTime) thinkTime(0.2, 0.5);

  // 2. Fetch Center Schedules by Grade
  reqsPublic.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/schedules/public/centers`, { headers });
  dur = Date.now() - start;
  latencyPublic.add(dur);
  ok = check(res, { 'public: /schedules/public/centers 200': (r) => r.status === 200 });
  ratePublicSuccess.add(ok);

  if (enableThinkTime) thinkTime(0.2, 0.4);

  // 3. Certificates Showcase
  reqsPublic.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/certificates/public`, { headers });
  dur = Date.now() - start;
  latencyPublic.add(dur);
  ok = check(res, { 'public: /certificates/public 200': (r) => r.status === 200 });
  ratePublicSuccess.add(ok);

  // 4. Testimonials Showcase
  reqsPublic.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/testimonials/public`, { headers });
  dur = Date.now() - start;
  latencyPublic.add(dur);
  ok = check(res, { 'public: /testimonials/public 200': (r) => r.status === 200 });
  ratePublicSuccess.add(ok);

  // 5. Site Branding & Settings
  reqsPublic.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/site-settings/public`, { headers });
  dur = Date.now() - start;
  latencyPublic.add(dur);
  ok = check(res, { 'public: /site-settings/public 200': (r) => r.status === 200 });
  ratePublicSuccess.add(ok);

  if (enableThinkTime) thinkTime(0.3, 0.7);

  // 6. Contact Inquiries Submission (1 out of every 5 iterations)
  if (iter % 5 === 0) {
    reqsPublic.add(1);
    const inquiryPayload = JSON.stringify({
      name: `زائر تجريبي رقم ${vuId}`,
      phone: `010${String(10000000 + (vuId * 100 + iter) % 89999999)}`,
      message: 'استفسار عن اشتراكات السنتر ومواعيد امتحانات الثانوية العامة',
    });
    start = Date.now();
    res = http.post(`${baseUrl}/contact-messages`, inquiryPayload, { headers });
    dur = Date.now() - start;
    latencyPublic.add(dur);
    ok = check(res, { 'public: /contact-messages 201': (r) => r.status === 201 });
    ratePublicSuccess.add(ok);
  }

  // 7. System Health Probe
  reqsPublic.add(1);
  start = Date.now();
  res = http.get(`${baseUrl}/health`, { headers });
  dur = Date.now() - start;
  latencyPublic.add(dur);
  ok = check(res, { 'public: /health 200': (r) => r.status === 200 });
  ratePublicSuccess.add(ok);
}
