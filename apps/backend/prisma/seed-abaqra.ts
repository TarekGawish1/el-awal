import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dummy students to Al-Abaqra group...');

  const group = await prisma.academicGroup.findFirst({
    where: {
      name: {
        contains: 'العباقرة',
      }
    }
  });

  if (!group) {
    console.log('Group not found! Listing available groups:');
    const allGroups = await prisma.academicGroup.findMany();
    console.log(allGroups.map(g => g.name));
    return;
  }

  console.log(`Found group: ${group.name} (${group.id})`);

  const passwordHash = await bcrypt.hash('password123', 10);

  const students = [
    { name: 'محمد علي النجار', code: 'STU-ABAQ-01', phone: '01011111111' },
    { name: 'أحمد محمود رضوان', code: 'STU-ABAQ-02', phone: '01022222222' },
    { name: 'عمر ياسر فاروق', code: 'STU-ABAQ-03', phone: '01033333333' },
    { name: 'كريم حسن الديب', code: 'STU-ABAQ-04', phone: '01044444444' },
    { name: 'مصطفى كمال السيد', code: 'STU-ABAQ-05', phone: '01055555555' },
  ];

  for (const s of students) {
    const user = await prisma.user.create({
      data: {
        fullName: s.name,
        email: `student_${s.code.toLowerCase()}@elawal.com`,
        phone: s.phone,
        passwordHash,
        role: UserRole.STUDENT,
        isActive: true,
        studentProfile: {
          create: {
            studentCode: s.code,
            qrCodeToken: s.code,
            gradeLevel: group.gradeLevel,
            emergencyPhone: '01100000000',
            academicStatus: 'ACTIVE',
            groupEnrollments: {
              create: {
                groupId: group.id,
                status: 'ACTIVE',
              }
            }
          }
        }
      }
    });
    console.log(`Created student: ${s.name}`);
  }

  console.log('Done!');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
