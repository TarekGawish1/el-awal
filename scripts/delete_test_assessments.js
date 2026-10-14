const HEROKU_BASE = 'https://al-awal-cbe2188d9efa.herokuapp.com/api/v1';

async function main() {
  console.log('🧹 Starting cleanup of test assessments and homework on live Heroku...');

  // 1. Teacher Login
  const teacherRes = await fetch(`${HEROKU_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'teacher@elawal.com', password: 'Password123!' }),
  }).then(r => r.json());

  const token = teacherRes?.data?.accessToken;
  if (!token) {
    throw new Error('Failed to login as teacher: ' + JSON.stringify(teacherRes));
  }
  console.log('✅ Teacher login successful.');

  // 2. Fetch current assessments
  const listRes = await fetch(`${HEROKU_BASE}/assessments`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());

  const assessments = listRes?.data || [];
  console.log(`📋 Found ${assessments.length} assessment(s) in database.`);

  const testAssessments = assessments.filter((a) => {
    const title = a.title || '';
    return (
      title.startsWith('اختبار دوري: تقييم مهارات') ||
      title.startsWith('واجب: حصة') ||
      title.includes('تقييم مهارات مجموعة')
    );
  });

  console.log(`🎯 Identified ${testAssessments.length} test assessment(s) to delete.`);

  for (const item of testAssessments) {
    console.log(`🗑️  Deleting [${item.type}] "${item.title}" (ID: ${item.id})...`);
    const delRes = await fetch(`${HEROKU_BASE}/assessments/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (delRes.ok) {
      console.log(`   ✅ Successfully deleted ${item.id}`);
    } else {
      console.error(`   ❌ Failed to delete ${item.id}:`, delRes.status, await delRes.text());
    }
  }

  // 3. Verify clean state
  const verifyRes = await fetch(`${HEROKU_BASE}/assessments`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());

  const remaining = verifyRes?.data || [];
  console.log(`\n✨ Cleanup complete! Remaining assessments on server: ${remaining.length}`);
  remaining.forEach((r) => console.log(`   - [${r.type}] ${r.title} (${r.id})`));
}

main().catch(console.error);
