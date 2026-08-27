import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed-groups...');

  // Get a teacher to assign groups to
  const teacherProfile = await prisma.teacherProfile.findFirst();
  if (!teacherProfile) {
    console.error('No teacher found in the DB. Please create a teacher first.');
    return;
  }
  const teacherId = teacherProfile.id;

  const groupsDefinition = [
    {
      name: 'مجموعة النخبة 1 (الصف الأول الثانوي)',
      gradeLevel: 'الصف الأول الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'مجموعة تجريبية للصف الأول الثانوي (مواعيد منفصلة)',
      maxCapacity: 30,
      monthlyFee: 200,
      schedules: [
        { dayOfWeek: 0, startTime: '15:00', endTime: '17:00', location: 'قاعة 1' },
        { dayOfWeek: 3, startTime: '15:00', endTime: '17:00', location: 'قاعة 1' },
      ],
    },
    {
      name: 'مجموعة النخبة 2 (الصف الأول الثانوي)',
      gradeLevel: 'الصف الأول الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'مجموعة تجريبية للصف الأول الثانوي (مواعيد منفصلة 2)',
      maxCapacity: 30,
      monthlyFee: 200,
      schedules: [
        { dayOfWeek: 1, startTime: '15:00', endTime: '17:00', location: 'قاعة 2' },
        { dayOfWeek: 4, startTime: '15:00', endTime: '17:00', location: 'قاعة 2' },
      ],
    },
    {
      name: 'مجموعة المتفوقين 1 (الصف الثاني الثانوي)',
      gradeLevel: 'الصف الثاني الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'مجموعة تجريبية للصف الثاني الثانوي (مواعيد منفصلة)',
      maxCapacity: 30,
      monthlyFee: 250,
      schedules: [
        { dayOfWeek: 0, startTime: '18:00', endTime: '20:00', location: 'قاعة 3' },
        { dayOfWeek: 3, startTime: '18:00', endTime: '20:00', location: 'قاعة 3' },
      ],
    },
    {
      name: 'مجموعة العباقرة 1 (الصف الثالث الثانوي)',
      gradeLevel: 'الصف الثالث الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'مجموعة تجريبية للصف الثالث الثانوي (مواعيد منفصلة)',
      maxCapacity: 25,
      monthlyFee: 300,
      schedules: [
        { dayOfWeek: 2, startTime: '14:00', endTime: '16:00', location: 'قاعة 4' },
        { dayOfWeek: 5, startTime: '14:00', endTime: '16:00', location: 'قاعة 4' },
      ],
    },
    {
      name: 'مجموعة العباقرة 2 (الصف الثالث الثانوي)',
      gradeLevel: 'الصف الثالث الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'مجموعة تجريبية للصف الثالث الثانوي (مواعيد منفصلة 2)',
      maxCapacity: 25,
      monthlyFee: 300,
      schedules: [
        { dayOfWeek: 1, startTime: '18:00', endTime: '20:00', location: 'قاعة 5' },
        { dayOfWeek: 4, startTime: '18:00', endTime: '20:00', location: 'قاعة 5' },
      ],
    }
  ];

  for (const g of groupsDefinition) {
    const group = await prisma.academicGroup.create({
      data: {
        name: g.name,
        gradeLevel: g.gradeLevel,
        academicYear: g.academicYear,
        academicTerm: g.academicTerm,
        description: g.description,
        maxCapacity: g.maxCapacity,
        monthlyFee: g.monthlyFee,
        teacherId: teacherId,
        isActive: true,
      },
    });

    for (const s of g.schedules) {
      await prisma.lessonSchedule.create({
        data: {
          groupId: group.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location,
        },
      });
    }
    console.log(`Created group: ${group.name} with schedules`);
  }

  console.log('Seed groups completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
