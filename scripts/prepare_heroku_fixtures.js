const fs = require('fs');
const path = require('path');

const HEROKU_BASE = 'https://al-awal-cbe2188d9efa.herokuapp.com/api/v1';

async function main() {
  console.log('Fetching live Heroku production tokens...');

  // 1. Teacher Login
  const teacherRes = await fetch(`${HEROKU_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'teacher@elawal.com', password: 'Password123!' }),
  }).then(r => r.json());

  const teacherToken = teacherRes?.data?.accessToken;
  const teacherUser = teacherRes?.data?.user;
  console.log('Teacher Token fetched:', teacherToken ? 'SUCCESS' : 'FAILED');

  // 2. Student Login
  const studentRes = await fetch(`${HEROKU_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'STU202600062', password: 'WF2yfA' }),
  }).then(r => r.json());

  const studentToken = studentRes?.data?.accessToken;
  const studentUser = studentRes?.data?.user;
  console.log('Student Token fetched:', studentToken ? 'SUCCESS' : 'FAILED');

  // 3. Parent Login
  const parentRes = await fetch(`${HEROKU_BASE}/auth/parent-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentPhone: '+201099998811', password: 'ZLoTYa' }),
  }).then(r => r.json());

  const parentToken = parentRes?.data?.accessToken;
  const parentUser = parentRes?.data?.user;
  console.log('Parent Token fetched:', parentToken ? 'SUCCESS' : 'FAILED');

  // 4. Fetch available groups from Heroku
  const groupsRes = await fetch(`${HEROKU_BASE}/groups`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  }).then(r => r.json());
  const groups = groupsRes?.data || [];
  console.log('Groups fetched from Heroku:', groups.length);

  // 5. Fetch available sessions for the student's group
  const sessionsRes = await fetch(`${HEROKU_BASE}/students/my-group/sessions`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  }).then(r => r.json());
  const sessions = sessionsRes?.data || [];
  console.log('Sessions fetched from Heroku:', sessions.length);

  // 6. Fetch courses
  const coursesRes = await fetch(`${HEROKU_BASE}/courses/catalog`).then(r => r.json());
  const courses = coursesRes?.data || [];
  console.log('Courses fetched from Heroku:', courses.length);

  const fixture = {
    baseUrl: HEROKU_BASE,
    teacher: {
      id: teacherUser?.id,
      email: teacherUser?.email,
      phone: teacherUser?.phone,
      name: teacherUser?.fullName,
      token: teacherToken,
    },
    students: [
      {
        id: studentUser?.id,
        studentProfileId: studentUser?.studentProfileId,
        name: studentUser?.fullName,
        studentCode: 'STU202600062',
        token: studentToken,
      },
    ],
    parents: [
      {
        id: parentUser?.id,
        parentProfileId: parentUser?.parentProfileId,
        name: parentUser?.fullName,
        phone: '+201099998811',
        linkedStudentId: studentUser?.id,
        token: parentToken,
      },
    ],
    groups: groups.map(g => ({ id: g.id, name: g.name, gradeLevel: g.gradeLevel })),
    sessions: sessions.map(s => ({ id: s.id, topic: s.topic, groupId: s.groupId })),
    courses: courses.map(c => ({ id: c.id, title: c.title })),
    updatedAt: new Date().toISOString(),
  };

  const outputPath = path.resolve(__dirname, '../k6/data/test_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(fixture, null, 2), 'utf-8');
  console.log('Successfully saved live Heroku fixtures to:', outputPath);
}

main().catch(console.error);
