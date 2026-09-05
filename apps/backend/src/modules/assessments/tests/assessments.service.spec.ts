import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssessmentsService } from '../services/assessments.service';
import { AssessmentCourseLinkScope } from '../dto/create-assessment.dto';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  AssessmentType,
  ExamTimingType,
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
    course: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    courseModule: {
      findUnique: jest.fn(),
      update: jest.fn(),
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
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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

    mockPrismaService.$transaction.mockImplementation((cb: any) => {
      if (typeof cb === 'function') {
        return cb(mockPrismaService);
      }
      return Promise.all(cb);
    });
  });

  describe('createAssessment course linking', () => {
    const baseDto: any = {
      title: 'اختبار الوحدة الأولى',
      type: AssessmentType.EXAM,
      totalScore: 10,
      isPublished: false,
      questions: [
        {
          questionNumber: 1,
          questionText: 'اختر الإجابة الصحيحة',
          questionType: QuestionType.MULTIPLE_CHOICE,
          optionsData: ['أ', 'ب'],
          correctAnswer: 'أ',
          points: 10,
        },
      ],
    };

    beforeEach(() => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
        teacherId: 'teacher-1',
      });
      mockPrismaService.assessment.create.mockResolvedValue({
        id: 'assessment-1',
        isPublished: false,
      });
    });

    it('links a newly created exam as the course exam in the same transaction', async () => {
      await service.createAssessment('teacher-1', false, {
        ...baseDto,
        courseId: 'course-1',
        courseLinkScope: AssessmentCourseLinkScope.COURSE,
      });

      expect(mockPrismaService.course.update).toHaveBeenCalledWith({
        where: { id: 'course-1' },
        data: { courseQuizId: 'assessment-1' },
      });
    });

    it('links a newly created exam to the selected unit in the same transaction', async () => {
      mockPrismaService.courseModule.findUnique.mockResolvedValue({
        id: 'module-1',
        courseId: 'course-1',
      });

      await service.createAssessment('teacher-1', false, {
        ...baseDto,
        courseId: 'course-1',
        courseLinkScope: AssessmentCourseLinkScope.UNIT,
        moduleId: 'module-1',
      });

      expect(mockPrismaService.courseModule.update).toHaveBeenCalledWith({
        where: { id: 'module-1' },
        data: { unitQuizId: 'assessment-1' },
      });
    });
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
      teacher: { user: { fullName: 'أ. أحمد غريب' } },
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
      expect(result.student.user.fullName).toBe('Student');
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

  describe('Strict Exam Scheduling & Timing Enforcement', () => {
    const assessmentId = 'exam-timing-1';
    const studentUser: any = {
      id: 'student-user-1',
      studentProfileId: 'student-profile-1',
      role: UserRole.STUDENT,
    };

    it('rejects student access with 403 before startTime', async () => {
      const futureStartTime = new Date(Date.now() + 3600 * 1000); // 1 hour in future
      const futureEndTime = new Date(Date.now() + 7200 * 1000);
      mockPrismaService.assessment.findUnique.mockResolvedValue({
        id: assessmentId,
        title: 'اختبار موقوت',
        type: AssessmentType.EXAM,
        timingType: ExamTimingType.FIXED_SESSION,
        startTime: futureStartTime,
        endTime: futureEndTime,
        durationMinutes: 60,
        isPublished: true,
        submissions: [],
        questions: [],
      });

      await expect(service.getAssessmentById(assessmentId, studentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects unsubmitted student access with 403 after endTime', async () => {
      const pastStartTime = new Date(Date.now() - 7200 * 1000);
      const pastEndTime = new Date(Date.now() - 3600 * 1000); // ended 1 hour ago
      mockPrismaService.assessment.findUnique.mockResolvedValue({
        id: assessmentId,
        title: 'اختبار موقوت منتهي',
        type: AssessmentType.EXAM,
        timingType: ExamTimingType.FIXED_SESSION,
        startTime: pastStartTime,
        endTime: pastEndTime,
        durationMinutes: 60,
        isPublished: true,
        submissions: [],
        questions: [],
      });

      await expect(service.getAssessmentById(assessmentId, studentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('calculates remaining seconds and isLate correctly for FIXED_SESSION', async () => {
      const pastStartTime = new Date(Date.now() - 10 * 60 * 1000); // started 10 mins ago
      const futureEndTime = new Date(Date.now() + 20 * 60 * 1000); // ends in 20 mins
      mockPrismaService.assessment.findUnique.mockResolvedValue({
        id: assessmentId,
        title: 'اختبار مباشر متزامن',
        type: AssessmentType.EXAM,
        timingType: ExamTimingType.FIXED_SESSION,
        startTime: pastStartTime,
        endTime: futureEndTime,
        durationMinutes: 60, // 60 mins total duration, but only 20 mins remaining until endTime
        isPublished: true,
        submissions: [],
        questions: [],
      });

      const result = await service.getAssessmentById(assessmentId, studentUser);

      expect(result.timingType).toBe(ExamTimingType.FIXED_SESSION);
      expect(result.isLate).toBe(true);
      // Remaining seconds should be bounded by remaining time until endTime (~1200 seconds)
      expect(result.effectiveRemainingSeconds).toBeLessThanOrEqual(1200);
      expect(result.effectiveRemainingSeconds).toBeGreaterThan(1180);
    });

    it('calculates full durationMinutes remaining for FLEXIBLE_WINDOW on first entry', async () => {
      const pastStartTime = new Date(Date.now() - 3600 * 1000); // window opened 1 hr ago
      const futureEndTime = new Date(Date.now() + 24 * 3600 * 1000); // window closes in 24 hrs
      mockPrismaService.assessment.findUnique.mockResolvedValue({
        id: assessmentId,
        title: 'اختبار نافذة مرنة',
        type: AssessmentType.EXAM,
        timingType: ExamTimingType.FLEXIBLE_WINDOW,
        startTime: pastStartTime,
        endTime: futureEndTime,
        durationMinutes: 30, // 30 mins
        isPublished: true,
        submissions: [],
        questions: [],
      });

      const result = await service.getAssessmentById(assessmentId, studentUser);

      expect(result.timingType).toBe(ExamTimingType.FLEXIBLE_WINDOW);
      expect(result.isLate).toBe(false);
      // Student just started, so remaining time should be close to 30 * 60 = 1800 seconds
      expect(result.effectiveRemainingSeconds).toBeLessThanOrEqual(1800);
      expect(result.effectiveRemainingSeconds).toBeGreaterThan(1780);
    });

    it('rejects submission submitted after deadline plus grace period in FIXED_SESSION', async () => {
      const pastEndTime = new Date(Date.now() - 120 * 1000); // ended 2 minutes ago (exceeds 60s buffer)
      mockPrismaService.assessment.findUnique.mockResolvedValue({
        id: assessmentId,
        title: 'اختبار مباشر منتهي',
        type: AssessmentType.EXAM,
        timingType: ExamTimingType.FIXED_SESSION,
        startTime: new Date(Date.now() - 3600 * 1000),
        endTime: pastEndTime,
        durationMinutes: 60,
        isPublished: true,
        allowMultipleAttempts: false,
        questions: [],
      });
      mockPrismaService.assessmentSubmission.findMany.mockResolvedValue([]);

      await expect(
        service.submitAssessment(assessmentId, studentUser, { answers: [] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('gradeSubmission (Manual Scoring & Dynamic Recomputation)', () => {
    const submissionId = 'sub-grade-1';
    const teacherId = 'teacher-1';

    it('rejects grading if question score exceeds question max points', async () => {
      mockPrismaService.assessmentSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        assessment: {
          teacherId,
          totalScore: 10,
          passingScore: 5,
          questions: [
            { id: 'q1', points: 5 },
            { id: 'q2', points: 5 },
          ],
        },
        answers: [],
      });

      await expect(
        service.gradeSubmission(submissionId, teacherId, false, {
          manualGrades: [{ questionId: 'q1', pointsEarned: 8 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates scores, marks submission GRADED, and evaluates isPassed', async () => {
      mockPrismaService.assessmentSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        assessmentId: 'exam-1',
        studentId: 'student-1',
        assessment: {
          teacherId,
          totalScore: 10,
          passingScore: 5,
          questions: [
            { id: 'q1', points: 5 },
            { id: 'q2', points: 5 },
          ],
        },
        answers: [],
      });

      mockPrismaService.studentAnswer.findFirst.mockResolvedValue({ id: 'ans-1' });
      mockPrismaService.studentAnswer.update.mockResolvedValue({});
      mockPrismaService.studentAnswer.findMany.mockResolvedValue([
        { pointsEarned: 4 },
        { pointsEarned: 3 },
      ]);
      mockPrismaService.assessmentSubmission.update.mockResolvedValue({
        id: submissionId,
        assessmentId: 'exam-1',
        status: SubmissionStatus.GRADED,
        scoreObtained: 7,
        isPassed: true,
        teacherFeedback: 'أحسنت',
        gradedAt: new Date(),
        answers: [],
        student: { user: { fullName: 'طالب مجتهد' } },
      });

      const res = await service.gradeSubmission(submissionId, teacherId, false, {
        manualGrades: [
          { questionId: 'q1', pointsEarned: 4, teacherFeedback: 'ممتاز' },
          { questionId: 'q2', pointsEarned: 3 },
        ],
        feedback: 'أحسنت',
      });

      expect(res.status).toBe(SubmissionStatus.GRADED);
      expect(res.scoreObtained).toBe(7);
      expect(res.isPassed).toBe(true);
    });
  });

  describe('reEvaluateAutoGradedSubmissions', () => {
    it('re-evaluates all MCQ and True/False answers against updated model answers', async () => {
      const assessmentId = 'exam-reeval-1';
      const teacherId = 'teacher-1';

      mockPrismaService.assessment.findUnique.mockResolvedValue({
        id: assessmentId,
        teacherId,
        totalScore: 10,
        passingScore: 5,
        questions: [
          {
            id: 'q-mcq-1',
            questionType: QuestionType.MULTIPLE_CHOICE,
            correctAnswer: 'ب',
            points: 5,
          },
          {
            id: 'q-tf-2',
            questionType: QuestionType.TRUE_FALSE,
            correctAnswer: 'صحيحة',
            points: 5,
          },
        ],
        submissions: [
          {
            id: 'sub-1',
            status: SubmissionStatus.SUBMITTED,
            answers: [
              { id: 'ans-1', questionId: 'q-mcq-1', selectedAnswer: 'ب' },
              { id: 'ans-2', questionId: 'q-tf-2', selectedAnswer: 'true' },
            ],
          },
        ],
      });

      mockPrismaService.studentAnswer.update.mockResolvedValue({});
      mockPrismaService.assessmentSubmission.update.mockResolvedValue({});

      const result = await service.reEvaluateAutoGradedSubmissions(assessmentId, teacherId, false);

      expect(result.success).toBe(true);
      expect(result.reEvaluatedCount).toBe(1);
    });
  });
});
