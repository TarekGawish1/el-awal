import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from '../services/students.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { GroupEnrollmentStatus, UserRole } from '@prisma/client';

describe('StudentsService student group hub', () => {
  let service: StudentsService;

  const prisma = {
    groupEnrollment: { findFirst: jest.fn() },
    studentPaymentRecord: { findFirst: jest.fn() },
    lessonSession: { findMany: jest.fn() },
    assessment: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(StudentsService);
    jest.clearAllMocks();
  });

  it('returns only the authenticated student group sessions with joined attendance and attachments', async () => {
    prisma.groupEnrollment.findFirst.mockResolvedValue({
      studentId: 'student-1',
      groupId: 'group-1',
      status: GroupEnrollmentStatus.ACTIVE,
      group: {
        id: 'group-1',
        name: 'المجموعة أ',
        gradeLevel: 'الصف الأول الثانوي',
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
        monthlyFee: 500,
        schedules: [],
        teacher: { id: 'teacher-1', specialty: null, bio: null, user: { id: 'user-1', fullName: 'المعلم' } },
      },
    });
    prisma.lessonSession.findMany.mockImplementation(async (args) => {
      expect(args.where.groupId).toBe('group-1');
      expect(args.where.sessionDate.gte).toEqual(new Date(Date.UTC(2026, 7, 1)));
      return [{
        id: 'session-1',
        groupId: 'group-1',
        scheduleId: null,
        sessionDate: new Date('2026-08-10T00:00:00.000Z'),
        startTime: '10:00',
        endTime: '12:00',
        topic: 'شرح قوانين نيوتن',
        isCancelled: false,
        cancellationReason: null,
        schedule: { id: 'schedule-1', location: 'القاعة الرئيسية' },
        attendanceRecords: [{ status: 'PRESENT', recordingMethod: 'QR_SCAN', recordedAt: new Date(), notes: null }],
        educationalContents: [{ id: 'content-1', title: 'ملخص', contentType: 'SUMMARY', fileUrl: '/summary.pdf', fileKey: 'summary.pdf', fileSize: BigInt(100), mimeType: 'application/pdf', description: null, createdAt: new Date() }],
      }];
    });
    prisma.assessment.findMany.mockResolvedValue([]);

    const result = await service.getMyGroupSessions(
      { id: 'user-1', studentProfileId: 'student-1', role: UserRole.STUDENT },
      { month: 8, year: 2026 },
    );

    expect(result).toHaveLength(1);
    expect(result[0].groupId).toBe('group-1');
    expect(result[0].attendance?.status).toBe('PRESENT');
    expect(result[0].educationalContents[0].title).toBe('ملخص');
    expect(prisma.lessonSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ groupId: 'group-1' }),
    }));
  });
});
