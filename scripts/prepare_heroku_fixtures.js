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

  if (!teacherToken) {
    throw new Error('Failed to login as teacher: ' + JSON.stringify(teacherRes));
  }

  // 2. Fetch live students from Heroku
  const studentsListRes = await fetch(`${HEROKU_BASE}/students?limit=5`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  }).then(r => r.json());

  const activeStudent = studentsListRes?.data?.[0];
  if (!activeStudent) {
    throw new Error('No active students found on Heroku');
  }

  console.log('Selected Student for testing:', activeStudent.studentCode, activeStudent.user?.fullName);

  // Reset Student Password to standard Password123!
  await fetch(`${HEROKU_BASE}/students/${activeStudent.id}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify({ newPassword: 'Password123!', sendWhatsApp: false }),
  });

  // Reset Parent Password to standard Password123!
  await fetch(`${HEROKU_BASE}/students/${activeStudent.id}/reset-parent-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify({ newPassword: 'Password123!', sendWhatsApp: false }),
  });

  // 3. Student Login
  const studentRes = await fetch(`${HEROKU_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: activeStudent.studentCode, password: 'Password123!' }),
  }).then(r => r.json());

  const studentToken = studentRes?.data?.accessToken;
  const studentUser = studentRes?.data?.user;
  console.log('Student Token fetched:', studentToken ? 'SUCCESS' : 'FAILED');

  // 4. Parent Login
  const parentRes = await fetch(`${HEROKU_BASE}/auth/parent-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentPhone: activeStudent.studentCode, password: 'Password123!' }),
  }).then(r => r.json());

  const parentToken = parentRes?.data?.accessToken;
  const parentUser = parentRes?.data?.user;
  console.log('Parent Token fetched:', parentToken ? 'SUCCESS' : 'FAILED');

  // 5. Fetch available groups from Heroku
  const groupsRes = await fetch(`${HEROKU_BASE}/groups`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  }).then(r => r.json());
  const groups = groupsRes?.data || [];
  console.log('Groups fetched from Heroku:', groups.length);

  if (groups.length > 0) {
    const primaryGroup = groups[0];
    await fetch(`${HEROKU_BASE}/groups/${primaryGroup.id}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({ studentId: activeStudent.id }),
    }).catch(() => null);
  }

  // 6. Fetch available sessions for the student's group
  const sessionsRes = await fetch(`${HEROKU_BASE}/students/my-group/sessions`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  }).then(r => r.json());
  const sessions = sessionsRes?.data || [];
  console.log('Sessions fetched from Heroku:', sessions.length);

  // 7. Fetch courses
  const coursesRes = await fetch(`${HEROKU_BASE}/courses/catalog`).then(r => r.json());
  const courses = coursesRes?.data || [];
  console.log('Courses fetched from Heroku:', courses.length);

  // 8. Fetch assessments
  let rawAssessments = [];
  const assessmentsRes = await fetch(`${HEROKU_BASE}/assessments`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  }).then(r => r.json());
  rawAssessments = assessmentsRes?.data || [];

  if (rawAssessments.length === 0) {
    const teacherAssessmentsRes = await fetch(`${HEROKU_BASE}/assessments`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    }).then(r => r.json());
    rawAssessments = teacherAssessmentsRes?.data || [];
  }
  console.log('Assessments fetched from Heroku:', rawAssessments.length);

  const assessments = [];
  for (const item of rawAssessments) {
    const detailRes = await fetch(`${HEROKU_BASE}/assessments/${item.id}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    }).then(r => r.json()).catch(() => null);
    const detail = detailRes?.data || item;
    assessments.push({
      id: item.id,
      title: item.title,
      type: item.type,
      totalScore: item.totalScore,
      questions: (detail.questions || []).map((q) => ({ id: q.id, questionText: q.questionText })),
    });
  }


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
        id: activeStudent.id,
        studentProfileId: activeStudent.id,
        name: activeStudent.user?.fullName,
        studentCode: activeStudent.studentCode,
        token: studentToken,
      },
    ],
    parents: [
      {
        id: parentUser?.id,
        parentProfileId: parentUser?.parentProfileId,
        name: parentUser?.fullName,
        phone: activeStudent.emergencyPhone || '+201016138448',
        linkedStudentId: activeStudent.id,
        token: parentToken,
      },
    ],
    groups: groups.map(g => ({ id: g.id, name: g.name, gradeLevel: g.gradeLevel })),
    sessions: sessions.map(s => ({ id: s.id, topic: s.topic, groupId: s.groupId })),
    courses: courses.map(c => ({ id: c.id, title: c.title })),
    assessments: assessments.map(a => ({ id: a.id, title: a.title, type: a.type, totalScore: a.totalScore, questions: a.questions })),
    updatedAt: new Date().toISOString(),
  };

  const outputPath = path.resolve(__dirname, '../k6/data/test_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(fixture, null, 2), 'utf-8');
  console.log('Successfully saved live Heroku fixtures to:', outputPath);
}

main().catch(console.error);
