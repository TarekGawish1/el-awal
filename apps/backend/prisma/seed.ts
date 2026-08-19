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

async function main() {
  console.log('🌱 Starting Comprehensive El Awal Database Seeding...');

  // 1. Password Hash for demo accounts (Default: Password123!)
  const rawPassword = process.env.SEED_DEMO_PASSWORD || 'Password123!';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 2. Clean slate for idempotency: Remove existing test/seed data safely in topological order
  console.log('🧹 Cleaning existing data for clean re-seeding...');
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

  console.log('✨ Database cleared.');

  // ==============================================================================
  // 3. SEED TEACHER ACCOUNT
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
          bio: 'معلم أول اللغة العربية للثانوية العامة بخبرة أكثر من 15 عاماً ومعد كبرى سلاسل كتب المراجعات النهائية.',
          activeAcademicYear: '2026-2027',
          activeAcademicTerm: 'FIRST_TERM',
        },
      },
    },
    include: { teacherProfile: true },
  });
  console.log(`✅ Teacher created: ${teacherUser.fullName} (${teacherUser.email})`);

  // ==============================================================================
  // 4. SEED SECRETARIAT / ADMIN STAFF ACCOUNT
  // ==============================================================================
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
    include: { secretariatProfile: true },
  });
  console.log(`✅ Secretariat staff created: ${staffUser.fullName} (${staffUser.email})`);

  // ==============================================================================
  // 5. SEED ACADEMIC GROUPS & WEEKLY SCHEDULES
  // ==============================================================================
  const group1 = await prisma.academicGroup.create({
    data: {
      name: 'الصف الثالث الثانوي - مجموعة أ (الأحد والأربعاء)',
      gradeLevel: 'الصف الثالث الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'مجموعة المراجعة المكثفة وتدريبات النحو المتقدم وشواهد البلاغة',
      maxCapacity: 45,
      monthlyFee: 500.00,
      teacherId: teacherUser.id,
      isActive: true,
      schedules: {
        create: [
          { dayOfWeek: 0, startTime: '17:00', endTime: '19:00', location: 'قاعة النخبة 1' },
          { dayOfWeek: 3, startTime: '17:00', endTime: '19:00', location: 'قاعة النخبة 1' },
        ],
      },
    },
  });

  const group2 = await prisma.academicGroup.create({
    data: {
      name: 'الصف الثالث الثانوي - مجموعة ب (السبت والثلاثاء)',
      gradeLevel: 'الصف الثالث الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'مجموعة التأسيس والشرح التفاعلي لقواعد النحو وفنون الأدب',
      maxCapacity: 40,
      monthlyFee: 500.00,
      teacherId: teacherUser.id,
      isActive: true,
      schedules: {
        create: [
          { dayOfWeek: 6, startTime: '15:00', endTime: '17:00', location: 'قاعة الأمل 2' },
          { dayOfWeek: 2, startTime: '15:00', endTime: '17:00', location: 'قاعة الأمل 2' },
        ],
      },
    },
  });

  const group3 = await prisma.academicGroup.create({
    data: {
      name: 'الصف الثاني الثانوي - مجموعة التفوق (الإثنين والخميس)',
      gradeLevel: 'الصف الثاني الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      description: 'مجموعة شرح المنهج وبناء التفكير النقدي وتطبيقات القراءة المتحررة',
      maxCapacity: 35,
      monthlyFee: 400.00,
      teacherId: teacherUser.id,
      isActive: true,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '16:00', endTime: '18:00', location: 'قاعة 3' },
          { dayOfWeek: 4, startTime: '16:00', endTime: '18:00', location: 'قاعة 3' },
        ],
      },
    },
  });

  console.log(`✅ 3 Academic Groups created: [${group1.name}], [${group2.name}], [${group3.name}]`);

  // ==============================================================================
  // 6. SEED DEMO STUDENTS & PARENTS
  // ==============================================================================
  const studentsData = [
    {
      fullName: 'محمود أحمد علي',
      phone: '+201011111111',
      email: 'mahmoud@student.elawal.com',
      studentCode: 'STU-2026-0001',
      qrCodeToken: 'qr_tok_demo_student_0001',
      gradeLevel: 'الصف الثالث الثانوي',
      academicStage: 'المرحلة الثانوية',
      groupId: group1.id,
      parentName: 'أحمد علي إبراهيم',
      parentPhone: '+201099999991',
      parentEmail: 'parent1@elawal.com',
    },
    {
      fullName: 'عمر خالد محمود',
      phone: '+201011111112',
      email: 'omar@student.elawal.com',
      studentCode: 'STU-2026-0002',
      qrCodeToken: 'qr_tok_demo_student_0002',
      gradeLevel: 'الصف الثالث الثانوي',
      academicStage: 'المرحلة الثانوية',
      groupId: group1.id,
      parentName: 'خالد محمود حسن',
      parentPhone: '+201099999992',
      parentEmail: 'parent2@elawal.com',
    },
    {
      fullName: 'فاطمة محمد السيد',
      phone: '+201011111113',
      email: 'fatma@student.elawal.com',
      studentCode: 'STU-2026-0003',
      qrCodeToken: 'qr_tok_demo_student_0003',
      gradeLevel: 'الصف الثالث الثانوي',
      academicStage: 'المرحلة الثانوية',
      groupId: group1.id,
      parentName: 'محمد السيد عبد العزيز',
      parentPhone: '+201099999993',
      parentEmail: 'parent3@elawal.com',
    },
    {
      fullName: 'يوسف حسن مصطفى',
      phone: '+201011111114',
      email: 'youssef@student.elawal.com',
      studentCode: 'STU-2026-0004',
      qrCodeToken: 'qr_tok_demo_student_0004',
      gradeLevel: 'الصف الثاني الثانوي',
      academicStage: 'المرحلة الثانوية',
      groupId: group3.id,
      parentName: 'حسن مصطفى كامل',
      parentPhone: '+201099999994',
      parentEmail: 'parent4@elawal.com',
    },
    {
      fullName: 'مريم إبراهيم عبد الله',
      phone: '+201011111115',
      email: 'mariam@student.elawal.com',
      studentCode: 'STU-2026-0005',
      qrCodeToken: 'qr_tok_demo_student_0005',
      gradeLevel: 'الصف الثاني الثانوي',
      academicStage: 'المرحلة الثانوية',
      groupId: group3.id,
      parentName: 'إبراهيم عبد الله خليل',
      parentPhone: '+201099999995',
      parentEmail: 'parent5@elawal.com',
    },
    {
      fullName: 'زياد طارق محمد',
      phone: '+201011111116',
      email: 'ziad@student.elawal.com',
      studentCode: 'STU-2026-0006',
      qrCodeToken: 'qr_tok_demo_student_0006',
      gradeLevel: 'الصف الثالث الثانوي',
      academicStage: 'المرحلة الثانوية',
      groupId: group2.id,
      parentName: 'طارق محمد نصر',
      parentPhone: '+201099999996',
      parentEmail: 'parent6@elawal.com',
    },
  ];

  const createdStudents = [];

  for (const s of studentsData) {
    // 1. Create Student User & Profile
    const studentUser = await prisma.user.create({
      data: {
        fullName: s.fullName,
        phone: s.phone,
        email: s.email,
        passwordHash,
        role: UserRole.STUDENT,
        isActive: true,
        studentProfile: {
          create: {
            studentCode: s.studentCode,
            qrCodeToken: s.qrCodeToken,
            gradeLevel: s.gradeLevel,
            academicStage: s.academicStage,
            academicStatus: StudentAcademicStatus.ACTIVE,
            emergencyPhone: s.parentPhone,
          },
        },
      },
      include: { studentProfile: true },
    });

    // 2. Create Parent User & Profile
    const parentUser = await prisma.user.create({
      data: {
        fullName: s.parentName,
        phone: s.parentPhone,
        email: s.parentEmail,
        passwordHash,
        role: UserRole.PARENT,
        isActive: true,
        parentProfile: {
          create: {
            relationshipType: 'ولي أمر (أب)',
          },
        },
      },
      include: { parentProfile: true },
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
        groupId: s.groupId,
        studentId: studentUser.id,
        status: GroupEnrollmentStatus.ACTIVE,
      },
    });

    createdStudents.push({ user: studentUser, profile: studentUser.studentProfile!, groupId: s.groupId });
    console.log(`✅ Onboarded Student: [${s.studentCode}] ${s.fullName} with Linked Parent (${s.parentName})`);
  }

  // ==============================================================================
  // 7. SEED PHYSICAL LESSON SESSIONS & ATTENDANCE RECORDS
  // ==============================================================================
  const pastDate1 = new Date();
  pastDate1.setDate(pastDate1.getDate() - 7);

  const session1 = await prisma.lessonSession.create({
    data: {
      groupId: group1.id,
      sessionDate: pastDate1,
      startTime: '17:00',
      topic: 'الوحدة الأولى: همزة القطع وألف الوصل والمصادر الخماسية والسداسية',
      attendanceRecords: {
        create: [
          {
            studentId: createdStudents[0].user.id,
            status: AttendanceStatus.PRESENT,
            recordingMethod: RecordingMethod.QR_SCAN,
            recordedById: teacherUser.id,
          },
          {
            studentId: createdStudents[1].user.id,
            status: AttendanceStatus.PRESENT,
            recordingMethod: RecordingMethod.QR_SCAN,
            recordedById: teacherUser.id,
          },
          {
            studentId: createdStudents[2].user.id,
            status: AttendanceStatus.EXCUSED,
            recordingMethod: RecordingMethod.MANUAL,
            recordedById: staffUser.id,
            notes: 'إذن مسبق بسبب ظرف طارئ',
          },
        ],
      },
    },
  });

  const pastDate2 = new Date();
  pastDate2.setDate(pastDate2.getDate() - 3);

  const session2 = await prisma.lessonSession.create({
    data: {
      groupId: group1.id,
      sessionDate: pastDate2,
      startTime: '17:00',
      topic: 'البلاغة: علم البيان - التشبيه المفرد والتمثيلي والضمني',
      attendanceRecords: {
        create: [
          {
            studentId: createdStudents[0].user.id,
            status: AttendanceStatus.PRESENT,
            recordingMethod: RecordingMethod.QR_SCAN,
            recordedById: teacherUser.id,
          },
          {
            studentId: createdStudents[1].user.id,
            status: AttendanceStatus.PRESENT,
            recordingMethod: RecordingMethod.QR_SCAN,
            recordedById: teacherUser.id,
          },
          {
            studentId: createdStudents[2].user.id,
            status: AttendanceStatus.PRESENT,
            recordingMethod: RecordingMethod.QR_SCAN,
            recordedById: teacherUser.id,
          },
        ],
      },
    },
  });

  const todaySession = await prisma.lessonSession.create({
    data: {
      groupId: group1.id,
      sessionDate: new Date(),
      startTime: '17:00',
      topic: 'تطبيقات النحو الشاملة والتدريب على نماذج الامتحانات الوزارية',
      attendanceRecords: {
        create: [
          {
            studentId: createdStudents[0].user.id,
            status: AttendanceStatus.PRESENT,
            recordingMethod: RecordingMethod.QR_SCAN,
            recordedById: teacherUser.id,
          },
        ],
      },
    },
  });

  console.log(`✅ Lesson Sessions & Attendance generated (Past & Today: [${todaySession.id}])`);

  // ==============================================================================
  // 8. SEED TUITION PAYMENT RECORDS (FINANCE)
  // ==============================================================================
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Paid tuition
  await prisma.studentPaymentRecord.create({
    data: {
      studentId: createdStudents[0].user.id,
      groupId: group1.id,
      periodYear: currentYear,
      periodMonth: currentMonth,
      amountExpected: 500.00,
      amountPaid: 500.00,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'CASH',
      receiptNumber: `REC-${currentYear}${currentMonth}-001`,
      recordedById: staffUser.id,
      notes: 'تم سداد المصروفات بالكامل نقداً في السنتر واستلام الإيصال',
    },
  });

  await prisma.studentPaymentRecord.create({
    data: {
      studentId: createdStudents[1].user.id,
      groupId: group1.id,
      periodYear: currentYear,
      periodMonth: currentMonth,
      amountExpected: 500.00,
      amountPaid: 500.00,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'CASH',
      receiptNumber: `REC-${currentYear}${currentMonth}-002`,
      recordedById: staffUser.id,
      notes: 'تم السداد بواسطة ولي الأمر',
    },
  });

  // Pending / Unpaid tuition
  await prisma.studentPaymentRecord.create({
    data: {
      studentId: createdStudents[2].user.id,
      groupId: group1.id,
      periodYear: currentYear,
      periodMonth: currentMonth,
      amountExpected: 500.00,
      amountPaid: 0.00,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: 'CASH',
      recordedById: staffUser.id,
      notes: 'مستحق السداد خلال الأسبوع الأول من الشهر',
    },
  });

  console.log(`✅ Student Tuition Fee Records created (Paid & Pending).`);

  // ==============================================================================
  // 9. SEED EDUCATIONAL CONTENT (PDFs & Summaries)
  // ==============================================================================
  const content1 = await prisma.educationalContent.create({
    data: {
      teacherId: teacherUser.id,
      groupId: group1.id,
      title: 'مذكرة القواعد النحوية - الوحدة الأولى (همزتا الوصل والقطع)',
      description: 'ملخص شامل لقواعد الوحدة الأولى مع شواهد إعرابية وتدريبات تطبيقية مجابة.',
      contentType: ContentType.SUMMARY,
      fileKey: 'materials/arabic-unit1-summary.pdf',
      fileUrl: 'https://assets.elawal.com/materials/arabic-unit1-summary.pdf',
      fileSize: BigInt(2450000),
      mimeType: 'application/pdf',
      gradeLevel: 'الصف الثالث الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      sessionId: session1.id,
      sessionTopic: session1.topic,
    },
  });

  const content2 = await prisma.educationalContent.create({
    data: {
      teacherId: teacherUser.id,
      groupId: group1.id,
      title: 'شيت واجب البلاغة - فنون التشبيه والاستعارة',
      description: 'أسئلة بنك المعرفة وتدريبات تفاعلية على الصورة البيانية الممتدة والمركبة.',
      contentType: ContentType.FILE,
      fileKey: 'materials/rhetoric-assignment-sheet.pdf',
      fileUrl: 'https://assets.elawal.com/materials/rhetoric-assignment-sheet.pdf',
      fileSize: BigInt(1890000),
      mimeType: 'application/pdf',
      gradeLevel: 'الصف الثالث الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      sessionId: session2.id,
      sessionTopic: session2.topic,
    },
  });

  console.log(`✅ Educational Content Library materials seeded: [${content1.title}], [${content2.title}]`);

  // ==============================================================================
  // 10. SEED ONLINE COURSE WITH MODULES & LESSONS (E-LEARNING)
  // ==============================================================================
  const course = await prisma.course.create({
    data: {
      teacherId: teacherUser.id,
      title: 'دورة البلاغة والتذوق الأدبي للثانوية العامة 2027',
      description: 'كورس إلكتروني مكثف يغطي علم البيان والبديع والمعاني مع حل مئات النماذج الوزارية.',
      subject: 'اللغة العربية',
      gradeLevel: 'الصف الثالث الثانوي',
      academicStage: 'المرحلة الثانوية',
      price: 350.00,
      coverImageUrl: 'https://assets.elawal.com/covers/rhetoric-course.jpg',
      status: CourseStatus.PUBLISHED,
      orderIndex: 1,
      modules: {
        create: [
          {
            title: 'الفصل الأول: مدخل إلى علم البيان والتصوير الفني',
            orderIndex: 1,
            description: 'دراسة مفصلة للتشبيه وأنواعه والاستعارة التصريحية والمكنية',
            lessons: {
              create: [
                {
                  title: 'الدرس الأول: أركان التشبيه وسر جماله',
                  orderIndex: 1,
                  lessonType: 'VIDEO',
                  bunnyVideoId: 'bunny-vid-001',
                  videoDurationSeconds: 1850,
                  isPreview: true,
                },
                {
                  title: 'الدرس الثاني: الاستعارة المكنية والتصريحية وأمثلة من القرآن الكريم',
                  orderIndex: 2,
                  lessonType: 'VIDEO',
                  bunnyVideoId: 'bunny-vid-002',
                  videoDurationSeconds: 2400,
                  isPreview: false,
                },
              ],
            },
          },
          {
            title: 'الفصل الثاني: علم البديع والمحسنات اللفظية والمعنوية',
            orderIndex: 2,
            description: 'الطباق والمقابلة والجناس وحسن التقسيم والسجع والتورية',
            lessons: {
              create: [
                {
                  title: 'الدرس الأول: المحسنات المعنوية (الطباق والمقابلة والتورية)',
                  orderIndex: 1,
                  lessonType: 'VIDEO',
                  bunnyVideoId: 'bunny-vid-003',
                  videoDurationSeconds: 1980,
                  isPreview: false,
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      modules: {
        include: { lessons: true },
      },
    },
  });

  // Enroll student 0 and 1 in course
  const enrollment1 = await prisma.courseEnrollment.create({
    data: {
      courseId: course.id,
      studentId: createdStudents[0].user.id,
      status: CourseEnrollmentStatus.ACTIVE,
      access: {
        create: {
          studentId: createdStudents[0].user.id,
          courseId: course.id,
          accessStatus: CourseAccessStatus.ACTIVE,
          grantedById: teacherUser.id,
        },
      },
    },
  });

  // Record lesson video progress
  const firstLesson = course.modules[0].lessons[0];
  await prisma.courseProgress.create({
    data: {
      lessonId: firstLesson.id,
      studentId: createdStudents[0].user.id,
      courseId: course.id,
      lastPositionSeconds: 1200,
      isCompleted: false,
    },
  });

  console.log(`✅ Online Course created with Modules & Lessons: [${course.title}]`);

  // ==============================================================================
  // 11. SEED ASSESSMENTS, QUESTIONS, AUTO-GRADING & SUBMISSIONS
  // ==============================================================================
  const assessment = await prisma.assessment.create({
    data: {
      teacherId: teacherUser.id,
      groupId: group1.id,
      title: 'امتحان البلاغة والنحو الأسبوعي الأول',
      description: 'امتحان يقيس مهارات استخراج الصور البيانية، التمييز بين أنواع التشبيه، وإعراب الكلمات الشاذة.',
      type: AssessmentType.EXAM,
      totalScore: 20.00,
      passingScore: 12.00,
      durationMinutes: 45,
      isAutoGraded: true,
      isPublished: true,
      gradeLevel: 'الصف الثالث الثانوي',
      academicStage: 'المرحلة الثانوية',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      targetGroups: {
        connect: [{ id: group1.id }],
      },
      questions: {
        create: [
          {
            questionNumber: 1,
            questionText: 'قال الشاعر: "والبدرُ في كَبِدِ السَّماءِ كَدِرهَمٍ مُلقىً على دِيباجةٍ زَرقاءِ". ما نوع التشبيه في البيت السابق؟',
            questionType: QuestionType.MULTIPLE_CHOICE,
            optionsData: [
              'تشبيه بليغ',
              'تشبيه تمثيلي',
              'تشبيه ضمني',
              'تشبيه مفصل',
            ],
            correctAnswer: 'تشبيه تمثيلي',
            explanation: 'شبه الشاعر هيئة البدر المستدير اللامع وسط السماء الزرقاء الصافية بهيئة درهم فضي لامع ملقى على قماش حريري أزرق، فهو تشبيه هيئة مركبة بهيئة مركبة.',
            points: 5.00,
          },
          {
            questionNumber: 2,
            questionText: 'الهمزة في كلمة "استعانة" هي همزة وصل لأنها مصدر لفعل سداسي.',
            questionType: QuestionType.TRUE_FALSE,
            optionsData: ['صواب', 'خطأ'],
            correctAnswer: 'صواب',
            explanation: 'الفعل الماضي منها (استعان) مكون من 6 أحرف، ومصادر وأفعال السداسي همزتها وصل دائماً.',
            points: 5.00,
          },
          {
            questionNumber: 3,
            questionText: 'ما إعراب كلمة "ابن" في جملة: "عمرُ بنُ الخطابِ خليفةٌ عادل"؟',
            questionType: QuestionType.MULTIPLE_CHOICE,
            optionsData: [
              'نعت مرفوع وعلامة رفعه الضمة',
              'بدل مطابق مرفوع',
              'خبر المبتدأ مرفوع',
              'مضاف إليه مجرور',
            ],
            correctAnswer: 'نعت مرفوع وعلامة رفعه الضمة',
            explanation: 'كلمة (ابن) إذا وقعت بين علمين الثاني أب للأول ولم تقع في أول السطر تعرب نعتاً للعلم الأول وتحذف همزتها.',
            points: 5.00,
          },
          {
            questionNumber: 4,
            questionText: 'سر الجمال في التشبيه عند تشبيه غير العاقل بالعاقل هو:',
            questionType: QuestionType.MULTIPLE_CHOICE,
            optionsData: [
              'التشخيص',
              'التجسيم',
              'التوضيح',
              'التأكيد',
            ],
            correctAnswer: 'التشخيص',
            explanation: 'منح الصفة الإنسانية أو العاقلة لما ليس بإنسان يسمى تشخيصاً.',
            points: 5.00,
          },
        ],
      },
    },
    include: {
      questions: true,
    },
  });

  // Create Graded Student Submission for Student 0 (Mahmoud)
  const submission1 = await prisma.assessmentSubmission.create({
    data: {
      assessmentId: assessment.id,
      studentId: createdStudents[0].user.id,
      status: SubmissionStatus.GRADED,
      scoreObtained: 20.00,
      isAutoGraded: true,
      gradedAt: new Date(),
      teacherFeedback: 'ممتاز يا محمود! إجابات نموذجية وفهم عميق لفنون البلاغة.',
      answers: {
        create: [
          {
            questionId: assessment.questions[0].id,
            selectedAnswer: 'تشبيه تمثيلي',
            isCorrect: true,
            pointsEarned: 5.00,
            maxPointsSnapshot: 5.00,
          },
          {
            questionId: assessment.questions[1].id,
            selectedAnswer: 'صواب',
            isCorrect: true,
            pointsEarned: 5.00,
            maxPointsSnapshot: 5.00,
          },
          {
            questionId: assessment.questions[2].id,
            selectedAnswer: 'نعت مرفوع وعلامة رفعه الضمة',
            isCorrect: true,
            pointsEarned: 5.00,
            maxPointsSnapshot: 5.00,
          },
          {
            questionId: assessment.questions[3].id,
            selectedAnswer: 'التشخيص',
            isCorrect: true,
            pointsEarned: 5.00,
            maxPointsSnapshot: 5.00,
          },
        ],
      },
    },
  });

  // Create Student Submission for Student 1 (Omar) - 15/20
  const submission2 = await prisma.assessmentSubmission.create({
    data: {
      assessmentId: assessment.id,
      studentId: createdStudents[1].user.id,
      status: SubmissionStatus.GRADED,
      scoreObtained: 15.00,
      isAutoGraded: true,
      gradedAt: new Date(),
      teacherFeedback: 'أحسنت يا عمر، راجع قاعدة حذف همزة ابن وإعرابها بدقة.',
      answers: {
        create: [
          {
            questionId: assessment.questions[0].id,
            selectedAnswer: 'تشبيه تمثيلي',
            isCorrect: true,
            pointsEarned: 5.00,
            maxPointsSnapshot: 5.00,
          },
          {
            questionId: assessment.questions[1].id,
            selectedAnswer: 'صواب',
            isCorrect: true,
            pointsEarned: 5.00,
            maxPointsSnapshot: 5.00,
          },
          {
            questionId: assessment.questions[2].id,
            selectedAnswer: 'خبر المبتدأ مرفوع',
            isCorrect: false,
            pointsEarned: 0.00,
            maxPointsSnapshot: 5.00,
          },
          {
            questionId: assessment.questions[3].id,
            selectedAnswer: 'التشخيص',
            isCorrect: true,
            pointsEarned: 5.00,
            maxPointsSnapshot: 5.00,
          },
        ],
      },
    },
  });

  console.log(`✅ Assessment Exam and Auto-Graded Student Submissions created: [${assessment.title}]`);

  // ==============================================================================
  // 12. SEED STUDENT ACADEMIC EVALUATIONS
  // ==============================================================================
  await prisma.studentEvaluation.create({
    data: {
      studentId: createdStudents[0].user.id,
      teacherId: teacherUser.id,
      groupId: group1.id,
      studentLevel: 'متميز (A+)',
      teacherNotes: 'طالب مجتهد، ملتزم بالحضور والمشاركة الإيجابية وحل الواجبات الأسبوعية.',
    },
  });

  // ==============================================================================
  // 13. SEED SYSTEM IN-APP NOTIFICATIONS
  // ==============================================================================
  await prisma.notification.create({
    data: {
      recipientId: teacherUser.id,
      type: 'SUBMISSION_RECEIVED',
      title: 'تسليم امتحان جديد',
      message: 'قام الطالب محمود أحمد علي بتسليم "امتحان البلاغة والنحو الأسبوعي الأول" وحصل على 20/20.',
      referenceEntityId: submission1.id,
    },
  });

  await prisma.notification.create({
    data: {
      recipientId: createdStudents[0].user.id,
      type: 'GRADE_RELEASED',
      title: 'تم تصحيح الامتحان',
      message: 'حصلت على 20/20 في "امتحان البلاغة والنحو الأسبوعي الأول". اضغط للاطلاع على نموذج الإجابة.',
      referenceEntityId: assessment.id,
    },
  });

  console.log('🎉 ==============================================================');
  console.log('🎉 Comprehensive Database Seeding Completed Successfully!');
  console.log('🎉 ==============================================================');
  console.log('📌 DEMO LOGIN CREDENTIALS:');
  console.log('--------------------------------------------------------------');
  console.log('👨‍🏫 Teacher:     teacher@elawal.com     | Password: Password123!');
  console.log('👩‍💼 Secretariat: staff@elawal.com       | Password: Password123!');
  console.log('👨‍🎓 Student 1:   mahmoud@student.elawal.com | Password: Password123!');
  console.log('👨‍🎓 Student 2:   omar@student.elawal.com    | Password: Password123!');
  console.log('👨‍👩‍👧 Parent 1:    parent1@elawal.com     | Password: Password123!');
  console.log('--------------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
