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
  CourseEnrollmentStatus,
  CourseAccessStatus,
  ContentType,
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
  console.log('🌱 Starting Comprehensive Non-Conflicting Database Seeding for El-Awal Platform...');

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
      fullName: 'أ. طارق عبد الله',
      email: 'teacher@elawal.com',
      phone: '+201000000001',
      passwordHash,
      role: UserRole.TEACHER,
      isActive: true,
      teacherProfile: {
        create: {
          specialty: 'اللغة العربية والبلاغة للثانوية العامة',
          bio: 'معلم أول ومعد سلسلة الأوائل في اللغة العربية بخبرة تتجاوز 15 عاماً في تدريس الثانوية العامة والشهادات الإعدادية.',
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
  // 3. SEED ACADEMIC GROUPS (100% NON-CONFLICTING WEEKLY SCHEDULES)
  // ==============================================================================
  const groupsData = [
    {
      name: 'الصف الثالث الثانوي - مجموعة العباقرة',
      gradeLevel: 'الصف الثالث الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'مجموعة المراجعة المكثفة وتدريبات النحو المتقدم وشواهد البلاغة والنصوص المتحررة',
      maxCapacity: 50,
      monthlyFee: 500.0,
      schedules: [
        { dayOfWeek: 6, startTime: '17:00', endTime: '19:00', location: 'قاعة النخبة 1' }, // Sat 17:00
        { dayOfWeek: 2, startTime: '17:00', endTime: '19:00', location: 'قاعة النخبة 1' }, // Tue 17:00
      ],
    },
    {
      name: 'الصف الثالث الثانوي - مجموعة التفوق',
      gradeLevel: 'الصف الثالث الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'مجموعة الشرح التفاعلي لقواعد النحو وفنون الأدب وتطبيقات القراءة المتحررة',
      maxCapacity: 45,
      monthlyFee: 500.0,
      schedules: [
        { dayOfWeek: 0, startTime: '17:00', endTime: '19:00', location: 'قاعة الأمل 2' }, // Sun 17:00
        { dayOfWeek: 3, startTime: '17:00', endTime: '19:00', location: 'قاعة الأمل 2' }, // Wed 17:00
      ],
    },
    {
      name: 'الصف الثاني الثانوي - مجموعة الإبداع',
      gradeLevel: 'الصف الثاني الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'مجموعة شرح المنهج وبناء التفكير النقدي وتطبيقات البلاغة التأسيسية',
      maxCapacity: 40,
      monthlyFee: 400.0,
      schedules: [
        { dayOfWeek: 1, startTime: '17:00', endTime: '19:00', location: 'قاعة 3' }, // Mon 17:00
        { dayOfWeek: 4, startTime: '17:00', endTime: '19:00', location: 'قاعة 3' }, // Thu 17:00
      ],
    },
    {
      name: 'الصف الأول الثانوي - مجموعة التأسيس',
      gradeLevel: 'الصف الأول الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'تأسيس شامل في قواعد الإعراب والصور البيانية والانتقال للمرحلة الثانوية',
      maxCapacity: 35,
      monthlyFee: 350.0,
      schedules: [
        { dayOfWeek: 6, startTime: '14:00', endTime: '16:00', location: 'قاعة 1' }, // Sat 14:00
        { dayOfWeek: 2, startTime: '14:00', endTime: '16:00', location: 'قاعة 1' }, // Tue 14:00
      ],
    },
    {
      name: 'الصف الثالث الإعدادي - مجموعة الأوائل',
      gradeLevel: 'الصف الثالث الإعدادي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'كورس الشهادة الإعدادية لضمان الدرجة النهائية في اللغة العربية',
      maxCapacity: 40,
      monthlyFee: 300.0,
      schedules: [
        { dayOfWeek: 0, startTime: '14:00', endTime: '16:00', location: 'قاعة الفرسان' }, // Sun 14:00
        { dayOfWeek: 3, startTime: '14:00', endTime: '16:00', location: 'قاعة الفرسان' }, // Wed 14:00
      ],
    },
    {
      name: 'الصف الثاني الإعدادي - مجموعة الرواد',
      gradeLevel: 'الصف الثاني الإعدادي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'شرح النحو والنصوص وقصة كفاح شعب مصر وحل بنوك الأسئلة',
      maxCapacity: 30,
      monthlyFee: 280.0,
      schedules: [
        { dayOfWeek: 1, startTime: '14:00', endTime: '16:00', location: 'قاعة 4' }, // Mon 14:00
        { dayOfWeek: 4, startTime: '14:00', endTime: '16:00', location: 'قاعة 4' }, // Thu 14:00
      ],
    },
    {
      name: 'الصف الأول الإعدادي - مجموعة البراعم',
      gradeLevel: 'الصف الأول الإعدادي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'شرح مبسط لقواعد النحو وهمزات الوصل والقطع وتدريبات القراءة',
      maxCapacity: 30,
      monthlyFee: 250.0,
      schedules: [
        { dayOfWeek: 0, startTime: '11:00', endTime: '13:00', location: 'قاعة 2' }, // Sun 11:00
        { dayOfWeek: 5, startTime: '14:00', endTime: '16:00', location: 'قاعة 2' }, // Fri 14:00
      ],
    },
    {
      name: 'الصف السادس الابتدائي - مجموعة التميز',
      gradeLevel: 'الصف السادس الابتدائي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'المنهج المطور الجديد وتأسيس النحو والإملاء والتعبير الكتابي',
      maxCapacity: 30,
      monthlyFee: 220.0,
      schedules: [
        { dayOfWeek: 6, startTime: '11:00', endTime: '13:00', location: 'قاعة النور' }, // Sat 11:00
        { dayOfWeek: 5, startTime: '10:00', endTime: '12:00', location: 'قاعة النور' }, // Fri 10:00
      ],
    },
  ];

  const createdGroups = [];
  for (const g of groupsData) {
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
        schedules: {
          create: g.schedules,
        },
      },
      include: {
        schedules: true,
      },
    });
    createdGroups.push(group);
  }
  console.log(`✅ Created ${createdGroups.length} Academic Groups with zero overlapping weekly schedules.`);

  // ==============================================================================
  // 4. SEED 50 REALISTIC ARABIC STUDENTS & PARENTS
  // ==============================================================================
  const arabicFirstNames = [
    'محمود', 'عمر', 'فاطمة', 'يوسف', 'مريم', 'زياد', 'أحمد', 'سارة', 'كريم', 'نور',
    'علي', 'خديجة', 'إبراهيم', 'سلمى', 'حسن', 'آية', 'مصطفى', 'هنا', 'حمزة', 'ملك',
    'طارق', 'ياسمين', 'خالد', 'رنا', 'عبد الرحمن', 'شهد', 'يحيى', 'حبيبة', 'محمد', 'جنى',
    'آدم', 'فريدة', 'بلال', 'بسملة', 'حازم', 'ندى', 'سيف', 'روان', 'عصام', 'إسراء',
    'عمرو', 'منة الله', 'سامح', 'ريتاج', 'مازن', 'أروى', 'أنس', 'هاجر', 'وائل', 'ليلى'
  ];

  const arabicFamilyNames = [
    'أحمد علي', 'خالد محمود', 'محمد السيد', 'حسن مصطفى', 'إبراهيم عبد الله', 'طارق نصر',
    'سعيد عبد العزيز', 'فاروق إمام', 'رضا الشافعي', 'عثمان البدري', 'جمال عبد الناصر',
    'فتحي الصاوي', 'صلاح الدين', 'عادل هلال', 'شريف القاضي', 'حسين التهامي', 'ياسر رضوان',
    'شوقي عبد الفتاح', 'عفيفي النجار', 'المهدي غانم', 'مختار سويلم', 'زكريا القوصي'
  ];

  const createdStudents: any[] = [];

  for (let i = 0; i < 50; i++) {
    const firstName = arabicFirstNames[i % arabicFirstNames.length];
    const familyName = arabicFamilyNames[i % arabicFamilyNames.length];
    const fullName = `${firstName} ${familyName}`;
    const studentCode = `STU-2026-${String(i + 1).padStart(4, '0')}`;
    const qrCodeToken = `qr_tok_student_${String(i + 1).padStart(4, '0')}`;
    
    // Distribute students evenly across the 8 groups
    const group = createdGroups[i % createdGroups.length];
    const email = i === 0 ? 'mahmoud@student.elawal.com' : i === 1 ? 'omar@student.elawal.com' : `student${i + 1}@elawal.com`;
    const phone = `+2010${String(10000000 + i).slice(0, 8)}`;
    const parentPhone = `+2012${String(20000000 + i).slice(0, 8)}`;
    const parentEmail = `parent${i + 1}@elawal.com`;
    const parentName = `ولي أمر ${firstName}`;

    // 1. Create Student User & Profile
    const studentUser = await prisma.user.create({
      data: {
        fullName,
        phone,
        email,
        passwordHash,
        role: UserRole.STUDENT,
        isActive: true,
        studentProfile: {
          create: {
            studentCode,
            qrCodeToken,
            gradeLevel: group.gradeLevel,
            academicStage: group.gradeLevel.includes('الثانوي')
              ? 'المرحلة الثانوية'
              : group.gradeLevel.includes('الإعدادي')
              ? 'المرحلة الإعدادية'
              : 'المرحلة الابتدائية',
            academicStatus: StudentAcademicStatus.ACTIVE,
            emergencyPhone: parentPhone,
          },
        },
      },
      include: { studentProfile: true },
    });

    // 2. Create Parent User & Profile
    const parentUser = await prisma.user.create({
      data: {
        fullName: parentName,
        phone: parentPhone,
        email: parentEmail,
        passwordHash,
        role: UserRole.PARENT,
        isActive: true,
        parentProfile: {
          create: {
            relationshipType: i % 3 === 0 ? 'ولي أمر (أم)' : 'ولي أمر (أب)',
          },
        },
      },
    });

    // 3. Link Parent to Student
    await prisma.parentStudentLink.create({
      data: {
        parentId: parentUser.id,
        studentId: studentUser.id,
      },
    });

    // 4. Enroll Student in Group
    await prisma.groupEnrollment.create({
      data: {
        groupId: group.id,
        studentId: studentUser.id,
        status: GroupEnrollmentStatus.ACTIVE,
      },
    });

    createdStudents.push({ user: studentUser, profile: studentUser.studentProfile!, groupId: group.id, group });
  }
  console.log(`✅ Onboarded ${createdStudents.length} Students with linked Parents and Group Enrollments.`);

  // ==============================================================================
  // 5. SEED 32 CLEAN LESSON SESSIONS (EXACT SCHEDULE DAYS & START TIMES)
  // ==============================================================================
  const sessionTopics = [
    'همزة القطع وألف الوصل والمصادر الخماسية والسداسية',
    'فنون التشبيه: المفرد، التمثيلي، والضمني مع الشواهد الشعرية',
    'الاستعارة المكنية والتصريحية وأسرار الجمال البلاغي',
    'المشتقات العاملة: اسم الفاعل، صيغ المبالغة، واسم المفعول',
    'المصادر الصريحة والمؤول واسم المرة واسم الهيئة',
    'المحسنات البديعية: الطباق، الجناس، السجع، وحسن التقسيم',
    'الأدب: مدرسة الإحياء والبعث وجيل التطوير وتطبيقاتها',
    'قواعد إعراب الأفعال الخمسة والمضارع المجزوم في جواب الطلب',
    'النصوص المتحررة واستراتيجيات استنباط الفكرة الرئيسة والمغزى الضمني',
    'تدريبات بنك المعرفة ونماذج الامتحانات الشاملة'
  ];

  const createdSessions: any[] = [];

  for (let gIndex = 0; gIndex < createdGroups.length; gIndex++) {
    const group = createdGroups[gIndex];
    const groupStudents = createdStudents.filter((s) => s.groupId === group.id);
    const schedules = group.schedules; // 2 weekly schedules per group

    // We will generate 4 sessions per group matching its exact schedule days and times:
    // Session 1: Schedule 0, 2 weeks ago
    // Session 2: Schedule 1, 1 week ago
    // Session 3: Schedule 0, Current week
    // Session 4: Schedule 1, Current/Upcoming week
    const sessionPlan = [
      { sched: schedules[0], weeksOffset: -2, topicIdx: (gIndex * 4) % sessionTopics.length },
      { sched: schedules[1], weeksOffset: -1, topicIdx: (gIndex * 4 + 1) % sessionTopics.length },
      { sched: schedules[0], weeksOffset: 0, topicIdx: (gIndex * 4 + 2) % sessionTopics.length },
      { sched: schedules[1], weeksOffset: 0, topicIdx: (gIndex * 4 + 3) % sessionTopics.length },
    ];

    for (const plan of sessionPlan) {
      const sessionDate = getSpecificDayDate(plan.sched.dayOfWeek, plan.weeksOffset);
      const topic = `${sessionTopics[plan.topicIdx]} - ${group.name.split(' - ')[0]}`;

      const session = await prisma.lessonSession.create({
        data: {
          groupId: group.id,
          sessionDate,
          startTime: plan.sched.startTime,
          topic,
        },
      });

      createdSessions.push(session);

      // Create attendance records for each student in the group
      for (const student of groupStudents) {
        const rand = Math.random();
        const status =
          rand > 0.15
            ? AttendanceStatus.PRESENT
            : rand > 0.07
            ? AttendanceStatus.ABSENT
            : AttendanceStatus.EXCUSED;

        await prisma.attendanceRecord.create({
          data: {
            sessionId: session.id,
            studentId: student.user.id,
            status,
            recordingMethod: rand > 0.5 ? RecordingMethod.QR_SCAN : RecordingMethod.MANUAL,
            recordedById: teacherUser.id,
            notes: status === AttendanceStatus.EXCUSED ? 'إذن مسبق من ولي الأمر' : undefined,
          },
        });
      }
    }
  }
  console.log(`✅ Seeded ${createdSessions.length} Non-Conflicting Lesson Sessions with complete Attendance Logs.`);

  // ==============================================================================
  // 6. SEED 100 TUITION PAYMENT & FINANCE RECORDS
  // ==============================================================================
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  let paymentCount = 0;
  for (const student of createdStudents) {
    // 1. Previous month payment (Most paid)
    await prisma.studentPaymentRecord.create({
      data: {
        studentId: student.user.id,
        groupId: student.groupId,
        periodYear: prevYear,
        periodMonth: prevMonth,
        amountExpected: student.group.monthlyFee,
        amountPaid: student.group.monthlyFee,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: paymentCount % 3 === 0 ? 'INSTAPAY' : paymentCount % 3 === 1 ? 'VODAFONE_CASH' : 'CASH',
        receiptNumber: `REC-${prevYear}${String(prevMonth).padStart(2, '0')}-${String(paymentCount + 100).padStart(3, '0')}`,
        recordedById: staffUser.id,
        notes: 'تم السداد بالكامل وإصدار الإيصال الرقمي',
      },
    });
    paymentCount++;

    // 2. Current month payment (Varied statuses)
    const isCurrentPaid = paymentCount % 3 !== 0;
    const isOverdue = paymentCount % 6 === 0;

    await prisma.studentPaymentRecord.create({
      data: {
        studentId: student.user.id,
        groupId: student.groupId,
        periodYear: currentYear,
        periodMonth: currentMonth,
        amountExpected: student.group.monthlyFee,
        amountPaid: isCurrentPaid ? student.group.monthlyFee : 0,
        paymentStatus: isCurrentPaid ? PaymentStatus.PAID : isOverdue ? PaymentStatus.OVERDUE : PaymentStatus.PENDING,
        paymentMethod: isCurrentPaid ? (paymentCount % 2 === 0 ? 'CASH' : 'INSTAPAY') : 'CASH',
        receiptNumber: isCurrentPaid
          ? `REC-${currentYear}${String(currentMonth).padStart(2, '0')}-${String(paymentCount + 200).padStart(3, '0')}`
          : undefined,
        recordedById: staffUser.id,
        notes: isCurrentPaid ? 'سداد الاشتراك الشهري' : 'بانتظار السداد من الطالب أو ولي الأمر',
      },
    });
    paymentCount++;
  }
  console.log(`✅ Seeded ${paymentCount} Student Tuition Payment Records.`);

  // ==============================================================================
  // 7. SEED 24 EDUCATIONAL CONTENT ITEMS (PDFs, Videos, Summaries)
  // ==============================================================================
  const educationalTitles = [
    { title: 'مذكرة النحو الشاملة - الوحدة الأولى (همزتا الوصل والقطع)', type: ContentType.SUMMARY, ext: 'pdf' },
    { title: 'شيت واجب البلاغة - فنون التشبيه والاستعارة وتطبيقاتها', type: ContentType.FILE, ext: 'pdf' },
    { title: 'تسجيل محاضرة: علم البيان وأسرار التذوق البلاغي', type: ContentType.LECTURE_RECORDING, ext: 'mp4' },
    { title: 'ملخص مدرسة الإحياء والبعث وجيل التطوير في الأدب العربي', type: ContentType.SUMMARY, ext: 'pdf' },
    { title: 'كراسة التدريبات التفاعلية وإعراب الشواهد القرآنية', type: ContentType.FILE, ext: 'pdf' },
    { title: 'تسجيل محاضرة: المشتقات العاملة وأسرار إعمال المصدر', type: ContentType.LECTURE_RECORDING, ext: 'mp4' },
    { title: 'المراجعة الذهبية لفرع القراءة المتحررة والقطع التفسيرية', type: ContentType.REFERENCE, ext: 'pdf' },
    { title: 'نماذج الوزارة الاسترشادية مجابة ومحللة بالتفصيل', type: ContentType.FILE, ext: 'pdf' },
    { title: 'تسجيل ورشة تدريبية: حل مائة بيت شعر في البلاغة', type: ContentType.LECTURE_RECORDING, ext: 'mp4' },
    { title: 'خرائط ذهنية في قواعد النحو والإملاء والصرف', type: ContentType.SUMMARY, ext: 'pdf' },
    { title: 'تسجيل محاضرة: إعراب الجمل التي لا محل لها من الإعراب', type: ContentType.LECTURE_RECORDING, ext: 'mp4' },
    { title: 'ملحق تدريبات النحو للشهادة الإعدادية والثانوية', type: ContentType.FILE, ext: 'pdf' },
  ];

  for (let cIdx = 0; cIdx < educationalTitles.length * 2; cIdx++) {
    const item = educationalTitles[cIdx % educationalTitles.length];
    const group = createdGroups[cIdx % createdGroups.length];
    const isVideo = item.type === ContentType.LECTURE_RECORDING;

    await prisma.educationalContent.create({
      data: {
        teacherId: teacherUser.id,
        groupId: group.id,
        title: `${item.title} - ${group.gradeLevel} (جزء ${Math.floor(cIdx / 4) + 1})`,
        description: 'ملف تعليمي عالي الجودة معد بعناية لمساعدة الطلاب على التفوق والمراجعة المستمرة.',
        contentType: item.type,
        fileKey: isVideo ? `bunny:video-${cIdx + 1}` : `materials/doc-${cIdx + 1}.${item.ext}`,
        fileUrl: isVideo
          ? `https://iframe.mediadelivery.net/play/demo-video-${cIdx + 1}`
          : `https://assets.elawal.com/materials/doc-${cIdx + 1}.${item.ext}`,
        fileSize: BigInt(isVideo ? 85000000 : 2500000),
        mimeType: isVideo ? 'video/mp4' : 'application/pdf',
        gradeLevel: group.gradeLevel,
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
        sessionTopic: sessionTopics[cIdx % sessionTopics.length],
      },
    });
  }
  console.log(`✅ Seeded 24+ Educational Content Items with video streams and PDFs.`);

  // ==============================================================================
  // 8. SEED 18 ASSESSMENTS (EXAMS & ASSIGNMENTS) WITH QUESTIONS & SUBMISSIONS
  // ==============================================================================
  const assessmentTemplates = [
    { title: 'امتحان البلاغة والنحو الأسبوعي الأول', type: AssessmentType.EXAM, score: 20 },
    { title: 'واجب الوحدة الأولى: المشتقات وإعمالها', type: AssessmentType.ASSIGNMENT, score: 10 },
    { title: 'امتحان شامل في الأدب ومدرسة الإحياء والبعث', type: AssessmentType.EXAM, score: 30 },
    { title: 'واجب البلاغة: أسرار التشبيه والتمثيل', type: AssessmentType.ASSIGNMENT, score: 10 },
    { title: 'اختبار تجريبي نصف شهري في النصوص المتحررة', type: AssessmentType.EXAM, score: 25 },
    { title: 'واجب القواعد النحوية: إعراب الأفعال الخمسة والمضارع', type: AssessmentType.ASSIGNMENT, score: 10 },
  ];

  for (let aIdx = 0; aIdx < assessmentTemplates.length * 3; aIdx++) {
    const tpl = assessmentTemplates[aIdx % assessmentTemplates.length];
    const group = createdGroups[aIdx % createdGroups.length];
    const groupStudents = createdStudents.filter((s) => s.groupId === group.id);

    const assessment = await prisma.assessment.create({
      data: {
        teacherId: teacherUser.id,
        groupId: group.id,
        title: `${tpl.title} - ${group.name.split(' - ')[0]} [نموذج ${aIdx + 1}]`,
        description: 'اختبار تفاعلي يقيس الفهم العميق وقدرة الطالب على التطبيق المباشر.',
        type: tpl.type,
        totalScore: tpl.score,
        passingScore: tpl.score * 0.6,
        durationMinutes: tpl.type === AssessmentType.EXAM ? 45 : 30,
        isAutoGraded: true,
        isPublished: true,
        gradeLevel: group.gradeLevel,
        academicStage: group.gradeLevel.includes('الثانوي') ? 'المرحلة الثانوية' : 'المرحلة الإعدادية',
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        targetGroups: {
          connect: [{ id: group.id }],
        },
        questions: {
          create: [
            {
              questionNumber: 1,
              questionText: 'ما نوع الصورة البيانية في قول الشاعر: "والبدرُ في كَبِدِ السَّماءِ كَدِرهَمٍ مُلقىً على دِيباجةٍ زَرقاءِ"؟',
              questionType: QuestionType.MULTIPLE_CHOICE,
              optionsData: ['تشبيه بليغ', 'تشبيه تمثيلي', 'تشبيه ضمني', 'استعارة مكنية'],
              correctAnswer: 'تشبيه تمثيلي',
              explanation: 'تشبيه هيئة مركبة بهيئة مركبة مع وجود أداة التشبيه.',
              points: tpl.score / 4,
            },
            {
              questionNumber: 2,
              questionText: 'الهمزة في كلمة "استعانة" هي همزة وصل لأنها مصدر لفعل سداسي.',
              questionType: QuestionType.TRUE_FALSE,
              optionsData: ['صواب', 'خطأ'],
              correctAnswer: 'صواب',
              explanation: 'الفعل الماضي منها ستة أحرف.',
              points: tpl.score / 4,
            },
            {
              questionNumber: 3,
              questionText: 'ما إعراب كلمة "ابن" في جملة: "عمرُ بنُ الخطابِ خليفةٌ عادل"؟',
              questionType: QuestionType.MULTIPLE_CHOICE,
              optionsData: ['نعت مرفوع', 'بدل مطابق', 'خبر المبتدأ', 'مضاف إليه'],
              correctAnswer: 'نعت مرفوع',
              explanation: 'وقعت بين علمين الثاني أب للأول تعرب نعتاً.',
              points: tpl.score / 4,
            },
            {
              questionNumber: 4,
              questionText: 'سر الجمال عند تشبيه غير العاقل بالعاقل هو التشخيص.',
              questionType: QuestionType.TRUE_FALSE,
              optionsData: ['صواب', 'خطأ'],
              correctAnswer: 'صواب',
              explanation: 'إعطاء الصفة الإنسانية لغير العاقل يسمى تشخيصاً.',
              points: tpl.score / 4,
            },
          ],
        },
      },
      include: { questions: true },
    });

    // Seed student submissions for the first 3 students in this group
    for (let sIdx = 0; sIdx < Math.min(3, groupStudents.length); sIdx++) {
      const student = groupStudents[sIdx];
      const isFullScore = sIdx === 0;
      const score = isFullScore ? tpl.score : Math.round(tpl.score * 0.75);

      await prisma.assessmentSubmission.create({
        data: {
          assessmentId: assessment.id,
          studentId: student.user.id,
          status: SubmissionStatus.GRADED,
          scoreObtained: score,
          isAutoGraded: true,
          submittedAt: new Date(Date.now() - (sIdx + 1) * 3600 * 1000 * 24),
          gradedAt: new Date(),
          teacherFeedback: isFullScore ? 'ممتاز جداً، إجابات نموذجية!' : 'أحسنت، راجع قواعد حذف الهمزة بدقة.',
          answers: {
            create: assessment.questions.map((q, qIndex) => ({
              questionId: q.id,
              selectedAnswer: qIndex === 2 && !isFullScore ? 'بدل مطابق' : q.correctAnswer,
              isCorrect: qIndex === 2 && !isFullScore ? false : true,
              pointsEarned: qIndex === 2 && !isFullScore ? 0 : q.points,
              maxPointsSnapshot: q.points,
            })),
          },
        },
      });
    }
  }
  console.log(`✅ Seeded 18 Assessments with Questions and Multi-Student Submissions.`);

  // ==============================================================================
  // 9. SEED 4 ONLINE DIGITAL COURSES & MODULES
  // ==============================================================================
  const courseTitles = [
    { title: 'دورة البلاغة والتذوق الأدبي للثانوية العامة 2027', grade: 'الصف الثالث الثانوي', price: 350 },
    { title: 'كورس النحو الشامل والإعراب التطبيقي من الصفر للاحتراف', grade: 'الصف الثالث الثانوي', price: 400 },
    { title: 'دورة المراجعة النهائية للشهادة الإعدادية', grade: 'الصف الثالث الإعدادي', price: 250 },
    { title: 'كورس التأسيس البلاغي والنقدي للصف الثاني الثانوي', grade: 'الصف الثاني الثانوي', price: 300 },
  ];

  for (let cIdx = 0; cIdx < courseTitles.length; cIdx++) {
    const cInfo = courseTitles[cIdx];
    const course = await prisma.course.create({
      data: {
        teacherId: teacherUser.id,
        title: cInfo.title,
        description: 'شرح تفصيلي صوت وصورة مع حل آلاف الأسئلة وتطبيقات تفاعلية واختبارات بنك المعرفة.',
        subject: 'اللغة العربية',
        gradeLevel: cInfo.grade,
        academicStage: cInfo.grade.includes('الثانوي') ? 'المرحلة الثانوية' : 'المرحلة الإعدادية',
        price: cInfo.price,
        coverImageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
        status: CourseStatus.PUBLISHED,
        orderIndex: cIdx + 1,
        modules: {
          create: [
            {
              title: 'الفصل الأول: القواعد التأسيسية وأسرار البلاغة',
              orderIndex: 1,
              description: 'شرح مفصل وممتع مع أمثلة من القرآن الكريم والشعر العربي',
              lessons: {
                create: [
                  {
                    title: 'الدرس 1: مدخل وفهم الصور البيانية',
                    orderIndex: 1,
                    lessonType: 'VIDEO',
                    bunnyVideoId: `bunny-video-${cIdx}-1`,
                    videoDurationSeconds: 1800,
                    isPreview: true,
                  },
                  {
                    title: 'الدرس 2: تطبيقات متقدمة ونماذج امتحانات سابقة',
                    orderIndex: 2,
                    lessonType: 'VIDEO',
                    bunnyVideoId: `bunny-video-${cIdx}-2`,
                    videoDurationSeconds: 2400,
                    isPreview: false,
                  },
                ],
              },
            },
            {
              title: 'الفصل الثاني: فنون الإعراب والتدريب العملي',
              orderIndex: 2,
              description: 'تدريبات مكثفة على نماذج الامتحانات الوزارية',
              lessons: {
                create: [
                  {
                    title: 'الدرس 1: أسرار إعراب الشواهد الصعبة',
                    orderIndex: 1,
                    lessonType: 'VIDEO',
                    bunnyVideoId: `bunny-video-${cIdx}-3`,
                    videoDurationSeconds: 2100,
                    isPreview: false,
                  },
                ],
              },
            },
          ],
        },
      },
      include: {
        modules: { include: { lessons: true } },
      },
    });

    // Enroll students in this course
    for (let sIdx = 0; sIdx < 5; sIdx++) {
      const student = createdStudents[sIdx];
      await prisma.courseEnrollment.create({
        data: {
          courseId: course.id,
          studentId: student.user.id,
          status: CourseEnrollmentStatus.ACTIVE,
          access: {
            create: {
              studentId: student.user.id,
              courseId: course.id,
              accessStatus: CourseAccessStatus.ACTIVE,
              grantedById: teacherUser.id,
            },
          },
        },
      });

      // Progress
      const firstLesson = course.modules[0]?.lessons[0];
      if (firstLesson) {
        await prisma.courseProgress.create({
          data: {
            lessonId: firstLesson.id,
            studentId: student.user.id,
            courseId: course.id,
            lastPositionSeconds: 900,
            isCompleted: sIdx % 2 === 0,
          },
        });
      }
    }
  }
  console.log(`✅ Seeded 4 Online Digital Courses with Video Modules and Student Enrollments.`);

  // ==============================================================================
  // 10. SEED EVALUATIONS & NOTIFICATIONS
  // ==============================================================================
  for (let sIdx = 0; sIdx < 15; sIdx++) {
    const student = createdStudents[sIdx];
    await prisma.studentEvaluation.create({
      data: {
        studentId: student.user.id,
        teacherId: teacherUser.id,
        groupId: student.groupId,
        studentLevel: sIdx % 3 === 0 ? 'متميز (A+)' : sIdx % 3 === 1 ? 'جيد جداً (B+)' : 'ممتاز (A)',
        teacherNotes: 'طالب ملتزم بالحضور والمشاركة الإيجابية وحل الواجبات والتطبيقات الأسبوعية.',
      },
    });

    await prisma.notification.create({
      data: {
        recipientId: student.user.id,
        type: 'GRADE_RELEASED',
        title: 'تم رصد وتصحيح الواجب الأسبوعي',
        message: 'تم تصحيح اختبارك الأسبوعي بنجاح، يمكنك الآن مراجعة الإجابات والدرجة بالتفصيل.',
      },
    });
  }

  console.log('🎉 ==============================================================================');
  console.log('🎉 Non-Conflicting Database Seeding Completed Successfully!');
  console.log('🎉 ==============================================================================');
  console.log('📌 DEMO LOGIN CREDENTIALS:');
  console.log('👨‍🏫 المعلم (Teacher):      teacher@elawal.com     | Password: Password123!');
  console.log('👩‍💼 السكرتارية (Staff):    staff@elawal.com       | Password: Password123!');
  console.log('👨‍🎓 الطالب 1 (Student 1):  mahmoud@student.elawal.com | Password: Password123!');
  console.log('👨‍🎓 الطالب 2 (Student 2):  omar@student.elawal.com    | Password: Password123!');
  console.log('👨‍👩‍👧 ولي الأمر (Parent):    parent1@elawal.com     | Password: Password123!');
  console.log('------------------------------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
