import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole, AssessmentType, QuestionType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

const jwtAccessSecret =
  process.env.JWT_ACCESS_SECRET ||
  'super-secret-el-awal-backend-jwt-access-token-signing-key-2026-secure!';

let connectionUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || '';
if (connectionUrl.includes('sslmode=require') || connectionUrl.includes('sslmode=prefer')) {
  connectionUrl = connectionUrl.replace(/sslmode=[a-z\-]+/i, 'sslmode=no-verify');
}

const adapter = new PrismaPg({ connectionString: connectionUrl });
const prisma = new PrismaClient({ adapter });

async function seedLoadTestData() {
  console.log('🚀 Starting Idempotent Load-Test Data Seeding...');

  // 1. TEACHER
  let teacher = await prisma.user.findFirst({
    where: { role: UserRole.TEACHER, isActive: true },
    include: { teacherProfile: true },
  });

  if (!teacher) {
    console.log('Creating default load-test teacher...');
    teacher = await prisma.user.create({
      data: {
        email: 'teacher@elawal.com',
        phone: '+201021902000',
        fullName: 'أ. أحمد غريب',
        role: UserRole.TEACHER,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
        isActive: true,
        teacherProfile: {
          create: {
            specialty: 'اللغة العربية',
            bio: 'مدرس أول لغة عربية للثانوية العامة',
            activeAcademicYear: '2026-2027',
            activeAcademicTerm: 'FIRST_TERM',
          },
        },
      },
      include: { teacherProfile: true },
    });
  } else if (!teacher.teacherProfile) {
    await prisma.teacherProfile.create({
      data: {
        id: teacher.id,
        specialty: 'اللغة العربية',
        activeAcademicYear: '2026-2027',
        activeAcademicTerm: 'FIRST_TERM',
      },
    });
    teacher = await prisma.user.findUnique({
      where: { id: teacher.id },
      include: { teacherProfile: true },
    }) as any;
  }

  const teacherToken = jwt.sign(
    {
      sub: teacher!.id,
      role: UserRole.TEACHER,
      typ: 'access',
      email: teacher!.email || undefined,
      phone: teacher!.phone || undefined,
    },
    jwtAccessSecret,
    { expiresIn: '30d' },
  );

  // 2. ASSISTANT / SECRETARIAT
  let assistant = await prisma.user.findFirst({
    where: { role: UserRole.SECRETARIAT, isActive: true },
    include: { secretariatProfile: true },
  });

  if (!assistant) {
    console.log('Creating default load-test assistant/secretariat...');
    assistant = await prisma.user.create({
      data: {
        phone: '+201099999001',
        fullName: 'أ. محمود المساعد',
        role: UserRole.SECRETARIAT,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
        isActive: true,
        secretariatProfile: {
          create: {
            staffTitle: 'مدير العمليات وقيد الحضور',
          },
        },
      },
      include: { secretariatProfile: true },
    });
  }

  // Ensure TeacherAssistant link exists
  const existingAssistantLink = await prisma.teacherAssistant.findFirst({
    where: { teacherId: teacher!.id, assistantId: assistant.id },
  });

  if (!existingAssistantLink) {
    await prisma.teacherAssistant.create({
      data: {
        teacherId: teacher!.id,
        assistantId: assistant.id,
        status: 'ACTIVE',
        permissions: [
          'MANAGE_STUDENTS',
          'VIEW_FINANCE',
          'MANAGE_FINANCE',
          'MANAGE_ATTENDANCE',
          'MANAGE_GROUPS',
          'MANAGE_ASSESSMENTS',
        ] as any,
      },
    });
  }

  const assistantToken = jwt.sign(
    {
      sub: assistant.id,
      role: UserRole.SECRETARIAT,
      typ: 'access',
      phone: assistant.phone || undefined,
    },
    jwtAccessSecret,
    { expiresIn: '30d' },
  );

  // 3. ACADEMIC GROUPS & SESSIONS
  const groups = await prisma.academicGroup.findMany({
    where: { isActive: true },
    include: {
      sessions: {
        take: 5,
        orderBy: { sessionDate: 'desc' },
      },
    },
    take: 5,
  });

  if (groups.length === 0) {
    throw new Error('No active academic groups found in database.');
  }

  const primaryGroup = groups[0];
  let targetSession = primaryGroup.sessions?.[0];

  // If no session exists, create a session for attendance testing
  if (!targetSession) {
    console.log('Creating today lesson session for group...');
    targetSession = await prisma.lessonSession.create({
      data: {
        groupId: primaryGroup.id,
        topic: 'حصة تدريبية - اختبارات الحمل',
        sessionDate: new Date(),
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 2 * 3600000),
      },
    });
  }

  // 4. PUBLISHED COURSE WITH MODULES & LESSONS
  let course = await prisma.course.findFirst({
    where: { status: 'PUBLISHED' },
    include: {
      modules: {
        include: { lessons: true },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!course) {
    // Check if draft course exists and publish it
    const draftCourse = await prisma.course.findFirst({
      include: {
        modules: {
          include: { lessons: true },
        },
      },
    });

    if (draftCourse) {
      console.log(`Publishing existing draft course [${draftCourse.title}]...`);
      course = await prisma.course.update({
        where: { id: draftCourse.id },
        data: { status: 'PUBLISHED' },
        include: {
          modules: {
            include: { lessons: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });
    } else {
      console.log('Creating fresh published course with module and lessons...');
      course = await prisma.course.create({
        data: {
          teacherId: teacher!.id,
          title: 'دورة النحو والصرف الشاملة - الصف الثالث الثانوي',
          description: 'شرح تفصيلي مع تدريبات تطبيقية واختبارات تفاعلية',
          gradeLevel: primaryGroup.gradeLevel,
          status: 'PUBLISHED',
          modules: {
            create: [
              {
                title: 'الوحدة الأولى: قواعد الإعراب الأساسية',
                orderIndex: 1,
                lessons: {
                  create: [
                    {
                      title: 'الدرس الأول: المبتدأ والخبر وأنواعهما',
                      orderIndex: 1,
                      bunnyVideoId: 'sample-bunny-video-001',
                      videoDurationSeconds: 1800,
                      isPreview: true,
                    },
                    {
                      title: 'الدرس الثاني: الأفعال الناسخة كان وأخواتها',
                      orderIndex: 2,
                      bunnyVideoId: 'sample-bunny-video-002',
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
          modules: {
            include: { lessons: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });
    }
  }

  // Get first lesson for watch progress testing
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const primaryLesson = allLessons[0];
  if (primaryLesson && !primaryLesson.isPreview) {
    await prisma.courseLesson.update({
      where: { id: primaryLesson.id },
      data: { isPreview: true },
    });
  }

  // 5. ACTIVE AUTO-GRADED MCQ ASSESSMENT
  let assessment = await prisma.assessment.findFirst({
    where: {
      isPublished: true,
      allowMultipleAttempts: true,
    },
    include: {
      questions: {
        orderBy: { questionNumber: 'asc' },
      },
    },
  });

  if (assessment && assessment.groupId) {
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { groupId: null },
    });
  }

  if (!assessment || assessment.questions.length === 0) {
    console.log('Creating load-test active MCQ assessment with auto-grading questions...');
    assessment = await prisma.assessment.create({
      data: {
        teacherId: teacher!.id,
        groupId: null,
        courseId: course.id,
        title: 'اختبار النحو والبلاغة التفاعلي - قياس القدرات',
        description: 'اختبار تفاعلي متعدد الاختيارات مع تصحيح فوري ودقيق',
        type: AssessmentType.EXAM,
        assessmentType: AssessmentType.EXAM,
        totalScore: 100.0,
        passingScore: 60.0,
        durationMinutes: 45,
        isAutoGraded: true,
        isPublished: true,
        allowMultipleAttempts: true,
        dueDate: new Date(Date.now() + 60 * 86400000), // 60 days ahead
        questions: {
          create: [
            {
              questionNumber: 1,
              questionText: 'إعراب كلمة (العلمُ) في جملة: نعم العمل العلمُ:',
              questionType: QuestionType.MULTIPLE_CHOICE,
              optionsData: ['مبتدأ مؤخر مرفوع', 'فاعل مرفوع', 'مفعول به منصوب', 'مضاف إليه مجرور'],
              correctAnswer: 'مبتدأ مؤخر مرفوع',
              points: 25.0,
              explanation: 'المخصوص بالمدح بعد نعم يعرب مبتدأ مؤخراً أو خبراً لمبتدأ محذوف.',
            },
            {
              questionNumber: 2,
              questionText: 'الاسم الممنوع من الصرف لعلة واحدة من بين الآتي:',
              questionType: QuestionType.MULTIPLE_CHOICE,
              optionsData: ['مساجد', 'عمر', 'فاطمة', 'إبراهيم'],
              correctAnswer: 'مساجد',
              points: 25.0,
              explanation: 'مساجد على صيغة منتهى الجموع (علة واحدة).',
            },
            {
              questionNumber: 3,
              questionText: 'حكم توكيد الفعل بالنون في: (والله لأجتهدنّ في دروسي):',
              questionType: QuestionType.MULTIPLE_CHOICE,
              optionsData: ['واجب', 'جائز', 'ممتنع', 'مكروه'],
              correctAnswer: 'واجب',
              points: 25.0,
              explanation: 'جواب قسم متصل باللام مثبت دال على الاستقبال فهو واجب التوكيد.',
            },
            {
              questionNumber: 4,
              questionText: 'نوع المنادى في: (يا طالباً للعلم، اجتهد):',
              questionType: QuestionType.MULTIPLE_CHOICE,
              optionsData: ['شبيه بالمضاف', 'مضاف', 'نكرة غير مقصودة', 'نكرة مقصودة'],
              correctAnswer: 'شبيه بالمضاف',
              points: 25.0,
              explanation: 'منون واتصل به ما يتمم معناه (جار ومجرور).',
            },
          ],
        },
      },
      include: {
        questions: {
          orderBy: { questionNumber: 'asc' },
        },
      },
    });
  }

  // 6. STUDENTS & ENROLLMENTS (Ensure 50+ students with tokens & course enrollments)
  const studentUsers = await prisma.user.findMany({
    where: { role: UserRole.STUDENT, isActive: true },
    include: {
      studentProfile: {
        include: {
          groupEnrollments: { where: { status: 'ACTIVE' } },
          courseEnrollments: { where: { courseId: course.id } },
          parentLinks: {
            include: {
              parent: {
                include: { user: true },
              },
            },
          },
        },
      },
    },
    take: 60,
  });

  console.log(`Found ${studentUsers.length} student users in database. Ensuring enrollments...`);

  const studentFixtures = [];

  for (const s of studentUsers) {
    if (!s.studentProfile) continue;

    // Ensure enrolled in primaryGroup
    const hasGroupEnrollment = s.studentProfile.groupEnrollments.length > 0;
    if (!hasGroupEnrollment) {
      await prisma.groupEnrollment.create({
        data: {
          studentId: s.studentProfile.id,
          groupId: primaryGroup.id,
          status: 'ACTIVE',
        },
      });
    }

    // Ensure enrolled in published course and has active CourseAccess
    let enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: course.id,
          studentId: s.studentProfile.id,
        },
      },
      include: { access: true },
    });

    if (!enrollment) {
      enrollment = await prisma.courseEnrollment.create({
        data: {
          studentId: s.studentProfile.id,
          courseId: course.id,
          status: 'ACTIVE',
        },
        include: { access: true },
      });
    }

    if (!enrollment.access) {
      await prisma.courseAccess.create({
        data: {
          enrollmentId: enrollment.id,
          studentId: s.studentProfile.id,
          courseId: course.id,
          accessStatus: 'ACTIVE',
        },
      });
    }

    const token = jwt.sign(
      {
        sub: s.id,
        role: UserRole.STUDENT,
        typ: 'access',
        phone: s.phone || undefined,
      },
      jwtAccessSecret,
      { expiresIn: '30d' },
    );

    const parent = s.studentProfile.parentLinks?.[0]?.parent;

    studentFixtures.push({
      id: s.id,
      studentProfileId: s.studentProfile.id,
      name: s.fullName,
      phone: s.phone,
      studentCode: s.studentProfile.studentCode,
      qrCodeToken: s.studentProfile.qrCodeToken,
      groupId: s.studentProfile.groupEnrollments[0]?.groupId || primaryGroup.id,
      parentUserId: parent?.userId || null,
      parentProfileId: parent?.id || null,
      token,
    });
  }

  // 7. PARENTS
  const parentUsers = await prisma.user.findMany({
    where: { role: UserRole.PARENT, isActive: true },
    include: {
      parentProfile: {
        include: {
          studentLinks: {
            include: {
              student: {
                include: { user: true },
              },
            },
          },
        },
      },
    },
    take: 40,
  });

  const parentFixtures = parentUsers.map((p) => {
    const token = jwt.sign(
      {
        sub: p.id,
        role: UserRole.PARENT,
        typ: 'access',
        phone: p.phone || undefined,
      },
      jwtAccessSecret,
      { expiresIn: '30d' },
    );

    const linkedStudent = p.parentProfile?.studentLinks?.[0]?.student;

    return {
      id: p.id,
      parentProfileId: p.parentProfile?.id,
      name: p.fullName,
      phone: p.phone,
      linkedStudentId: linkedStudent?.id || null,
      linkedStudentName: linkedStudent?.user?.fullName || null,
      token,
    };
  });

  // 8. COMPILE AND EXPORT FIXTURES
  const fixtures = {
    baseUrl: 'http://localhost:4000/api/v1',
    bypassToken: 'el-awal-load-test-2026',
    teacher: {
      id: teacher!.id,
      teacherProfileId: teacher!.teacherProfile?.id,
      email: teacher!.email,
      phone: teacher!.phone,
      name: teacher!.fullName,
      token: teacherToken,
    },
    assistant: {
      id: assistant.id,
      staffTitle: assistant.secretariatProfile?.staffTitle,
      name: assistant.fullName,
      token: assistantToken,
    },
    students: studentFixtures,
    parents: parentFixtures,
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      gradeLevel: g.gradeLevel,
      monthlyFee: g.monthlyFee,
    })),
    activeSession: {
      id: targetSession.id,
      groupId: targetSession.groupId,
      topic: targetSession.topic,
    },
    course: {
      id: course.id,
      title: course.title,
      modulesCount: course.modules.length,
      primaryLessonId: primaryLesson?.id || null,
    },
    assessment: {
      id: assessment.id,
      title: assessment.title,
      totalScore: Number(assessment.totalScore),
      questions: assessment.questions.map((q) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        correctAnswer: q.correctAnswer,
        options: q.optionsData,
      })),
    },
    seededAt: new Date().toISOString(),
  };

  const outputDir = path.resolve(__dirname, '../k6/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, 'test_data.json'),
    JSON.stringify(fixtures, null, 2),
    'utf-8',
  );

  console.log(`\n🎉 Test Data Seeding Complete! Fixtures written to: ${path.join(outputDir, 'test_data.json')}`);
  console.log(`- Teacher: ${fixtures.teacher.name} (${fixtures.teacher.id})`);
  console.log(`- Assistant: ${fixtures.assistant.name} (${fixtures.assistant.id})`);
  console.log(`- Students with active tokens: ${fixtures.students.length}`);
  console.log(`- Parents with active tokens: ${fixtures.parents.length}`);
  console.log(`- Groups: ${fixtures.groups.length}`);
  console.log(`- Target Session for QR Roll-Call: ${fixtures.activeSession.id}`);
  console.log(`- Published Course: ${fixtures.course.title} (Lesson: ${fixtures.course.primaryLessonId})`);
  console.log(`- Active MCQ Assessment: ${fixtures.assessment.title} (${fixtures.assessment.questions.length} questions)`);

  await prisma.$disconnect();
}

seedLoadTestData().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
