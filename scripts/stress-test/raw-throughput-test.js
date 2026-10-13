import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    constant_request_rate: {
      executor: 'constant-arrival-rate',
      rate: 300,             // target 300 requests per second
      timeUnit: '1s',
      duration: '15s',
      preAllocatedVUs: 50,
      maxVUs: 150,
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.05'],
  },
};

const API_URL = 'https://api.al-awal.online/api/v1';

export default function () {
  const res = http.get(`${API_URL}/courses/catalog`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
    },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
