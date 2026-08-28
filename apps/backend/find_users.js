const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
});

function getPhoneVariants(phone) {
  const digits = phone.replace(/\D/g, '');
  const variants = new Set();
  variants.add(phone);
  variants.add(digits);

  let localNumber = '';
  if (digits.startsWith('20') && digits.length === 12) {
    localNumber = '0' + digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    localNumber = digits;
  } else if (digits.length === 10) {
    localNumber = '0' + digits;
  }

  if (localNumber) {
    variants.add(localNumber);
    variants.add('+2' + localNumber);
    variants.add('2' + localNumber);
    variants.add(localNumber.slice(1));
    variants.add('+20' + localNumber.slice(1));
    variants.add('0020' + localNumber.slice(1));
  }

  return Array.from(variants);
}

async function main() {
  const parentVariants = getPhoneVariants('01067789574');
  const studentVariants = getPhoneVariants('01067789576');
  const allVariants = Array.from(new Set([...parentVariants, ...studentVariants]));

  console.log('Searching for phone variants:', allVariants);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { phone: { in: allVariants } },
        { fullName: { contains: 'عاصم' } },
        { studentProfile: { emergencyPhone: { in: allVariants } } },
      ],
    },
    include: {
      studentProfile: true,
      parentProfile: true,
      teacherProfile: true,
    },
  });

  console.log(`Found ${users.length} users:`);
  console.log(JSON.stringify(users, null, 2));

  // Also check parentStudentLinks
  const links = await prisma.parentStudentLink.findMany({
    include: {
      parent: { include: { user: true } },
      student: { include: { user: true } },
    },
  });

  const matchingLinks = links.filter(l => 
    allVariants.includes(l.parent?.user?.phone || '') || 
    allVariants.includes(l.student?.user?.phone || '')
  );

  console.log(`Matching parent links: ${matchingLinks.length}`);
  console.log(JSON.stringify(matchingLinks, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
