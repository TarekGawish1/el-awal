import { sleep } from 'k6';
import {
  simulateStudentExam,
  simulateStudentVideo,
} from './scenarios/exam_and_video_flows.js';

// Load live Heroku fixtures
const testData = JSON.parse(open('./data/test_data.json'));

export const options = {
  scenarios: {
    exam_and_video_concurrency: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 30 },  // المرحلة 1: دخول 30 طالب بالتزامن
        { duration: '20s', target: 80 },  // المرحلة 2: تصعيد إلى 80 طالب (50% امتحانات، 50% فيديوهات)
        { duration: '25s', target: 150 }, // المرحلة 3: ذروة 150 طالب
        { duration: '25s', target: 300 }, // المرحلة 4: ضغط شديد 300 طالب متزامن
        { duration: '20s', target: 500 }, // المرحلة 5: أقصى ذروة 500 طالب
        { duration: '15s', target: 0 },   // تهدئة وانصراف
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'], // أقل من 5% أخطاء
    rate_exam_success: ['rate>0.95'],
    rate_video_success: ['rate>0.95'],
  },
};

export default function () {
  const vuId = __VU;
  const iter = __ITER;

  // 50% طلاب بيمتحنوا (Exam Takers)
  // 50% طلاب بيشوفوا فيديوهات (Video Streamers)
  if (vuId % 2 === 0) {
    simulateStudentExam(testData, vuId, iter);
  } else {
    simulateStudentVideo(testData, vuId, iter);
  }

  sleep(1.0);
}
