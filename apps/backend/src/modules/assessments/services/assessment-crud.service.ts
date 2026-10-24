import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  AssessmentCourseLinkScope,
  CreateAssessmentDto,
} from '../dto/create-assessment.dto';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';
import {
  QuestionType,
  AssessmentType,
  ExamTimingType,
} from '@prisma/client';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { MemoryCache } from '../../../common/utils/memory-cache.util';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { notifyAssessmentPublished } from '../helpers/assessment-notification.helper';
import {
  buildUpdateAssessmentData,
  deleteAssessmentCascade,
} from '../helpers/assessment-crud.helper';

@Injectable()
export class AssessmentCrudService {
  private readonly logger = new Logger(AssessmentCrudService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly storageService?: StorageService,
    @Optional() private readonly redisCache?: RedisCacheService,
    @Optional() private readonly assessmentsListCache?: MemoryCache,
    @Optional() private readonly assessmentDetailsCache?: MemoryCache<any>,
  ) {}

  private async invalidatePortalCaches(studentId?: string | null) {
    if (!this.redisCache) return;
    try {
      if (studentId) {
        await Promise.all([
          this.redisCache.delPattern(`student:dashboard:${studentId}`),
          this.redisCache.delPattern(`parent:overview:${studentId}`),
          this.redisCache.delPattern(`parent:dashboard:*`),
        ]);
      } else {
        await Promise.all([
          this.redisCache.delPattern('student:dashboard:*'),
          this.redisCache.delPattern('parent:overview:*'),
          this.redisCache.delPattern('parent:dashboard:*'),
        ]);
      }
    } catch (error) {
      this.logger.warn(`Failed to invalidate portal caches: ${error}`);
    }
  }

