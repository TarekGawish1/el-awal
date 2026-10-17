import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AiModerationService } from '../../../integrations/ai/ai-moderation.service';
import {
  CreateQuestionDto,
  CreateQuestionReplyDto,
  UpdateQuestionDto,
  UpdateQuestionReplyDto,
} from '../dto/lesson-qa.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Injectable()
export class CourseQaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiModeration: AiModerationService,
  ) {}

  /**
   * Fetches timestamped Q&A questions for a lesson with threaded replies.
   */
  async getLessonQuestions(lessonId: string) {
    const questions = await this.prisma.lessonQuestion.findMany({
      where: { lessonId },
      orderBy: [{ videoTimestamp: 'asc' }, { createdAt: 'desc' }],
      include: {
        student: {
          include: {
            user: { select: { id: true, fullName: true, role: true } },
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return questions.map((q) => ({
      id: q.id,
      content: q.content,
      videoTimestamp: q.videoTimestamp,
      lessonId: q.lessonId,
      studentId: q.studentId,
      studentUserId: q.student?.user?.id || q.studentId,
      studentName: q.student?.user?.fullName || 'طالب مسجل',
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      replies: q.replies,
    }));
  }

  /**
   * Submits a timestamped question on a video lesson.
   */
  async createLessonQuestion(
    lessonId: string,
    user: AuthenticatedUser,
    dto: CreateQuestionDto,
  ) {
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('نص السؤال مطلوب');
    }

    await this.aiModeration.assertValidContent(dto.content);

    let studentProfile = null;

    if (user.studentProfileId) {
      studentProfile = await this.prisma.studentProfile.findUnique({
        where: { id: user.studentProfileId },
        include: { user: { select: { fullName: true } } },
      });
    }

    if (!studentProfile) {
      studentProfile = await this.prisma.studentProfile.findUnique({
        where: { id: user.id },
        include: { user: { select: { fullName: true } } },
      });
    }

    // If user is a Teacher or Secretariat previewing or testing the learning room,
    // ensure a student profile exists for this user so FK constraints are respected.
    if (!studentProfile) {
      const existingUser = await this.prisma.user.findUnique({
        where: { id: user.id },
      });

      if (existingUser) {
        studentProfile = await this.prisma.studentProfile.create({
          data: {
            id: user.id,
            studentCode: `T-${user.id.slice(0, 6)}`,
            qrCodeToken: `qr_tok_${user.id.replace(/-/g, '')}`,
            gradeLevel: 'المعلم - معاينة',
            academicStage: 'SECONDARY',
          },
          include: { user: { select: { fullName: true } } },
        });
      } else {
        studentProfile = await this.prisma.studentProfile.findFirst({
          include: { user: { select: { fullName: true } } },
        });
      }
    }

    if (!studentProfile) {
      throw new NotFoundException('تعذر العثور على الملف التعريفي للطالب');
    }

    const timestamp =
      dto.videoTimestamp !== undefined && dto.videoTimestamp !== null
        ? Math.floor(Number(dto.videoTimestamp))
        : null;

    const question = await this.prisma.lessonQuestion.create({
      data: {
        lessonId,
        studentId: studentProfile.id,
        content: dto.content.trim(),
        videoTimestamp: timestamp !== null && !isNaN(timestamp) && timestamp >= 0 ? timestamp : null,
      },
      include: {
        student: {
          include: { user: { select: { id: true, fullName: true } } },
        },
        replies: true,
      },
    });

    return {
      id: question.id,
      content: question.content,
      videoTimestamp: question.videoTimestamp,
      lessonId: question.lessonId,
      studentId: question.studentId,
      studentUserId: question.student?.user?.id || user.id,
      studentName: question.student?.user?.fullName || user.email || 'طالب مسجل',
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      replies: [],
    };
  }

  /**
   * Updates an existing lesson question (author or instructor).
   */
  async updateLessonQuestion(
    questionId: string,
    user: AuthenticatedUser,
    dto: UpdateQuestionDto,
  ) {
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('نص السؤال مطلوب');
    }

    await this.aiModeration.assertValidContent(dto.content);

    const question = await this.prisma.lessonQuestion.findUnique({
      where: { id: questionId },
      include: {
        student: {
          include: { user: { select: { id: true } } },
        },
        lesson: {
          include: { module: { include: { course: true } } },
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`السؤال غير موجود [${questionId}]`);
    }

    const course = question.lesson.module.course;
    const isAuthor =
      question.student?.user?.id === user.id ||
      question.studentId === user.studentProfileId ||
      question.studentId === user.id;
    const isTeacher =
      user.role === UserRole.TEACHER &&
      (course.teacherId === user.teacherProfileId || course.teacherId === user.id);
    const isSecretariat = user.role === UserRole.SECRETARIAT;

    if (!isAuthor && !isTeacher && !isSecretariat) {
      throw new ForbiddenException('ليس لديك صلاحية لتعديل هذا السؤال');
    }

    return this.prisma.lessonQuestion.update({
      where: { id: questionId },
      data: { content: dto.content.trim() },
    });
  }

  /**
   * Deletes a lesson question and all its replies (author, instructor, or secretariat).
   */
  async deleteLessonQuestion(questionId: string, user: AuthenticatedUser) {
    const question = await this.prisma.lessonQuestion.findUnique({
      where: { id: questionId },
      include: {
        student: {
          include: { user: { select: { id: true } } },
        },
        lesson: {
          include: { module: { include: { course: true } } },
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`السؤال غير موجود [${questionId}]`);
    }

    const course = question.lesson.module.course;
    const isAuthor =
      question.student?.user?.id === user.id ||
      question.studentId === user.studentProfileId ||
      question.studentId === user.id;
    const isTeacher =
      user.role === UserRole.TEACHER &&
      (course.teacherId === user.teacherProfileId || course.teacherId === user.id);
    const isSecretariat = user.role === UserRole.SECRETARIAT;

    if (!isAuthor && !isTeacher && !isSecretariat) {
      throw new ForbiddenException('ليس لديك صلاحية لحذف هذا السؤال');
    }

    return this.prisma.lessonQuestion.delete({
      where: { id: questionId },
    });
  }

  /**
   * Adds a reply to a student's timestamped question.
   */
  async createQuestionReply(
    questionId: string,
    user: AuthenticatedUser,
    dto: CreateQuestionReplyDto,
  ) {
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('نص الرد مطلوب');
    }

    await this.aiModeration.assertValidContent(dto.content);

    const question = await this.prisma.lessonQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      throw new NotFoundException(`السؤال غير موجود [${questionId}]`);
    }

    const author = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { fullName: true },
    });
    const authorName = author?.fullName || user.email || 'مستخدم المنصة';

    return this.prisma.lessonQuestionReply.create({
      data: {
        questionId,
        content: dto.content.trim(),
        authorId: user.id,
        authorRole: user.role,
        authorName,
      },
    });
  }

  /**
   * Updates an existing Q&A reply (author or instructor).
   */
  async updateQuestionReply(
    replyId: string,
    user: AuthenticatedUser,
    dto: UpdateQuestionReplyDto,
  ) {
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('نص الرد مطلوب');
    }

    await this.aiModeration.assertValidContent(dto.content);

    const reply = await this.prisma.lessonQuestionReply.findUnique({
      where: { id: replyId },
      include: {
        question: {
          include: {
            lesson: {
              include: { module: { include: { course: true } } },
            },
          },
        },
      },
    });

    if (!reply) {
      throw new NotFoundException(`الرد غير موجود [${replyId}]`);
    }

    const course = reply.question.lesson.module.course;
    const isAuthor = reply.authorId === user.id;
    const isTeacher =
      user.role === UserRole.TEACHER &&
      (course.teacherId === user.teacherProfileId || course.teacherId === user.id);
    const isSecretariat = user.role === UserRole.SECRETARIAT;

    if (!isAuthor && !isTeacher && !isSecretariat) {
      throw new ForbiddenException('ليس لديك صلاحية لتعديل هذا الرد');
    }

    return this.prisma.lessonQuestionReply.update({
      where: { id: replyId },
      data: { content: dto.content.trim() },
    });
  }

  /**
   * Deletes an existing Q&A reply (author, instructor, or secretariat).
   */
  async deleteQuestionReply(replyId: string, user: AuthenticatedUser) {
    const reply = await this.prisma.lessonQuestionReply.findUnique({
      where: { id: replyId },
      include: {
        question: {
          include: {
            lesson: {
              include: { module: { include: { course: true } } },
            },
          },
        },
      },
    });

    if (!reply) {
      throw new NotFoundException(`الرد غير موجود [${replyId}]`);
    }

    const course = reply.question.lesson.module.course;
    const isAuthor = reply.authorId === user.id;
    const isTeacher =
      user.role === UserRole.TEACHER &&
      (course.teacherId === user.teacherProfileId || course.teacherId === user.id);
    const isSecretariat = user.role === UserRole.SECRETARIAT;

    if (!isAuthor && !isTeacher && !isSecretariat) {
      throw new ForbiddenException('ليس لديك صلاحية لحذف هذا الرد');
    }

    return this.prisma.lessonQuestionReply.delete({
      where: { id: replyId },
    });
  }
}
