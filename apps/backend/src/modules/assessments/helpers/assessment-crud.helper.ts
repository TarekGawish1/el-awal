import { AssessmentType } from '@prisma/client';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';

export function buildUpdateAssessmentData(dto: UpdateAssessmentDto) {
  const rawStartTime =
    dto.startTime !== undefined ? dto.startTime : dto.startDate;
  const rawEndTime =
    dto.endTime !== undefined
      ? dto.endTime
      : dto.deadline !== undefined
        ? dto.deadline
        : dto.dueDate;
  const startTimeDate =
    rawStartTime !== undefined
      ? rawStartTime
        ? new Date(rawStartTime)
        : null
      : undefined;
  const endTimeDate =
    rawEndTime !== undefined
      ? rawEndTime
        ? new Date(rawEndTime)
        : null
      : undefined;

  return {
    ...(dto.title !== undefined && { title: dto.title }),
    ...(dto.description !== undefined && { description: dto.description }),
    ...(dto.timingType !== undefined && { timingType: dto.timingType }),
    ...(dto.durationMinutes !== undefined && {
      durationMinutes: dto.durationMinutes,
    }),
    ...(startTimeDate !== undefined && {
      startTime: startTimeDate,
      startDate: startTimeDate,
    }),
    ...(endTimeDate !== undefined && {
      endTime: endTimeDate,
      dueDate: endTimeDate,
      deadline: endTimeDate,
    }),
    ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
    ...(dto.allowMultipleAttempts !== undefined && {
      allowMultipleAttempts: dto.allowMultipleAttempts,
    }),
    ...(dto.isOptional !== undefined && { isOptional: dto.isOptional }),
    ...(dto.requirePassingScore !== undefined && {
      requirePassingScore: dto.requirePassingScore,
      ...(dto.requirePassingScore && dto.allowMultipleAttempts === undefined && { allowMultipleAttempts: true }),
    }),
    ...(dto.courseId !== undefined && { courseId: dto.courseId || null }),
    ...(dto.lessonId !== undefined && { lessonId: dto.lessonId || null }),
    ...(dto.assessmentType !== undefined && {
      assessmentType: dto.assessmentType,
      type:
        dto.assessmentType === AssessmentType.HOMEWORK
          ? AssessmentType.ASSIGNMENT
          : dto.assessmentType === AssessmentType.QUIZ
            ? AssessmentType.EXAM
            : dto.assessmentType,
    }),
  };
}

export async function deleteAssessmentCascade(params: {
  prisma: any;
  storageService?: any;
  logger: any;
  assessmentId: string;
}) {
  const { prisma, storageService, logger, assessmentId } = params;

  await prisma.course.updateMany({
    where: { courseQuizId: assessmentId },
    data: { courseQuizId: null },
  });
  await prisma.courseModule.updateMany({
    where: { unitQuizId: assessmentId },
    data: { unitQuizId: null },
  });
  await prisma.courseLesson.updateMany({
    where: { lessonQuizId: assessmentId },
    data: { lessonQuizId: null },
  });

  const submissions = await prisma.assessmentSubmission.findMany({
    where: { assessmentId },
    select: { id: true, attachmentUrl: true, fileKey: true },
  });

  const questions = await prisma.assessmentQuestion.findMany({
    where: { assessmentId },
    select: { id: true, imageUrl: true, optionImages: true },
  });

  const filesToDelete: string[] = [];
  for (const q of questions) {
    if (q.imageUrl) filesToDelete.push(q.imageUrl);
    if (Array.isArray(q.optionImages)) {
      for (const optImg of q.optionImages) {
        if (typeof optImg === 'string' && optImg.trim()) {
          filesToDelete.push(optImg.trim());
        }
      }
    }
  }
  for (const s of submissions) {
    if (s.attachmentUrl) filesToDelete.push(s.attachmentUrl);
    if (s.fileKey) filesToDelete.push(s.fileKey);
  }

  if (filesToDelete.length > 0 && storageService) {
    storageService.deleteObjects(filesToDelete).catch((err: any) => {
      logger.warn(
        `Failed to delete storage objects for assessment [${assessmentId}]: ${err?.message}`,
      );
    });
  }

  if (submissions.length > 0) {
    const subIds = submissions.map((s: any) => s.id);
    await prisma.studentAnswer.deleteMany({
      where: { submissionId: { in: subIds } },
    });
    await prisma.assessmentSubmission.deleteMany({
      where: { assessmentId },
    });
  }

  await prisma.assessmentQuestion.deleteMany({
    where: { assessmentId },
  });

  await prisma.assessment.delete({
    where: { id: assessmentId },
  });
}
