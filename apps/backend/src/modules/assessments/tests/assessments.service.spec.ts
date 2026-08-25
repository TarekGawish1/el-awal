import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssessmentsService } from '../services/assessments.service';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  AssessmentType,
  QuestionType,
  SubmissionStatus,
  UserRole,
} from '@prisma/client';

describe('AssessmentsService', () => {
  let service: AssessmentsService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  const mockPrismaService = {
    assessment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    assessmentQuestion: {
      createMany: jest.fn(),
    },
    assessmentSubmission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    lessonSession: {
      findUnique: jest.fn(),
    },
    studentAnswer: {
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    jest.clearAllMocks();
  });

  describe('getAssessmentById (Zero-Leak Projection)', () => {
    const assessmentId = 'assessment-uuid-1';
    const mockAssessment = {
      id: assessmentId,
      title: 'اختبار النحو والبلاغة',
      description: 'اختبار شهري',
      type: AssessmentType.EXAM,
      totalScore: 10.0,
      passingScore: 5.0,
      durationMinutes: 30,
      isPublished: true,
      allowMultipleAttempts: false,
      dueDate: null,
      teacher: { user: { fullName: 'أ. طارق عبد الله' } },
      group: null,
      course: null,
      questions: [
        {
          id: 'q-1',
          questionNumber: 1,
          questionText: 'سؤال اختيار من متعدد',
          questionType: QuestionType.MULTIPLE_CHOICE,
          optionsData: ['أ', 'ب', 'ج'],
          correctAnswer: 'ب',
          explanation: 'تفسير الإجابة الصحيحة بالتفصيل',
          points: 5.0,
        },
      ],
      submissions: [],
    };

    it('should strictly redact correctAnswer and explanation for student requests', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);

      const studentUser: any = {
        id: 'student-user-1',
        studentProfileId: 'student-profile-1',
        role: UserRole.STUDENT,
      };

      const result = await service.getAssessmentById(assessmentId, studentUser);

      expect(result.questions[0]).not.toHaveProperty('correctAnswer');
      expect(result.questions[0]).not.toHaveProperty('explanation');
      expect(result.questions[0].questionText).toBe('سؤال اختيار من متعدد');
    });

    it('should retain correctAnswer and explanation for teacher requests', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);

      const teacherUser: any = {
        id: 'teacher-user-1',
        teacherProfileId: 'teacher-profile-1',
        role: UserRole.TEACHER,
      };

      const result = await service.getAssessmentById(assessmentId, teacherUser);

      expect(result.questions[0]).toHaveProperty('correctAnswer', 'ب');
      expect(result.questions[0]).toHaveProperty('explanation');
    });
  });

  describe('submitAssessment (Auto-Grading & Single Attempt Enforcement)', () => {
    const assessmentId = 'assessment-uuid-1';
    const studentId = 'student-profile-1';
    const studentUser: any = {
      id: 'student-user-1',
      studentProfileId: studentId,
      role: UserRole.STUDENT,
    };

    const mockAssessmentWithMcq = {
      id: assessmentId,
      isPublished: true,
      allowMultipleAttempts: false,
      dueDate: null,
      totalScore: 10.0,
      questions: [
        {
          id: 'q-1',
          questionNumber: 1,
          questionType: QuestionType.MULTIPLE_CHOICE,
          correctAnswer: 'خبر كان منصوب',
          points: 5.0,
        },
        {
          id: 'q-2',
          questionNumber: 2,
          questionType: QuestionType.TRUE_FALSE,
          correctAnswer: 'صواب',
          points: 5.0,
        },
      ],
    };

    it('should calculate 100% perfect score on all-correct MCQ and mark GRADED', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessmentWithMcq);
      mockPrismaService.assessmentSubmission.findMany.mockResolvedValue([]); // No previous attempts

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          assessmentSubmission: {
            create: jest.fn().mockResolvedValue({
              id: 'submission-uuid-1',
              assessmentId,
              studentId,
              attemptNumber: 1,
              status: SubmissionStatus.GRADED,
              scoreObtained: 10.0,
              isAutoGraded: true,
              submittedAt: new Date(),
              gradedAt: new Date(),
            }),
          },
        });
      });

      const result = await service.submitAssessment(assessmentId, studentUser, {
        answers: [
          { questionId: 'q-1', answerGiven: 'خبر كان منصوب' },
          { questionId: 'q-2', answerGiven: 'صواب' },
        ],
      });

      expect(result.status).toBe(SubmissionStatus.GRADED);
      expect(result.scoreObtained).toBe(10.0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'assessment.graded',
        expect.objectContaining({ scoreObtained: 10.0, studentId }),
      );
    });

    it('should mark submission as SUBMITTED when exam contains an ESSAY question', async () => {
      const mockAssessmentWithEssay = {
        id: assessmentId,
        isPublished: true,
        allowMultipleAttempts: false,
        dueDate: null,
        totalScore: 10.0,
        questions: [
          {
            id: 'q-1',
            questionNumber: 1,
            questionType: QuestionType.MULTIPLE_CHOICE,
            correctAnswer: 'أ',
            points: 5.0,
          },
          {
            id: 'q-2',
            questionNumber: 2,
            questionType: QuestionType.ESSAY,
            correctAnswer: 'نموذج إجابة المقال',
            points: 5.0,
          },
        ],
      };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessmentWithEssay);
      mockPrismaService.assessmentSubmission.findMany.mockResolvedValue([]);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          assessmentSubmission: {
            create: jest.fn().mockResolvedValue({
              id: 'submission-uuid-2',
              assessmentId,
              studentId,
              attemptNumber: 1,
              status: SubmissionStatus.SUBMITTED,
              scoreObtained: null,
              isAutoGraded: false,
              submittedAt: new Date(),
              gradedAt: null,
            }),
          },
        });
      });

      const result = await service.submitAssessment(assessmentId, studentUser, {
        answers: [
          { questionId: 'q-1', answerGiven: 'أ' },
          { questionId: 'q-2', answerGiven: 'إجابة الطالب المقالية المفصلة' },
        ],
      });

      expect(result.status).toBe(SubmissionStatus.SUBMITTED);
      expect(result.scoreObtained).toBeNull();
    });

    it('should throw BadRequestException (SINGLE_ATTEMPT_ONLY) on a second attempt when allowMultipleAttempts is false', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessmentWithMcq);
      mockPrismaService.assessmentSubmission.findMany.mockResolvedValue([
        { id: 'existing-sub-1', attemptNumber: 1 },
      ]); // Already submitted, single-attempt policy

      await expect(
        service.submitAssessment(assessmentId, studentUser, {
          answers: [{ questionId: 'q-1', answerGiven: 'خبر كان منصوب' }],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.submitAssessment(assessmentId, studentUser, {
          answers: [{ questionId: 'q-1', answerGiven: 'خبر كان منصوب' }],
        }),
      ).rejects.toMatchObject({
        response: {
          code: 'SINGLE_ATTEMPT_ONLY',
          message: 'غير مسموح بإعادة هذا الاختبار، تم استنفاد المحاولة الوحيدة المتاحة',
        },
      });
    });

    it('should allow a retake and increment attemptNumber when allowMultipleAttempts is true', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue({
        ...mockAssessmentWithMcq,
        allowMultipleAttempts: true,
      });
      mockPrismaService.assessmentSubmission.findMany.mockResolvedValue([
        { id: 'existing-sub-1', attemptNumber: 1 },
      ]);

      const createSpy = jest.fn().mockResolvedValue({
        id: 'submission-uuid-3',
        assessmentId,
        studentId,
        attemptNumber: 2,
        status: SubmissionStatus.GRADED,
        scoreObtained: 10.0,
        isAutoGraded: true,
        submittedAt: new Date(),
        gradedAt: new Date(),
      });
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({ assessmentSubmission: { create: createSpy } });
      });

      const result = await service.submitAssessment(assessmentId, studentUser, {
        answers: [
          { questionId: 'q-1', answerGiven: 'خبر كان منصوب' },
          { questionId: 'q-2', answerGiven: 'صواب' },
        ],
      });

      expect(result.status).toBe(SubmissionStatus.GRADED);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ attemptNumber: 2 }),
        }),
      );
    });
  });

  describe('getMyAssessmentStatus', () => {
    const assessmentId = 'assessment-uuid-1';
    const studentId = 'student-profile-1';
    const studentUser: any = {
      id: 'student-user-1',
      studentProfileId: studentId,
      role: UserRole.STUDENT,
    };

    it('should report no submission and preserve the attempt policy', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue({
        id: assessmentId,
        totalScore: 20.0,
        allowMultipleAttempts: false,
      });
      mockPrismaService.assessmentSubmission.findMany.mockResolvedValue([]);

      const result = await service.getMyAssessmentStatus(assessmentId, studentUser);

      expect(result).toMatchObject({
        hasSubmitted: false,
        score: null,
        totalScore: 20,
        percentage: null,
        attemptsCount: 0,
        allowMultipleAttempts: false,
      });
    });

    it('should surface the official (highest) score and percentage', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue({
        id: assessmentId,
        totalScore: 20.0,
        allowMultipleAttempts: true,
      });
      mockPrismaService.assessmentSubmission.findMany.mockResolvedValue([
        { attemptNumber: 1, status: SubmissionStatus.GRADED, scoreObtained: 10.0 },
        { attemptNumber: 2, status: SubmissionStatus.GRADED, scoreObtained: 18.0 },
      ]);

      const result = await service.getMyAssessmentStatus(assessmentId, studentUser);

      expect(result).toMatchObject({
        hasSubmitted: true,
        score: 18,
        totalScore: 20,
        percentage: 90,
        attemptsCount: 2,
        allowMultipleAttempts: true,
      });
    });
  });

  describe('getSubmissionById', () => {
    const submissionId = 'sub-1';
    const teacherId = 'teacher-1';
    const mockSubmission = {
      id: submissionId,
      attemptNumber: 1,
      status: SubmissionStatus.SUBMITTED,
      scoreObtained: null,
      isAutoGraded: false,
      submittedAt: new Date(),
      gradedAt: null,
      attachmentUrl: null,
      teacherFeedback: null,
      assessment: {
        id: 'ass-1',
        title: 'Title',
        totalScore: 10,
        teacherId: teacherId,
        questions: [],
      },
      student: {
        id: 'stu-1',
        studentCode: 'CODE',
        user: { fullName: 'Student', phone: '123', email: 'stu@example.com' },
      },
      answers: [],
    };

    it('should return submission details for the owning teacher', async () => {
      mockPrismaService.assessmentSubmission.findUnique.mockResolvedValue(mockSubmission);
      
      const result = await service.getSubmissionById(submissionId, teacherId, false);
      expect(result.id).toBe(submissionId);
      expect(result.assessment.title).toBe('Title');
      expect(result.student.fullName).toBe('Student');
    });

    it('should throw ForbiddenException for non-owning teacher', async () => {
      mockPrismaService.assessmentSubmission.findUnique.mockResolvedValue(mockSubmission);
      
      await expect(
        service.getSubmissionById(submissionId, 'other-teacher', false)
      ).rejects.toThrow('You do not have permission to view this submission');
    });
  });

  describe('updateAssessment', () => {
    const assessmentId = 'ass-1';
    const teacherId = 'teacher-1';
    const mockAssessment = {
      id: assessmentId,
      teacherId,
      isPublished: true,
      _count: { submissions: 1 },
    };

    it('should update allowed fields for the owner', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);
      mockPrismaService.assessment.update.mockResolvedValue({ ...mockAssessment, title: 'New Title' });

      const result = await service.updateAssessment(assessmentId, teacherId, false, {
        title: 'New Title',
      });

      expect(result.title).toBe('New Title');
      expect(mockPrismaService.assessment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: assessmentId },
          data: { title: 'New Title' },
        })
      );
    });

    it('should prevent unpublishing if submissions exist', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);

      await expect(
        service.updateAssessment(assessmentId, teacherId, false, {
          isPublished: false,
        })
      ).rejects.toThrow('Cannot unpublish an assessment that already has student submissions.');
    });
  });

  describe('getAssessments (Student scope: physical groups only)', () => {
    it('excludes online course/lesson quizzes from the student group exam list', async () => {
      mockPrismaService.assessment.findMany.mockResolvedValue([]);

      const studentUser: any = {
        id: 'student-user-1',
        studentProfileId: 'student-profile-1',
        role: UserRole.STUDENT,
      };

      await service.getAssessments({}, studentUser);

      expect(mockPrismaService.assessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lessonId: null,
            courseId: null,
            isPublished: true,
          }),
        }),
      );
      const whereArgs = mockPrismaService.assessment.findMany.mock.calls[0][0].where;
      expect(whereArgs.OR).toHaveLength(2);
      expect(whereArgs.OR.some((cond: any) => 'course' in cond)).toBe(false);
    });
  });

  describe('submitHomework', () => {
    const assessmentId = 'assessment-homework-1';
    const sessionId = 'session-homework-1';
    const studentUser: any = {
      id: 'student-user-1',
      studentProfileId: 'student-profile-1',
      role: UserRole.STUDENT,
    };
    const dto = {
      sessionId,
      fileKey: 'uploads/homework-submissions/answer.pdf',
      fileUrl: 'https://cdn/answer.pdf',
      studentNotes: 'يرجى المراجعة',
    };

    it('persists a homework submission linked to the session and assessment', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue({
        id: assessmentId,
        isPublished: true,
        courseId: null,
        lessonId: null,
        groupId: 'group-1',
        group: {
          enrollments: [{ studentId: 'student-profile-1', status: 'ACTIVE' }],
        },
      });
      mockPrismaService.lessonSession.findUnique.mockResolvedValue({
        id: sessionId,
        groupId: 'group-1',
      });
      mockPrismaService.assessmentSubmission.upsert.mockResolvedValue({
        id: 'submission-1',
        assessmentId,
        sessionId,
        status: SubmissionStatus.SUBMITTED,
        attachmentUrl: dto.fileUrl,
        fileKey: dto.fileKey,
        studentNotes: dto.studentNotes,
        submittedAt: new Date('2026-08-24'),
      });

      const result = await service.submitHomework(assessmentId, studentUser, dto);

      expect(result.sessionId).toBe(sessionId);
      expect(result.status).toBe(SubmissionStatus.SUBMITTED);
      expect(result.fileKey).toBe(dto.fileKey);
      expect(mockPrismaService.assessmentSubmission.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            assessmentId_studentId_attemptNumber: {
              assessmentId,
              studentId: 'student-profile-1',
              attemptNumber: 1,
            },
          },
          create: expect.objectContaining({ sessionId, fileKey: dto.fileKey }),
        }),
      );
    });

    it('rejects a session that does not belong to the assessment group', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue({
        id: assessmentId,
        isPublished: true,
        courseId: null,
        lessonId: null,
        groupId: 'group-1',
        group: { enrollments: [{ studentId: 'student-profile-1' }] },
      });
      mockPrismaService.lessonSession.findUnique.mockResolvedValue({
        id: sessionId,
        groupId: 'group-2',
      });

      await expect(service.submitHomework(assessmentId, studentUser, dto)).rejects.toThrow(
        'The lesson session does not belong to the assessment group',
      );
    });
  });
});
