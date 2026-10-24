import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssessmentsService } from '../services/assessments.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { assertStudentAccess } from '../../students/helpers/student-access.helper';
import { AssessmentType, GroupEnrollmentStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

describe('SEC-02: Secretariat Cross-Teacher Isolation Regression Tests', () => {
  let assessmentsService: AssessmentsService;
  let prisma: PrismaService;

  const teacherAId = 'teacher-profile-a-uuid';
  const teacherBId = 'teacher-profile-b-uuid';
  const assistantAId = 'assistant-user-a-uuid';
  const assistantBId = 'assistant-user-b-uuid';
  const unlinkedAssistantId = 'assistant-unlinked-uuid';

  const mockAssessmentTeacherA = {
    id: 'assessment-a-uuid',
    teacherId: teacherAId,
    title: 'Teacher A Exam',
    isPublished: true,
    totalScore: 100,
    passingScore: 50,
    _count: { submissions: 0 },
    questions: [
      { id: 'q-1', points: 10 },
      { id: 'q-2', points: 10 },
    ],
  };

  const mockAssessmentTeacherB = {
    id: 'assessment-b-uuid',
    teacherId: teacherBId,
    title: 'Teacher B Exam',
    isPublished: true,
    totalScore: 100,
    passingScore: 50,
    _count: { submissions: 0 },
    questions: [
      { id: 'q-3', points: 10 },
    ],
  };

  const mockSubmissionTeacherA = {
    id: 'submission-a-uuid',
    assessmentId: 'assessment-a-uuid',
    studentId: 'student-1',
    assessment: {
      id: 'assessment-a-uuid',
      teacherId: teacherAId,
      totalScore: 100,
      passingScore: 50,
      questions: [{ id: 'q-1', points: 10 }],
    },
    answers: [],
  };

  const mockSubmissionTeacherB = {
    id: 'submission-b-uuid',
    assessmentId: 'assessment-b-uuid',
    studentId: 'student-2',
    assessment: {
      id: 'assessment-b-uuid',
      teacherId: teacherBId,
      totalScore: 100,
      passingScore: 50,
      questions: [{ id: 'q-3', points: 10 }],
    },
    answers: [],
  };

  const mockPrismaService = {
    assessment: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    assessmentQuestion: {
      createMany: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    assessmentSubmission: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: 'submission-a-uuid' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    studentAnswer: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    academicGroup: {
      findUnique: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    courseModule: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    courseLesson: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    teacherAssistant: {
      findFirst: jest.fn(),
    },
    groupEnrollment: {
      findFirst: jest.fn(),
    },
    courseEnrollment: {
      findFirst: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrismaService)),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    assessmentsService = module.get<AssessmentsService>(AssessmentsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Mock assistant relationships:
    // Assistant A -> linked to Teacher A
    // Assistant B -> linked to Teacher B
    // Unlinked Assistant -> no link
    mockPrismaService.teacherAssistant.findFirst.mockImplementation(async ({ where }) => {
      if (where.assistantId === assistantAId && where.status === 'ACTIVE') {
        return { id: 'link-a', teacherId: teacherAId, assistantId: assistantAId, status: 'ACTIVE' };
      }
      if (where.assistantId === assistantBId && where.status === 'ACTIVE') {
        return { id: 'link-b', teacherId: teacherBId, assistantId: assistantBId, status: 'ACTIVE' };
      }
      return null;
    });
  });

  describe('1. Assessment Update Cross-Teacher Isolation', () => {
    it('allows Teacher A to update Teacher A assessment', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessmentTeacherA);
      mockPrismaService.assessment.update.mockResolvedValue({ ...mockAssessmentTeacherA, title: 'Updated A' });

      const res = await assessmentsService.updateAssessment('assessment-a-uuid', teacherAId, false, {
        title: 'Updated A',
      });
      expect(res.title).toBe('Updated A');
    });

    it('rejects Teacher B attempting to update Teacher A assessment with 403 Forbidden', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessmentTeacherA);

      await expect(
        assessmentsService.updateAssessment('assessment-a-uuid', teacherBId, false, {
          title: 'Tampered Title',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows Assistant A to update Teacher A assessment', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessmentTeacherA);
      mockPrismaService.assessment.update.mockResolvedValue({ ...mockAssessmentTeacherA, title: 'Updated by Assistant A' });

      const res = await assessmentsService.updateAssessment('assessment-a-uuid', assistantAId, true, {
        title: 'Updated by Assistant A',
      });
      expect(res.title).toBe('Updated by Assistant A');
    });

    it('rejects Assistant A attempting to update Teacher B assessment with 403 Forbidden', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessmentTeacherB);

      await expect(
        assessmentsService.updateAssessment('assessment-b-uuid', assistantAId, true, {
          title: 'Tampered by Assistant A',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects unlinked assistant attempting to update any assessment with 403 Forbidden', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessmentTeacherA);

      await expect(
        assessmentsService.updateAssessment('assessment-a-uuid', unlinkedAssistantId, true, {
          title: 'Unlinked Assistant Update',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('2. Assessment Deletion Cross-Teacher Isolation', () => {
    it('allows Teacher A to delete Teacher A assessment', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessmentTeacherA);
      mockPrismaService.assessment.delete.mockResolvedValue(mockAssessmentTeacherA);

      const res = await assessmentsService.deleteAssessment('assessment-a-uuid', teacherAId, false);
      expect(res.success).toBe(true);
    });

    it('rejects Teacher B attempting to delete Teacher A assessment with 403 Forbidden', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessmentTeacherA);

      await expect(
        assessmentsService.deleteAssessment('assessment-a-uuid', teacherBId, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows Assistant A to delete Teacher A assessment', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessmentTeacherA);
      mockPrismaService.assessment.delete.mockResolvedValue(mockAssessmentTeacherA);

      const res = await assessmentsService.deleteAssessment('assessment-a-uuid', assistantAId, true);
      expect(res.success).toBe(true);
    });

    it('rejects Assistant A attempting to delete Teacher B assessment with 403 Forbidden', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessmentTeacherB);

      await expect(
        assessmentsService.deleteAssessment('assessment-b-uuid', assistantAId, true),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('3. Submission Grading and Inspection Cross-Teacher Isolation', () => {
    it('allows Assistant A to grade submissions for Teacher A assessment', async () => {
      mockPrismaService.assessmentSubmission.findUnique.mockResolvedValue(mockSubmissionTeacherA);
      mockPrismaService.studentAnswer.findFirst.mockResolvedValue({ id: 'ans-1' });
      mockPrismaService.studentAnswer.update.mockResolvedValue({});

      const res = await assessmentsService.gradeSubmission('submission-a-uuid', assistantAId, true, {
        manualGrades: [{ questionId: 'q-1', pointsEarned: 10 }],
      });
      expect(res).toBeDefined();
    });

    it('rejects Assistant A attempting to grade submission for Teacher B assessment with 403 Forbidden', async () => {
      mockPrismaService.assessmentSubmission.findUnique.mockResolvedValue(mockSubmissionTeacherB);

      await expect(
        assessmentsService.gradeSubmission('submission-b-uuid', assistantAId, true, {
          manualGrades: [{ questionId: 'q-3', pointsEarned: 10 }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects Assistant A attempting to view submissions for Teacher B assessment with 403 Forbidden', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessmentTeacherB);

      await expect(
        assessmentsService.getAssessmentSubmissions('assessment-b-uuid', assistantAId, true),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects Assistant A attempting to view submission details for Teacher B with 403 Forbidden', async () => {
      mockPrismaService.assessmentSubmission.findUnique.mockResolvedValue(mockSubmissionTeacherB);

      await expect(
        assessmentsService.getSubmissionById('submission-b-uuid', assistantAId, true),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('4. Assessment Creation Ownership Validation', () => {
    it('assigns assessment to effective teacher when Assistant A creates an assessment', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue({
        id: 'group-a',
        teacherId: teacherAId,
      });
      mockPrismaService.assessment.create.mockImplementation(({ data }) => ({
        id: 'new-ass-1',
        ...data,
      }));

      await assessmentsService.createAssessment(assistantAId, true, {
        title: 'New Exam by Assistant',
        type: AssessmentType.ASSIGNMENT,
        totalScore: 10,
        groupId: 'group-a',
        questions: [{ questionNumber: 1, questionText: 'Q1', questionType: 'MULTIPLE_CHOICE' as any, optionsData: ['A', 'B'], correctAnswer: 'A', points: 10 }],
      });

      expect(mockPrismaService.assessment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teacherId: teacherAId,
          }),
        }),
      );
    });

    it('rejects Assistant A creating assessment for group owned by Teacher B', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue({
        id: 'group-b',
        teacherId: teacherBId,
      });

      await expect(
        assessmentsService.createAssessment(assistantAId, true, {
          title: 'Unauthorized Exam',
          type: AssessmentType.ASSIGNMENT,
          totalScore: 10,
          groupId: 'group-b',
          questions: [{ questionNumber: 1, questionText: 'Q1', questionType: 'MULTIPLE_CHOICE' as any, optionsData: ['A', 'B'], correctAnswer: 'A', points: 10 }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('5. Student Profile Access Isolation (assertStudentAccess)', () => {
    const studentEnrolledInTeacherA = 'student-a-id';
    const studentEnrolledInTeacherB = 'student-b-id';

    beforeEach(() => {
      mockPrismaService.groupEnrollment.findFirst.mockImplementation(async ({ where }) => {
        if (where.studentId === studentEnrolledInTeacherA && where.group.OR.some((cond: any) => cond.teacherId === teacherAId)) {
          return { id: 'enr-1', studentId: studentEnrolledInTeacherA, status: GroupEnrollmentStatus.ACTIVE };
        }
        if (where.studentId === studentEnrolledInTeacherB && where.group.OR.some((cond: any) => cond.teacherId === teacherBId)) {
          return { id: 'enr-2', studentId: studentEnrolledInTeacherB, status: GroupEnrollmentStatus.ACTIVE };
        }
        return null;
      });
      mockPrismaService.courseEnrollment.findFirst.mockResolvedValue(null);
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(null);
    });

    it('allows Teacher A to access student enrolled in Teacher A group', async () => {
      const userTeacherA: AuthenticatedUser = {
        id: teacherAId,
        email: 'teachera@el-awal.online',
        fullName: 'Teacher A',
        role: UserRole.TEACHER,
        teacherProfileId: teacherAId,
      };

      await expect(
        assertStudentAccess(prisma, studentEnrolledInTeacherA, userTeacherA),
      ).resolves.toBeUndefined();
    });

    it('rejects Teacher B attempting to access student enrolled only in Teacher A group', async () => {
      const userTeacherB: AuthenticatedUser = {
        id: teacherBId,
        email: 'teacherb@el-awal.online',
        fullName: 'Teacher B',
        role: UserRole.TEACHER,
        teacherProfileId: teacherBId,
      };

      await expect(
        assertStudentAccess(prisma, studentEnrolledInTeacherA, userTeacherB),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows Assistant A to access student enrolled in Teacher A group', async () => {
      const userAssistantA: AuthenticatedUser = {
        id: assistantAId,
        email: 'assistanta@el-awal.online',
        fullName: 'Assistant A',
        role: UserRole.SECRETARIAT,
      };

      await expect(
        assertStudentAccess(prisma, studentEnrolledInTeacherA, userAssistantA),
      ).resolves.toBeUndefined();
    });

    it('rejects Assistant A attempting to access student enrolled only in Teacher B group', async () => {
      const userAssistantA: AuthenticatedUser = {
        id: assistantAId,
        email: 'assistanta@el-awal.online',
        fullName: 'Assistant A',
        role: UserRole.SECRETARIAT,
      };

      await expect(
        assertStudentAccess(prisma, studentEnrolledInTeacherB, userAssistantA),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects unlinked assistant attempting to access any student profile', async () => {
      const userUnlinked: AuthenticatedUser = {
        id: unlinkedAssistantId,
        email: 'unlinked@el-awal.online',
        fullName: 'Unlinked Assistant',
        role: UserRole.SECRETARIAT,
      };

      await expect(
        assertStudentAccess(prisma, studentEnrolledInTeacherA, userUnlinked),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
