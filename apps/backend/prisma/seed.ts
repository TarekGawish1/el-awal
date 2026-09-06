import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });

import {
  PrismaClient,
  UserRole,
  StudentAcademicStatus,
  GroupEnrollmentStatus,
  AttendanceStatus,
  RecordingMethod,
  PaymentStatus,
  AssessmentType,
  QuestionType,
  SubmissionStatus,
  CourseStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const connectionUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
const prisma = new PrismaClient({
  datasources: connectionUrl
    ? {
        db: {
          url: connectionUrl,
        },
      }
    : undefined,
});

/**
 * Returns a normalized Date object for a specific dayOfWeek and weeks offset.
 * dayOfWeek: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
 */
function getSpecificDayDate(targetDayOfWeek: number, weeksOffset: number = 0): Date {
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const diff = targetDayOfWeek - currentDayOfWeek + weeksOffset * 7;
  const date = new Date(now);
  date.setDate(now.getDate() + diff);
  date.setHours(12, 0, 0, 0); // normalize
  return date;
}

async function main() {
  console.log('🌱 Starting Clean, Deterministic Database Seeding for El-Awal Platform...');

  const rawPassword = process.env.SEED_DEMO_PASSWORD || 'Password123!';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Clean slate: Delete all tables in topological order
  console.log('🧹 Clearing all existing data from database...');
  await prisma.studentAnswer.deleteMany({});
  await prisma.assessmentSubmission.deleteMany({});
  await prisma.assessmentQuestion.deleteMany({});
  await prisma.assessment.deleteMany({});
  await prisma.contentProgress.deleteMany({});
  await prisma.educationalContent.deleteMany({});
  await prisma.courseProgress.deleteMany({});
  await prisma.courseAccess.deleteMany({});
  await prisma.courseEnrollment.deleteMany({});
  await prisma.courseLesson.deleteMany({});
  await prisma.courseModule.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.studentPaymentRecord.deleteMany({});
  await prisma.studentEvaluation.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.lessonSession.deleteMany({});
  await prisma.lessonSchedule.deleteMany({});
  await prisma.groupEnrollment.deleteMany({});
  await prisma.academicGroup.deleteMany({});
  await prisma.parentStudentLink.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.refreshTokenSession.deleteMany({});
  await prisma.secretariatProfile.deleteMany({});
  await prisma.parentProfile.deleteMany({});
  await prisma.studentProfile.deleteMany({});
  await prisma.teacherProfile.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✨ All database tables cleared.');

  // ==============================================================================
  // 2. SEED TEACHER & STAFF
  // ==============================================================================
  const teacherUser = await prisma.user.create({
    data: {
      fullName: 'أ. أحمد غريب',
      email: 'teacher@elawal.com',
      phone: '+201000000001',
      passwordHash,
      role: UserRole.TEACHER,
      isActive: true,
      teacherProfile: {
        create: {
          specialty: 'اللغة العربية والبلاغة للثانوية العامة',
          bio: 'معلم أول ومعد سلسلة الأوائل في اللغة العربية بخبرة تتجاوز 15 عاماً.',
          activeAcademicYear: '2026-2027',
          activeAcademicTerm: 'FIRST_TERM',
        },
      },
    },
    include: { teacherProfile: true },
  });

  const staffUser = await prisma.user.create({
    data: {
      fullName: 'سارة إبراهيم',
      email: 'staff@elawal.com',
      phone: '+201000000002',
      passwordHash,
      role: UserRole.SECRETARIAT,
      isActive: true,
      secretariatProfile: {
        create: {
          staffTitle: 'مسؤول شؤون الطلاب والماليات والتسجيل',
        },
      },
    },
  });

  console.log(`✅ Teacher (${teacherUser.email}) and Staff (${staffUser.email}) created.`);

  // ==============================================================================
  // 3. SEED EXACTLY 4 ACADEMIC GROUPS (2026-2027, FIRST_TERM)
  // ==============================================================================
  const groupsDefinition = [
    {
      name: 'مجموعة الصف الأول الثانوي (أ)',
      gradeLevel: 'الصف الأول الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'مجموعة تأسيس النحو والبلاغة وتطبيقات القراءة المتحررة - الفوج الأول',
      maxCapacity: 30,
      monthlyFee: 250.0,
      schedules: [
        { dayOfWeek: 6, startTime: '10:00', endTime: '12:00', location: 'قاعة 101' }, // Sat 10:00
        { dayOfWeek: 2, startTime: '10:00', endTime: '12:00', location: 'قاعة 101' }, // Tue 10:00
      ],
    },
    {
      name: 'مجموعة الصف الأول الثانوي (ب)',
      gradeLevel: 'الصف الأول الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'مجموعة تأسيس النحو والبلاغة وتطبيقات القراءة المتحررة - الفوج الثاني',
      maxCapacity: 30,
      monthlyFee: 250.0,
      schedules: [
        { dayOfWeek: 0, startTime: '10:00', endTime: '12:00', location: 'قاعة 102' }, // Sun 10:00
        { dayOfWeek: 3, startTime: '10:00', endTime: '12:00', location: 'قاعة 102' }, // Wed 10:00
      ],
    },
    {
      name: 'مجموعة الصف الثاني الثانوي (علمي)',
      gradeLevel: 'الصف الثاني الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'مجموعة شرح المنهج وبناء التفكير النقدي وتطبيقات البلاغة التأسيسية',
      maxCapacity: 25,
      monthlyFee: 300.0,
      schedules: [
        { dayOfWeek: 1, startTime: '14:00', endTime: '16:00', location: 'قاعة 201' }, // Mon 14:00
        { dayOfWeek: 4, startTime: '14:00', endTime: '16:00', location: 'قاعة 201' }, // Thu 14:00
      ],
    },
    {
      name: 'مجموعة الصف الثالث الثانوي (العباقرة)',
      gradeLevel: 'الصف الثالث الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'مجموعة المراجعة المكثفة وتدريبات النحو المتقدم وشواهد البلاغة والنصوص المتحررة',
      maxCapacity: 20,
      monthlyFee: 350.0,
      schedules: [
        { dayOfWeek: 6, startTime: '16:00', endTime: '18:00', location: 'قاعة 301' }, // Sat 16:00
        { dayOfWeek: 2, startTime: '16:00', endTime: '18:00', location: 'قاعة 301' }, // Tue 16:00
      ],
    },
  ];

  const createdGroups: any[] = [];
  const createdSchedules: any[] = [];

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
        teacherId: teacherUser.id,
        isActive: true,
      },
    });
    createdGroups.push(group);

    for (const s of g.schedules) {
      const schedule = await prisma.lessonSchedule.create({
        data: {
          groupId: group.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location,
        },
      });
      createdSchedules.push({ ...schedule, groupName: g.name });
    }
  }

  console.log(`✅ ${createdGroups.length} Academic Groups created.`);

  // ==============================================================================
  // 4. SEED 8 LESSON SESSIONS (DISTRIBUTED ACROSS PAST & FUTURE)
  // ==============================================================================
  const createdSessions: any[] = [];

  // Group 0: Session 1 (Past - 1 week ago) & Session 2 (Upcoming this week)
  const g0_pastSession = await prisma.lessonSession.create({
    data: {
      groupId: createdGroups[0].id,
      scheduleId: createdSchedules[0].id,
      sessionDate: getSpecificDayDate(createdSchedules[0].dayOfWeek, -1),
      startTime: createdSchedules[0].startTime,
      endTime: createdSchedules[0].endTime,
      topic: 'مقدمة المنهج وقواعد كان وأخواتها',
    },
  });
  createdSessions.push(g0_pastSession);

  const g0_upcomingSession = await prisma.lessonSession.create({
    data: {
      groupId: createdGroups[0].id,
      scheduleId: createdSchedules[0].id,
      sessionDate: getSpecificDayDate(createdSchedules[0].dayOfWeek, 0),
      startTime: createdSchedules[0].startTime,
      endTime: createdSchedules[0].endTime,
      topic: 'كاد وأخواتها وأفعال المقاربة والرجاء والشروع',
    },
  });
  createdSessions.push(g0_upcomingSession);

  // Group 1: Session 3 (Past) & Session 4 (Upcoming)
  const g1_pastSession = await prisma.lessonSession.create({
    data: {
      groupId: createdGroups[1].id,
      scheduleId: createdSchedules[2].id,
      sessionDate: getSpecificDayDate(createdSchedules[2].dayOfWeek, -1),
      startTime: createdSchedules[2].startTime,
      endTime: createdSchedules[2].endTime,
      topic: 'تطبيقات البلاغة: التشبيه المفرد والتمثيلي',
    },
  });
  createdSessions.push(g1_pastSession);

  const g1_upcomingSession = await prisma.lessonSession.create({
    data: {
      groupId: createdGroups[1].id,
      scheduleId: createdSchedules[2].id,
      sessionDate: getSpecificDayDate(createdSchedules[2].dayOfWeek, 0),
      startTime: createdSchedules[2].startTime,
      endTime: createdSchedules[2].endTime,
      topic: 'الاستعارة التصريحية والمكنية',
    },
  });
  createdSessions.push(g1_upcomingSession);

  // Group 2: Session 5 (Past) & Session 6 (Upcoming)
  const g2_pastSession = await prisma.lessonSession.create({
    data: {
      groupId: createdGroups[2].id,
      scheduleId: createdSchedules[4].id,
      sessionDate: getSpecificDayDate(createdSchedules[4].dayOfWeek, -1),
      startTime: createdSchedules[4].startTime,
      endTime: createdSchedules[4].endTime,
      topic: 'إعراب الفعل المضارع وجزم المضارع في جواب الطلب',
    },
  });
  createdSessions.push(g2_pastSession);

  const g2_upcomingSession = await prisma.lessonSession.create({
    data: {
      groupId: createdGroups[2].id,
      scheduleId: createdSchedules[4].id,
      sessionDate: getSpecificDayDate(createdSchedules[4].dayOfWeek, 0),
      startTime: createdSchedules[4].startTime,
      endTime: createdSchedules[4].endTime,
      topic: 'اقتران جواب الشرط بالفاء والمصادر',
    },
  });
  createdSessions.push(g2_upcomingSession);

  // Group 3: Session 7 (Past) & Session 8 (Upcoming)
  const g3_pastSession = await prisma.lessonSession.create({
    data: {
      groupId: createdGroups[3].id,
      scheduleId: createdSchedules[6].id,
      sessionDate: getSpecificDayDate(createdSchedules[6].dayOfWeek, -1),
      startTime: createdSchedules[6].startTime,
      endTime: createdSchedules[6].endTime,
      topic: 'الوحدة الأولى نحو: همزة القطع وألف الوصل والفروق النحوية',
    },
  });
  createdSessions.push(g3_pastSession);

  const g3_upcomingSession = await prisma.lessonSession.create({
    data: {
      groupId: createdGroups[3].id,
      scheduleId: createdSchedules[6].id,
      sessionDate: getSpecificDayDate(createdSchedules[6].dayOfWeek, 0),
      startTime: createdSchedules[6].startTime,
      endTime: createdSchedules[6].endTime,
      topic: 'المشتقات العاملة وأعمال اسم الفاعل وصيغ المبالغة',
    },
  });
  createdSessions.push(g3_upcomingSession);

  console.log(`✅ ${createdSessions.length} Lesson Sessions created.`);

  // ==============================================================================
  // 5. SEED EXACTLY 40 ACTIVE STUDENTS (10 PER GROUP, DETERMINISTIC & CONFLICT-FREE)
  // ==============================================================================
  const studentNames = [
    // Group 1 Students (Index 0..9)
    'أحمد محمد عبد الرحمن',
    'محمود علي إبراهيم',
    'عمر ياسر الشناوي',
    'كريم حسام الدين',
    'يوسف أشرف كامل',
    'سارة أحمد فؤاد',
    'نور الدين هيثم',
    'مريم خالد زكي',
    'فاطمة طارق حسن',
    'هدى سمير الجبالي',

    // Group 2 Students (Index 10..19)
    'مصطفى جمال عثمان',
    'عبد الرحمن حسني رضوان',
    'ياسين ماجد النجار',
    'زياد عماد غالي',
    'حمزة وليد منصور',
    'آية سعيد عبد الفتاح',
    'رنا شريف الملاح',
    'حبيبة إيهاب شكري',
    'ملك تامر القاضي',
    'جنى وائل الديب',

    // Group 3 Students (Index 20..29)
    'علي حسن البنا',
    'بلال هاني الصاوي',
    'حازم مدحت عامر',
    'سيف الدين ممدوح',
    'إياد نبيل القصاص',
    'سلمى عمرو البرادعي',
    'شهد عادل الباجوري',
    'نادين عصام البكري',
    'ريم سامح الألفي',
    'بسملة مجدي سليم',

    // Group 4 Students (Index 30..39)
    'يحيى زكريا المهدي',
    'معاذ أسامة عاشور',
    'طارق زياد العريان',
    'أنس شريف الدمرداش',
    'مروان شادي الفقي',
    'فريدة حازم زهران',
    'ياسمين مجدي الهواري',
    'خلود عبد الله بيومي',
    'تقى أيمن الميهي',
    'دنيا هاني السعدني',
  ];

  const createdStudents: any[] = [];

  for (let i = 0; i < studentNames.length; i++) {
    const studentNumber = i + 1;
    const paddedIndex = String(studentNumber).padStart(4, '0');
    const studentCode = `STU-2026-${paddedIndex}`;
    const qrCodeToken = `QR-STU-2026-${paddedIndex}`;
    const phone = `+2010${String(10000000 + studentNumber).slice(1)}`;
    const email = `student${studentNumber}@elawal.com`;

    // Determine group: 10 students per group
    const groupIndex = Math.floor(i / 10);
    const assignedGroup = createdGroups[groupIndex];

    const studentUser = await prisma.user.create({
      data: {
        fullName: studentNames[i],
        email,
        phone,
        passwordHash,
        role: UserRole.STUDENT,
        isActive: true,
        studentProfile: {
          create: {
            studentCode,
            qrCodeToken,
            gradeLevel: assignedGroup.gradeLevel,
            academicStage: 'المرحلة الثانوية',
            academicStatus: StudentAcademicStatus.ACTIVE,
            emergencyPhone: `+2012${String(20000000 + studentNumber).slice(1)}`,
          },
        },
      },
      include: { studentProfile: true },
    });

    // 1:1 Group Enrollment
    await prisma.groupEnrollment.create({
      data: {
        groupId: assignedGroup.id,
        studentId: studentUser.id,
        status: GroupEnrollmentStatus.ACTIVE,
      },
    });

    createdStudents.push({
      ...studentUser,
      studentCode,
      qrCodeToken,
      groupId: assignedGroup.id,
      groupName: assignedGroup.name,
    });
  }

  console.log(`✅ Exactly ${createdStudents.length} Active Students created and enrolled.`);

  // ==============================================================================
  // 6. SEED INITIAL ATTENDANCE (PAST SESSION 1 FOR GROUP 0: 8 PRESENT, 1 EXCUSED, 1 ABSENT)
  // ==============================================================================
  const g0Students = createdStudents.slice(0, 10);

  for (let i = 0; i < g0Students.length; i++) {
    const student = g0Students[i];
    let status: AttendanceStatus = AttendanceStatus.PRESENT;
    let method: RecordingMethod = RecordingMethod.QR_SCAN;

    if (i === 8) {
      status = AttendanceStatus.EXCUSED;
      method = RecordingMethod.MANUAL;
    } else if (i === 9) {
      status = AttendanceStatus.ABSENT;
      method = RecordingMethod.MANUAL;
    }

    await prisma.attendanceRecord.create({
      data: {
        sessionId: g0_pastSession.id,
        studentId: student.id,
        status,
        recordingMethod: method,
        recordedById: teacherUser.id,
        notes: status === AttendanceStatus.EXCUSED ? 'عذر طبي مسبق' : undefined,
      },
    });
  }

  console.log('✅ Initial Attendance records created for Session 1.');

  // ==============================================================================
  // 7. SEED 10 SAMPLE PAYMENT RECORDS FOR BILLING PERIOD (OCTOBER 2026)
  // ==============================================================================
  for (let i = 0; i < 10; i++) {
    const student = createdStudents[i];
    await prisma.studentPaymentRecord.create({
      data: {
        studentId: student.id,
        groupId: student.groupId,
        periodYear: 2026,
        periodMonth: 10,
        amountExpected: 250.0,
        amountPaid: 250.0,
        currency: 'EGP',
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'CASH',
        receiptNumber: `REC-2026-10-${String(i + 1).padStart(4, '0')}`,
        recordedById: staffUser.id,
        notes: 'سداد اشتراك شهر أكتوبر 2026 نقداً',
      },
    });
  }

  console.log('✅ 10 Sample Payment Records created.');

  // ==============================================================================
  // 8. FINAL SUMMARY REPORT
  // ==============================================================================
  console.log('\n========================================================');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY WITH ZERO CONFLICTS!');
  console.log('========================================================');
  console.log(`👤 Teacher Login:    ${teacherUser.email} / ${rawPassword}`);
  console.log(`👤 Staff Login:      ${staffUser.email} / ${rawPassword}`);
  console.log(`👥 Total Groups:     ${createdGroups.length}`);
  console.log(`🎓 Total Students:   ${createdStudents.length} (Exactly 10 per group)`);
  console.log(`📅 Total Sessions:   ${createdSessions.length}`);
  console.log('========================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Database Seeding Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
