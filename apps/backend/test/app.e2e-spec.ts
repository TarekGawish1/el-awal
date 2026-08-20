process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/el_awal_test?schema=public';
process.env.JWT_SECRET = 'super-secret-jwt-key-for-e2e-testing-minimum-32-chars';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { PrismaHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { UserRole, AttendanceStatus, SubmissionStatus, QuestionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

describe('El Awal Backend E2E Integration Suite (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let teacherJwtToken: string;
  let studentJwtToken: string;
  let parentJwtToken: string;

  const mockTeacherUser = {
    id: 'teacher-user-1',
    phone: '01000000001',
    email: 'teacher@elawal.com',
    fullName: 'أ. طارق عبد الله',
    role: UserRole.TEACHER,
    isActive: true,
    deletedAt: null,
    passwordHash: bcrypt.hashSync('TeacherPass123!', 10),
    teacherProfile: { id: 'teacher-profile-1' },
    studentProfile: null,
    parentProfile: null,
    secretariatProfile: null,
  };

  const mockStudentProfile = {
    id: 'student-profile-1',
    userId: 'student-user-1',
    studentCode: 'STU-2026-0001',
    qrCodeToken: 'qr_tok_demo_e2e_123',
    gradeLevel: 'الصف الثالث الثانوي',
    academicStage: 'SECONDARY',
    user: {
      id: 'student-user-1',
      fullName: 'محمود أحمد',
      phone: '+201099999999',
      email: 'student.demo@elawal.com',
      role: UserRole.STUDENT,
      isActive: true,
      deletedAt: null,
    },
    parentLinks: [
      {
        parentId: 'parent-profile-1',
        parent: { user: { fullName: 'أحمد محمود', phone: '+201088888888' } },
      },
    ],
  };

  const mockParentUser = {
    id: 'parent-user-1',
    fullName: 'أحمد محمود',
    phone: '+201088888888',
    email: 'parent@elawal.com',
    role: UserRole.PARENT,
    isActive: true,
    deletedAt: null,
    parentProfile: { id: 'parent-profile-1' },
    studentProfile: null,
    teacherProfile: null,
    secretariatProfile: null,
  };

  const mockGroup = {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    name: 'مجموعة الثانوية العامة أ',
    gradeLevel: 'الصف الثالث الثانوي',
    teacherId: 'teacher-profile-1',
    maxCapacity: 50,
    monthlyFee: 450.0,
    isActive: true,
    schedules: [],
    _count: { enrollments: 1, sessions: 2 },
  };

  const mockSession = {
    id: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',
    groupId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    group: mockGroup,
    sessionDate: new Date('2026-09-01'),
    topic: 'مراجعة النحو الشاملة',
    attendanceRecords: [],
  };

  const mockPrisma = {
    user: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where?.OR) {
          const match = where.OR.some(
            (c: any) =>
              c.email === 'teacher@elawal.com' ||
              c.phone === 'teacher@elawal.com' ||
              c.email === '01000000001' ||
              c.phone === '01000000001',
          );
          if (match) return Promise.resolve(mockTeacherUser);
        }
        return Promise.resolve(null);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'teacher-user-1') return Promise.resolve(mockTeacherUser);
        if (where.id === 'student-user-1') return Promise.resolve(mockStudentProfile.user);
        if (where.id === 'parent-user-1') return Promise.resolve(mockParentUser);
        return Promise.resolve(null);
      }),
      create: jest.fn().mockResolvedValue(mockStudentProfile.user),
    },
    refreshTokenSession: {
      create: jest.fn().mockResolvedValue({ id: 'sess-1' }),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    teacherProfile: {
      findUnique: jest.fn().mockResolvedValue({ id: 'teacher-profile-1' }),
    },
    studentProfile: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'student-profile-1' || where.qrCodeToken === 'qr_tok_demo_e2e_123') {
          return Promise.resolve(mockStudentProfile);
        }
        return Promise.resolve(null);
      }),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockStudentProfile),
      count: jest.fn().mockResolvedValue(1),
    },
    parentProfile: {
      findUnique: jest.fn().mockResolvedValue({ id: 'parent-profile-1' }),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'parent-profile-1' }),
    },
    parentStudentLink: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'link-1',
        parentId: 'parent-profile-1',
        studentId: 'student-profile-1',
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'link-1',
          parentId: 'parent-profile-1',
          student: mockStudentProfile,
          parent: { relationshipType: 'Father' },
        },
      ]),
      create: jest.fn().mockResolvedValue({ id: 'link-1' }),
    },
    academicGroup: {
      findUnique: jest.fn().mockResolvedValue(mockGroup),
      findMany: jest.fn().mockResolvedValue([mockGroup]),
    },
    groupEnrollment: {
      findUnique: jest.fn().mockResolvedValue({
        groupId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        studentId: 'student-profile-1',
        status: 'ACTIVE',
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          studentId: 'student-profile-1',
          status: 'ACTIVE',
          student: mockStudentProfile,
        },
      ]),
      create: jest.fn().mockResolvedValue({ id: 'enr-1' }),
      upsert: jest.fn().mockResolvedValue({ id: 'enr-1' }),
      count: jest.fn().mockResolvedValue(1),
    },
    courseEnrollment: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([]),
    },
    courseProgress: {
      count: jest.fn().mockResolvedValue(0),
    },
    courseLesson: {
      count: jest.fn().mockResolvedValue(0),
    },
    lessonSession: {
      findUnique: jest.fn().mockResolvedValue(mockSession),
      findMany: jest.fn().mockResolvedValue([mockSession]),
      count: jest.fn().mockResolvedValue(2),
    },
    attendanceRecord: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(2),
      create: jest.fn().mockResolvedValue({
        id: 'att-1',
        sessionId: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',
        studentId: 'student-profile-1',
        status: AttendanceStatus.PRESENT,
      }),
    },
    assessment: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
        title: 'اختبار النحو الأسبوعي',
        totalScore: 10.0,
        passingScore: 5.0,
        isPublished: true,
        dueDate: null,
        teacherId: 'teacher-profile-1',
        _count: { submissions: 0 },
        questions: [
          {
            id: 'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a',
            questionNumber: 1,
            questionType: QuestionType.MULTIPLE_CHOICE,
            correctAnswer: 'خبر كان',
            points: 10.0,
          },
        ],
        submissions: [],
      }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation(({ where, data }) => {
        return Promise.resolve({
          id: where.id,
          title: data.title || 'Updated Title',
          totalScore: 10.0,
          passingScore: 5.0,
          isPublished: data.isPublished !== undefined ? data.isPublished : true,
          dueDate: null,
          teacherId: 'teacher-profile-1',
          questions: [],
          submissions: [],
        });
      }),
    },
    assessmentSubmission: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: 'sub-1',
        assessmentId: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
        studentId: 'student-profile-1',
        status: SubmissionStatus.GRADED,
        scoreObtained: 10.0,
        isAutoGraded: true,
        submittedAt: new Date(),
        gradedAt: new Date(),
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        console.log('assessmentSubmission.findUnique called with where:', where);
        if (where.id === 'sub-1') {
          return Promise.resolve({
            id: 'sub-1',
            assessmentId: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
            studentId: 'student-profile-1',
            status: SubmissionStatus.GRADED,
            scoreObtained: 10.0,
            isAutoGraded: true,
            submittedAt: new Date(),
            gradedAt: new Date(),
            assessment: { id: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f', title: 'Title', teacherId: 'teacher-profile-1' },
            student: { user: { fullName: 'Student' } },
            answers: [],
          });
        }
        return Promise.resolve(null);
      }),
    },
    studentPaymentRecord: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({
        id: 'pay-1',
        studentId: 'student-profile-1',
        amountPaid: 450.0,
        paymentStatus: 'PAID',
      }),
    },
    notification: {
      create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'att-1' }]),
    $transaction: jest.fn().mockImplementation((callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrisma);
      }
      return Promise.resolve(callback);
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(PrismaHealthIndicator)
      .useValue({
        pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
      })
      .overrideProvider(MemoryHealthIndicator)
      .useValue({
        checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    jwtService = app.get(JwtService);

    // Issue test tokens for Student and Parent roles
    studentJwtToken = jwtService.sign({
      sub: 'student-user-1',
      role: UserRole.STUDENT,
      fullName: 'محمود أحمد',
      studentProfileId: 'student-profile-1',
    });

    parentJwtToken = jwtService.sign({
      sub: 'parent-user-1',
      role: UserRole.PARENT,
      fullName: 'أحمد محمود',
      parentProfileId: 'parent-profile-1',
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Health & Operations Baseline', () => {
    it('GET /api/v1/health — should return 200 OK with server status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('status', 'ok');
        });
    });
  });

  describe('2. Authentication & Identity Lifecycle', () => {
    it('POST /api/v1/auth/login — should authenticate seed teacher and issue JWT tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'teacher@elawal.com',
          password: 'TeacherPass123!',
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.role).toBe(UserRole.TEACHER);

      teacherJwtToken = response.body.data.accessToken;
    });

    it('POST /api/v1/auth/login — should reject invalid credentials with 401 Unauthorized', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'teacher@elawal.com',
          password: 'WrongPassword999!',
        })
        .expect(401);
    });
  });

  describe('3. Student Lifecycle & QR Badging', () => {
    it('POST /api/v1/students — should register student, link parent, and provision QR code', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${teacherJwtToken}`)
        .send({
          fullName: 'محمود أحمد عثمان',
          phone: '+201099999999',
          email: 'student.e2e@elawal.com',
          password: 'StudentPass123!',
          gradeLevel: 'الصف الثالث الثانوي',
          academicStage: 'SECONDARY',
          initialGroupId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
          parentName: 'أحمد عثمان',
          parentPhone: '+201088888888',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('studentCode');
      expect(response.body.data).toHaveProperty('qrCodeToken');
      expect(response.body.data.studentCode).toMatch(/^STU-/);
    });
  });

  describe('4. QR Attendance Roll-Call & Idempotency', () => {
    it('GET /api/v1/schedules/group/:groupId/sessions — should return group sessions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/schedules/group/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d/sessions')
        .set('Authorization', `Bearer ${teacherJwtToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('POST /api/v1/attendance/sessions/:sessionId/scan-qr — should record attendance on first scan', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/attendance/sessions/b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e/scan-qr')
        .set('Authorization', `Bearer ${teacherJwtToken}`)
        .send({
          qrCodeToken: 'qr_tok_demo_e2e_123',
        })
        .expect(200);

      expect(response.body.data.isDuplicate).toBe(false);
      expect(response.body.data.student.studentCode).toBe('STU-2026-0001');
    });
  });

  describe('5. Academic Assessments & Synchronous Auto-Grading', () => {
    it('POST /api/v1/assessments/:id/submit — should auto-grade 100% MCQ submission and return GRADED status', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/assessments/c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f/submit')
        .set('Authorization', `Bearer ${studentJwtToken}`)
        .send({
          answers: [
            {
              questionId: 'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a',
              answerGiven: 'خبر كان',
            },
          ],
        })
        .expect(200);

      expect(response.body.data.status).toBe(SubmissionStatus.GRADED);
      expect(response.body.data.scoreObtained).toBe(10.0);
      expect(response.body.data.isAutoGraded).toBe(true);
    });

    it('GET /api/v1/assessments/submissions/:submissionId — should return submission details for teacher', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/assessments/submissions/sub-1')
        .set('Authorization', `Bearer ${teacherJwtToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', 'sub-1');
      expect(response.body.data).toHaveProperty('answers');
      expect(response.body.data).toHaveProperty('student');
    });

    it('PATCH /api/v1/assessments/:id — should update assessment metadata', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/assessments/c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f')
        .set('Authorization', `Bearer ${teacherJwtToken}`)
        .send({
          title: 'اختبار النحو المحدث',
        })
        .expect(200);

      expect(response.body.data.title).toBe('اختبار النحو المحدث');
    });
  });

  describe('6. Parent Guardian Portal & KPI Cards', () => {
    it('GET /api/v1/parent-portal/students/:id/overview — should return consolidated KPI card for guardian', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/parent-portal/students/student-profile-1/overview')
        .set('Authorization', `Bearer ${parentJwtToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('kpis');
      expect(response.body.data.kpis).toHaveProperty('attendanceRatePercentage');
      expect(response.body.data.kpis).toHaveProperty('academicAveragePercentage');
    });
  });
});
