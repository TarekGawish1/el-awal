import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 20,
  duration: '5s',
};

export default function () {
  // Generate distinct IP per request to simulate distinct real-world visitors
  const ip = `192.168.${(__VU % 250) + 1}.${(__ITER % 250) + 1}`;
  const res = http.get('http://localhost:4000/api/v1/health/ping', {
    headers: {
      'X-Forwarded-For': ip,
    },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
