import { sleep } from 'k6';
import {
  simulateStudent,
  simulateParent,
  simulateTeacher,
  simulateGuest,
} from './scenarios/user_flows.js';

// Load pre-generated high-fidelity fixtures
const testData = JSON.parse(open('./data/test_data.json'));

export const options = {
  vus: 5,
  duration: '15s',
  thresholds: {
    http_req_failed: ['rate<0.01'], // 0% errors expected
    rate_student_success: ['rate>0.99'],
    rate_parent_success: ['rate>0.99'],
    rate_teacher_success: ['rate>0.99'],
    rate_guest_success: ['rate>0.99'],
  },
};

export default function () {
  const vuId = __VU;
  const iter = __ITER;

  // Distribute scenarios across VUs:
  // VU 1, 2: Students (40%)
  // VU 3: Parents (20%)
  // VU 4: Teacher / Admin (20%)
  // VU 5: Guest / Public (20%)
  if (vuId === 1 || vuId === 2) {
    simulateStudent(testData, vuId, iter, true);
  } else if (vuId === 3) {
    simulateParent(testData, vuId, iter, true);
  } else if (vuId === 4) {
    simulateTeacher(testData, vuId, iter, true);
  } else {
    simulateGuest(testData, vuId, iter, true);
  }

  sleep(0.5);
}
