/**
 * Shared scoping rules for the student dashboard "أحدث الاختبارات" tile and the
 * "الاختبارات القادمة" KPI:
 * - Only physical (onsite) group exams: online course/lesson quizzes are excluded.
 * - Only EXAM type: homework (ASSIGNMENT/HOMEWORK) is surfaced in its own fixture.
 * - Hide any item whose submission deadline (dueDate) has already passed.
 */
export function filterUpcomingGroupExams(assessments: any[]): any[] {
  const now = Date.now();
  return (assessments || []).filter(
    (a) =>
      a &&
      !a.courseId &&
      !a.lessonId &&
      (a.group || (a.targetGroups && a.targetGroups.length > 0)) &&
      a.type === 'EXAM' &&
      !(a.dueDate && new Date(a.dueDate).getTime() < now),
  );
}
