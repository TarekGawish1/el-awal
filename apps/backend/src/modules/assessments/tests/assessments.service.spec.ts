import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
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
    },
    assessmentQuestion: {
      createMany: jest.fn(),
    },
    assessmentSubmission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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

    const mockAssessmentWithMcq = {
      id: assessmentId,
      isPublished: true,
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
      mockPrismaService.assessmentSubmission.findUnique.mockResolvedValue(null); // No previous submission

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          assessmentSubmission: {
            create: jest.fn().mockResolvedValue({
              id: 'submission-uuid-1',
              assessmentId,
              studentId,
              status: SubmissionStatus.GRADED,
              scoreObtained: 10.0,
              isAutoGraded: true,
              submittedAt: new Date(),
              gradedAt: new Date(),
            }),
          },
        });
      });

      const result = await service.submitAssessment(assessmentId, studentId, {
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
      mockPrismaService.assessmentSubmission.findUnique.mockResolvedValue(null);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          assessmentSubmission: {
            create: jest.fn().mockResolvedValue({
              id: 'submission-uuid-2',
              assessmentId,
              studentId,
              status: SubmissionStatus.SUBMITTED,
              scoreObtained: null,
              isAutoGraded: false,
              submittedAt: new Date(),
              gradedAt: null,
            }),
          },
        });
      });

      const result = await service.submitAssessment(assessmentId, studentId, {
        answers: [
          { questionId: 'q-1', answerGiven: 'أ' },
          { questionId: 'q-2', answerGiven: 'إجابة الطالب المقالية المفصلة' },
        ],
      });

      expect(result.status).toBe(SubmissionStatus.SUBMITTED);
      expect(result.scoreObtained).toBeNull();
    });

    it('should throw ConflictException on duplicate submission attempt', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessmentWithMcq);
      mockPrismaService.assessmentSubmission.findUnique.mockResolvedValue({
        id: 'existing-sub-1',
      }); // Already submitted

      await expect(
        service.submitAssessment(assessmentId, studentId, {
          answers: [{ questionId: 'q-1', answerGiven: 'خبر كان منصوب' }],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
