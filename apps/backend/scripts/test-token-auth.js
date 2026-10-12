const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const secret = process.env.JWT_SECRET;
let url = process.env.DATABASE_URL.replace(/sslmode=[a-z\-]+/i, 'sslmode=no-verify');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  const student = await prisma.user.findFirst({
    where: { role: 'STUDENT' },
    include: { studentProfile: true }
  });

  const payload = {
    sub: student.id,
    role: 'STUDENT',
    typ: 'access',
  };

  const token = jwt.sign(payload, secret, { expiresIn: '1d' });
  console.log('Generated token for student:', student.fullName);

  const res = await fetch('http://localhost:4000/api/v1/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  console.log('Response /api/v1/auth/me:', JSON.stringify(data, null, 2));

  // Also test /api/v1/students/my-group
  const groupRes = await fetch('http://localhost:4000/api/v1/students/my-group', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const groupData = await groupRes.json();
  console.log('Response /api/v1/students/my-group:', JSON.stringify(groupData, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
