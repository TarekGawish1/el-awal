import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../services/sync.service';
import { CoursesService } from '../../courses/services/courses.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { UserRole, GroupEnrollmentStatus, QuestionType } from '@prisma/client';

describe('SyncService - Bootstrap Hydration Engine', () => {
  let service: SyncService;

  const mockCoursesService = {
    applyMonotonicProgressBatch: jest.fn(),
  };

  const mockPrismaService = {
    teacherProfile: {
      findUnique: jest.fn(),
    },
    academicGroup: {
      findMany: jest.fn(),
    },
    groupEnrollment: {
      findMany: jest.fn(),
    },
    lessonSchedule: {
      findMany: jest.fn(),
    },
    lessonSession: {
      findMany: jest.fn(),
    },
    studentPaymentRecord: {
      findMany: jest.fn(),
    },
    assessment: {
      findMany: jest.fn(),
    },
    course: {
      findMany: jest.fn(),
    },
    attendanceRecord: {
      findMany: jest.fn(),
    },
    parentProfile: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: CoursesService, useValue: mockCoursesService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    jest.clearAllMocks();
  });

  describe('getBootstrapSnapshot for TEACHER', () => {
    const teacherUser: any = {
      id: 'teacher-1',
      role: UserRole.TEACHER,
    };

    it('should return full tenant snapshot with groups, student rosters, sessions, and assessments', async () => {
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue({
        activeAcademicYear: '2026-2027',
        activeAcademicTerm: 'FIRST_TERM',
      });

      mockPrismaService.academicGroup.findMany.mockResolvedValue([
        {
          id: 'group-1',
          name: 'مجموعة الأوائل',
          gradeLevel: 'الصف الأول الثانوي',
          schedules: [{ id: 'sched-1', dayOfWeek: 0, startTime: '16:00' }],
        },
      ]);

      mockPrismaService.groupEnrollment.findMany.mockResolvedValue([
        {
          groupId: 'group-1',
          student: {
            id: 'stu-1',
            studentCode: 'STU-2026-0001',
            qrCodeToken: 'qr_token_stu_1',
            gradeLevel: 'الصف الأول الثانوي',
            user: { fullName: 'محمود أحمد', phone: '01012345678', isActive: true },
          },
        },
      ]);

      mockPrismaService.lessonSchedule.findMany.mockResolvedValue([
        { id: 'sched-1', groupId: 'group-1', dayOfWeek: 0, startTime: '16:00' },
      ]);

      mockPrismaService.lessonSession.findMany.mockResolvedValue([
        { id: 'sess-1', groupId: 'group-1', sessionDate: '2026-08-20' },
      ]);

      mockPrismaService.studentPaymentRecord.findMany.mockResolvedValue([
        { id: 'pay-1', studentId: 'stu-1', amountPaid: 350, periodMonth: 8 },
      ]);

      mockPrismaService.assessment.findMany.mockResolvedValue([
        {
          id: 'exam-1',
          title: 'اختبار الفيزياء الأسبوعي',
          questions: [
            { id: 'q-1', questionText: 'ما هي السرعة؟', correctAnswer: 'المسافة/الزمن' },
          ],
        },
      ]);

      mockPrismaService.course.findMany.mockResolvedValue([
        { id: 'course-1', title: 'كورس الفيزياء المتكامل' },
      ]);

      const result = await service.getBootstrapSnapshot(teacherUser);

      expect(result.role).toBe(UserRole.TEACHER);
      expect(result.isDelta).toBe(false);
      expect(result.data.groups).toHaveLength(1);
      expect(result.data.students).toHaveLength(1);
      expect(result.data.students?.[0].fullName).toBe('محمود أحمد');
      expect(result.data.students?.[0].qrCodeToken).toBe('qr_token_stu_1');
      expect(result.data.assessments?.[0].questions[0].correctAnswer).toBe('المسافة/الزمن');

      expect(mockPrismaService.groupEnrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: GroupEnrollmentStatus.ACTIVE,
            student: expect.objectContaining({
              academicStatus: 'ACTIVE',
              user: { isActive: true },
            }),
          }),
        }),
      );
    });

    it('should filter by delta timestamp when since parameter is provided', async () => {
      const sinceTimestamp = Date.now() - 3600000;
      mockPrismaService.academicGroup.findMany.mockResolvedValue([]);
      mockPrismaService.groupEnrollment.findMany.mockResolvedValue([]);
      mockPrismaService.lessonSchedule.findMany.mockResolvedValue([]);
      mockPrismaService.lessonSession.findMany.mockResolvedValue([]);
      mockPrismaService.studentPaymentRecord.findMany.mockResolvedValue([]);
      mockPrismaService.assessment.findMany.mockResolvedValue([]);
      mockPrismaService.course.findMany.mockResolvedValue([]);

      const result = await service.getBootstrapSnapshot(teacherUser, sinceTimestamp);

      expect(result.isDelta).toBe(true);
      expect(mockPrismaService.academicGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            updatedAt: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('getBootstrapSnapshot for STUDENT', () => {
    const studentUser: any = {
      id: 'user-stu-1',
      studentProfileId: 'stu-profile-1',
      role: UserRole.STUDENT,
    };

    it('should redact question correct answers in student bootstrap payload', async () => {
      mockPrismaService.groupEnrollment.findMany.mockResolvedValue([
        {
          group: { id: 'group-1', name: 'مجموعة الأوائل' },
        },
      ]);
      mockPrismaService.lessonSession.findMany.mockResolvedValue([]);
      mockPrismaService.course.findMany.mockResolvedValue([]);
      mockPrismaService.attendanceRecord.findMany.mockResolvedValue([]);
      mockPrismaService.studentPaymentRecord.findMany.mockResolvedValue([]);

      mockPrismaService.assessment.findMany.mockResolvedValue([
        {
          id: 'exam-1',
          title: 'اختبار الشهر',
          questions: [
            {
              id: 'q-1',
              questionText: 'ما هي وحدة قياس القوة؟',
              correctAnswer: 'نيوتن',
              points: 5,
            },
          ],
        },
      ]);

      const result = await service.getBootstrapSnapshot(studentUser);

      expect(result.role).toBe(UserRole.STUDENT);
      expect(result.data.assessments).toHaveLength(1);
      // Correct answer must NOT be exposed to student payload
      expect((result.data.assessments?.[0].questions[0] as any).correctAnswer).toBeUndefined();
      expect(result.data.assessments?.[0].questions[0].questionText).toBe('ما هي وحدة قياس القوة؟');
    });
  });
});
