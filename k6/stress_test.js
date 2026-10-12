import { sleep } from 'k6';
import {
  simulateStudent,
  simulateParent,
  simulateTeacher,
  simulateGuest,
} from './scenarios/user_flows.js';

// Load pre-generated realistic fixtures
const testData = JSON.parse(open('./data/test_data.json'));

export const options = {
  scenarios: {
    realistic_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 20 },  // Warmup & baseline (20 VUs)
        { duration: '30s', target: 50 },  // Normal load (50 VUs)
        { duration: '30s', target: 100 }, // Medium rush (100 VUs)
        { duration: '30s', target: 200 }, // High load (200 VUs)
        { duration: '30s', target: 350 }, // Stress peak (350 VUs)
        { duration: '20s', target: 500 }, // Extreme stress (500 VUs)
        { duration: '20s', target: 0 },   // Recovery ramp-down
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.10'], // Less than 10% errors under extreme stress
  },
};

export default function () {
  const vuId = __VU;
  const iter = __ITER;

  // Realistic persona distribution:
  // 55% Students, 20% Parents, 10% Teachers, 15% Guests/Visitors
  const rand = (vuId + iter * 7) % 100;

  if (rand < 55) {
    // 55% Student Journey
    simulateStudent(testData, vuId, iter, true);
  } else if (rand < 75) {
    // 20% Parent Journey
    simulateParent(testData, vuId, iter, true);
  } else if (rand < 85) {
    // 10% Teacher / Staff Journey
    simulateTeacher(testData, vuId, iter, true);
  } else {
    // 15% Guest / Public Visitor Journey
    simulateGuest(testData, vuId, iter, true);
  }

  // Realistic inter-action pause (human reading/browsing pacing)
  sleep(1.0);
}
