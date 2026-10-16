import { CreateAssessmentFormData } from '../types/assessments.schema';

export function buildAssessmentPayload(
  data: CreateAssessmentFormData,
  isPublished: boolean,
  type: 'EXAM' | 'ASSIGNMENT',
  courseLinkScope: string | null,
  paramCourseId: string | null,
  paramModuleId: string | null,
  paramLessonId: string | null
) {
  const payloadQuestions = data.questions.map((q, idx) => {
    const { displayOrder, ...rest } = q;
    return { ...rest, questionNumber: idx + 1 };
  });

  const calculatedTotal = payloadQuestions.reduce(
    (sum, q) => sum + (Number(q.points) || 0),
    0
  );

  const payload: any = {
    ...data,
    type,
    isPublished,
    questions: payloadQuestions,
    totalScore:
      calculatedTotal > 0 ? calculatedTotal : Number(data.totalScore) || 10,
    requirePassingScore: Boolean(data.requirePassingScore),
    allowMultipleAttempts: data.requirePassingScore
      ? data.allowMultipleAttempts ?? true
      : Boolean(data.allowMultipleAttempts),
  };

  if (
    !payload.passingScore ||
    Number(payload.passingScore) > payload.totalScore
  ) {
    payload.passingScore = Math.max(0.5, Math.round(payload.totalScore * 0.5));
  }

  if (type === 'ASSIGNMENT') {
    delete payload.durationMinutes;
    delete payload.startDate;
    delete payload.startTime;
    delete payload.endTime;
    delete payload.timingType;
  } else {
    if (payload.startTime) {
      payload.startDate = payload.startTime;
    }
    if (payload.endTime) {
      payload.dueDate = payload.endTime;
      payload.deadline = payload.endTime;
    }
    if (!payload.startDate) delete payload.startDate;
    if (!payload.startTime) delete payload.startTime;
    if (!payload.endTime) delete payload.endTime;
    if (!payload.durationMinutes) delete payload.durationMinutes;
  }

  if (!payload.dueDate) delete payload.dueDate;
  if (!payload.academicStage) delete payload.academicStage;
  if (!payload.gradeLevel) delete payload.gradeLevel;
  if (!payload.targetGroupIds || payload.targetGroupIds.length === 0)
    delete payload.targetGroupIds;
  if (!payload.courseId) delete payload.courseId;

  if (courseLinkScope && paramCourseId) {
    payload.courseId = paramCourseId;
    payload.courseLinkScope = courseLinkScope;
    if (courseLinkScope === 'UNIT' && paramModuleId) {
      payload.moduleId = paramModuleId;
    } else if (courseLinkScope === 'LESSON' && paramLessonId) {
      payload.moduleId = paramModuleId;
      payload.lessonId = paramLessonId;
    }
  }

  delete payload.isAutoGraded;

  [
    'groupId',
    'courseId',
    'moduleId',
    'lessonId',
    'courseLinkScope',
    'startTime',
    'endTime',
    'startDate',
    'dueDate',
    'deadline',
    'academicStage',
    'gradeLevel',
    'description',
  ].forEach((key) => {
    if (
      payload[key] === '' ||
      payload[key] === null ||
      payload[key] === undefined
    ) {
      delete payload[key];
    }
  });

  return payload;
}
