/**
 * Shared scoping rules for the student dashboard "أحدث الاختبارات" tile and the
 * "الاختبارات القادمة" KPI:
 * - Only physical (onsite) group exams: online course/lesson quizzes are excluded.
 * - Only EXAM type: homework (ASSIGNMENT/HOMEWORK) is surfaced in its own fixture.
 * - Hide any item whose submission deadline (dueDate) has already passed.
 */
export function filterUpcomingGroupExams(assessments: any[]): any[] {
  const now = Date.now();
  return (assessments || []).filter((a) => {
    if (!a || a.courseId || a.lessonId) return false;
    if (!(a.group || (a.targetGroups && a.targetGroups.length > 0))) return false;
    if (a.type !== 'EXAM') return false;
    const cutoff = a.endTime || a.dueDate || a.deadline;
    if (cutoff && new Date(cutoff).getTime() < now) return false;
    return true;
  });
}