  async createAssessment(
    teacherId: string,
    isSecretariat: boolean,
    dto: CreateAssessmentDto,
  ) {
    const logicalType = dto.assessmentType || dto.type;
    if (!logicalType) {
      throw new BadRequestException('Assessment type is required');
    }

    const storedType =
      logicalType === AssessmentType.HOMEWORK
        ? AssessmentType.ASSIGNMENT
        : logicalType === AssessmentType.QUIZ
          ? AssessmentType.EXAM
          : logicalType;
    const storedAssessmentType =
      logicalType === AssessmentType.ASSIGNMENT
        ? AssessmentType.HOMEWORK
        : logicalType;

    const effectiveTeacherId = await this.resolveEffectiveTeacherId(teacherId, isSecretariat);

    if (dto.groupId) {
      const group = await this.prisma.academicGroup.findUnique({
        where: { id: dto.groupId },
      });
      if (!group) throw new NotFoundException(`Group [${dto.groupId}] not found`);
      if (group.teacherId !== effectiveTeacherId) {
        throw new ForbiddenException('You do not own this academic group');
      }
    }

    if (dto.courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
      });
      if (!course) throw new NotFoundException(`Course [${dto.courseId}] not found`);
      if (course.teacherId !== effectiveTeacherId) {
        throw new ForbiddenException('You do not own this course');
      }
    }

    if (dto.lessonId && dto.courseId) {
      const lesson = await this.prisma.courseLesson.findUnique({
        where: { id: dto.lessonId },
        include: { module: true },
      });
      if (!lesson || lesson.module.courseId !== dto.courseId) {
        throw new BadRequestException('Lesson does not belong to the specified course');
      }
    }

    if (dto.courseLinkScope && !dto.courseId) {
      throw new BadRequestException('A course is required to link the assessment');
    }

    if (dto.courseLinkScope === AssessmentCourseLinkScope.UNIT) {
      if (!dto.moduleId) {
        throw new BadRequestException('A module is required to link a unit assessment');
      }

      const courseModule = await this.prisma.courseModule.findUnique({
        where: { id: dto.moduleId },
      });
      if (!courseModule || courseModule.courseId !== dto.courseId) {
        throw new BadRequestException('Module does not belong to the specified course');
      }
    } else if (dto.courseLinkScope === AssessmentCourseLinkScope.LESSON) {
      if (!dto.lessonId) {
        throw new BadRequestException('A lesson ID is required to link a lesson assessment');
      }

      const courseLesson = await this.prisma.courseLesson.findUnique({
        where: { id: dto.lessonId },
        include: { module: true },
      });
      if (!courseLesson || courseLesson.module.courseId !== dto.courseId) {
        throw new BadRequestException('Lesson does not belong to the specified course');
      }
    }

    const totalCalculated = dto.questions.reduce(
      (sum, q) => sum + Number(q.points),
      0,
    );

    if (totalCalculated > 0) {
      if (!dto.totalScore || Math.abs(totalCalculated - Number(dto.totalScore)) > 0.01) {
        this.logger.warn(
          `Auto-adjusting totalScore from ${dto.totalScore} to match actual question points sum (${totalCalculated})`,
        );
        dto.totalScore = totalCalculated;
      }
      if (dto.passingScore && Number(dto.passingScore) > totalCalculated) {
        dto.passingScore = Math.max(0.5, Math.round(totalCalculated * 0.5));
      }
    } else if (Math.abs(totalCalculated - Number(dto.totalScore)) > 0.01) {
      throw new BadRequestException(
        `مجموع درجات الأسئلة (${totalCalculated}) لا يطابق الدرجة الكلية للاختبار (${dto.totalScore})`,
      );
    }

    const isAutoGraded = dto.questions.every(
      (q) =>
        q.questionType === QuestionType.MULTIPLE_CHOICE ||
        q.questionType === QuestionType.TRUE_FALSE,
    );

    const rawStartTime = dto.startTime || dto.startDate;
    const rawEndTime = dto.endTime || dto.deadline || dto.dueDate;
    const startTimeDate = rawStartTime ? new Date(rawStartTime) : null;
    const endTimeDate = rawEndTime ? new Date(rawEndTime) : null;
    const timingType =
      dto.timingType ||
      (dto.requirePassingScore || dto.courseId || dto.courseLinkScope || dto.lessonId
        ? ExamTimingType.FLEXIBLE_WINDOW
        : storedType === AssessmentType.EXAM
        ? ExamTimingType.FIXED_SESSION
        : undefined);

    const assessment = await this.prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.create({
        data: {
          id: dto.id || undefined,
          title: dto.title,
          description: dto.description,
          type: storedType,
          assessmentType: storedAssessmentType,
          timingType,
          totalScore: dto.totalScore,
          passingScore: dto.passingScore,
          durationMinutes: dto.durationMinutes,
          startTime: startTimeDate,
          endTime: endTimeDate,
          startDate: startTimeDate,
          dueDate: endTimeDate,
          deadline: endTimeDate,
          academicStage: dto.academicStage,
          gradeLevel: dto.gradeLevel,
          groupId: dto.groupId,
          courseId: dto.courseId,
          lessonId: dto.lessonId,
          isAutoGraded,
          isPublished: dto.isPublished ?? true,
          allowMultipleAttempts: dto.requirePassingScore
            ? (dto.allowMultipleAttempts ?? true)
            : (dto.allowMultipleAttempts ?? false),
          isOptional: dto.isOptional ?? false,
          requirePassingScore: dto.requirePassingScore ?? false,
          teacherId: effectiveTeacherId,
          targetGroups: dto.targetGroupIds?.length ? {
            connect: dto.targetGroupIds.map(id => ({ id }))
          } : undefined,
        },
      });

      const questionData = dto.questions.map((q) => ({
        assessmentId: assessment.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        questionType: q.questionType,
        optionsData: q.optionsData ? q.optionsData : undefined,
        optionImages: q.optionImages ? q.optionImages : undefined,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        imageUrl: q.imageUrl,
        points: q.points,
      }));

      await tx.assessmentQuestion.createMany({
        data: questionData,
      });

      if (dto.courseLinkScope === AssessmentCourseLinkScope.COURSE) {
        await tx.course.update({
          where: { id: dto.courseId! },
          data: { courseQuizId: assessment.id },
        });
      } else if (dto.courseLinkScope === AssessmentCourseLinkScope.UNIT) {
        await tx.courseModule.update({
          where: { id: dto.moduleId! },
          data: { unitQuizId: assessment.id },
        });
      } else if (dto.courseLinkScope === AssessmentCourseLinkScope.LESSON && dto.lessonId) {
        if (storedType === AssessmentType.EXAM) {
          await tx.courseLesson.update({
            where: { id: dto.lessonId },
            data: { lessonQuizId: assessment.id },
          });
        }
      }

      this.logger.log(
        `Created assessment [${assessment.id}] with ${dto.questions.length} questions`,
      );

      return {
        ...assessment,
        totalQuestions: dto.questions.length,
      };
    });

    if (assessment.isPublished) {
      await notifyAssessmentPublished(this.prisma, this.notifications, assessment, this.logger);
    }

    this.assessmentsListCache?.clear();
    await this.invalidatePortalCaches();
    return assessment;
  }

  async updateAssessment(
    assessmentId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: UpdateAssessmentDto,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { _count: { select: { submissions: true } } }
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    await this.assertAssessmentAccess(
      assessment.teacherId,
      teacherId,
      isSecretariat,
      'You do not have permission to update this assessment',
    );

    if (
      assessment._count.submissions > 0 &&
      dto.isPublished === false &&
      assessment.isPublished === true
    ) {
      throw new ConflictException('Cannot unpublish an assessment that already has student submissions.');
    }

    const updateData = buildUpdateAssessmentData(dto);

    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: updateData,
    });

    if (dto.isPublished === true && !assessment.isPublished) {
      await notifyAssessmentPublished(this.prisma, this.notifications, { ...assessment, ...updated }, this.logger);
    }

    this.logger.log(`Assessment [${assessmentId}] updated`);

    this.assessmentsListCache?.clear();
    this.assessmentDetailsCache?.delete(`assessment:base:${assessmentId}`);
    await this.invalidatePortalCaches();
    return updated;
  }

  async deleteAssessment(
    assessmentId: string,
    teacherId: string,
    isSecretariat: boolean,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException('التقييم المطلوب غير موجود');
    }

    await this.assertAssessmentAccess(
      assessment.teacherId,
      teacherId,
      isSecretariat,
      'غير مصرح لك بحذف هذا التقييم',
    );

    await deleteAssessmentCascade({
      prisma: this.prisma,
      storageService: this.storageService,
      logger: this.logger,
      assessmentId,
    });

    this.assessmentsListCache?.clear();
    this.assessmentDetailsCache?.delete(`assessment:base:${assessmentId}`);
    await this.invalidatePortalCaches();

    this.logger.log(`Assessment [${assessmentId}] deleted by teacher [${teacherId}]`);

    return {
      success: true,
      assessmentId,
      message: 'تم حذف الاختبار/الواجب بنجاح',
    };
  }

  private async resolveEffectiveTeacherId(
    teacherId: string,
    isSecretariat: boolean,
  ): Promise<string> {
    if (!isSecretariat) {
      return teacherId;
    }
    const link = await this.prisma.teacherAssistant.findFirst({
      where: { assistantId: teacherId, status: 'ACTIVE' },
      select: { teacherId: true },
    });
    if (!link) {
      throw new ForbiddenException('لا يوجد ارتباط نشط كمعاون مع أي معلم');
    }
    return link.teacherId;
  }

  private async assertAssessmentAccess(
    assessmentTeacherId: string,
    callerTeacherId: string,
    isSecretariat: boolean,
    forbiddenMessage: string,
  ): Promise<void> {
    const effectiveTeacherId = await this.resolveEffectiveTeacherId(
      callerTeacherId,
      isSecretariat,
    );
    if (assessmentTeacherId !== effectiveTeacherId) {
      throw new ForbiddenException(forbiddenMessage);
    }
  }
}
