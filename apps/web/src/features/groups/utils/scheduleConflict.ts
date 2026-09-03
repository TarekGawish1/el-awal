import { doTimeIntervalsOverlap, formatArabicTimeRangeCompact } from '@/features/schedules/utils/time.utils';
import { Group, GroupSchedule } from '../types/groups.types';

const DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const DEFAULT_ACADEMIC_YEAR = '2026-2027';
const DEFAULT_ACADEMIC_TERM = 'FIRST_TERM';

export interface GroupScheduleConflict {
  group: Group;
  dayOfWeek: number;
  existingSchedule: GroupSchedule;
  candidateSchedule: GroupSchedule;
}

interface ConflictCandidate {
  schedules?: GroupSchedule[];
  academicYear?: string;
  academicTerm?: string;
}

/**
 * Finds the first schedule slot of `candidate` that clashes (same day of week +
 * overlapping time) with any active group in `existingGroups` — scoped to the
 * same academic year + term. Location is intentionally ignored (a teacher can't
 * be in two places at once).
 *
 * Reuses the shared {@link doTimeIntervalsOverlap} time-overlap logic.
 */
export function findGroupScheduleConflict(
  candidate: ConflictCandidate,
  existingGroups: Group[] | undefined,
  options: { excludeGroupId?: string } = {},
): GroupScheduleConflict | null {
  const candidateSchedules = candidate.schedules;
  if (!candidateSchedules?.length || !existingGroups?.length) return null;

  const candYear = candidate.academicYear || DEFAULT_ACADEMIC_YEAR;
  const candTerm = candidate.academicTerm || DEFAULT_ACADEMIC_TERM;

  for (const group of existingGroups) {
    if (options.excludeGroupId && group.id === options.excludeGroupId) continue;

    // Only groups running at the same real time can conflict.
    const groupYear = group.academicYear || DEFAULT_ACADEMIC_YEAR;
    const groupTerm = group.academicTerm || DEFAULT_ACADEMIC_TERM;
    if (groupYear !== candYear || groupTerm !== candTerm) continue;

    for (const existingSchedule of group.schedules || []) {
      for (const candidateSchedule of candidateSchedules) {
        if (existingSchedule.dayOfWeek !== candidateSchedule.dayOfWeek) continue;
        if (
          doTimeIntervalsOverlap(
            candidateSchedule.startTime,
            candidateSchedule.endTime,
            existingSchedule.startTime,
            existingSchedule.endTime,
          )
        ) {
          return {
            group,
            dayOfWeek: existingSchedule.dayOfWeek,
            existingSchedule,
            candidateSchedule,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Builds a user-facing Arabic message for a detected schedule conflict.
 */
export function describeConflict(conflict: GroupScheduleConflict): string {
  const dayName = DAY_NAMES_AR[conflict.dayOfWeek] ?? '';
  const range = formatArabicTimeRangeCompact(
    conflict.existingSchedule.startTime,
    conflict.existingSchedule.endTime,
  );
  const timePart = range ? ` (${range})` : '';
  return `⛔ فيه تعارض في المواعيد مع مجموعة «${conflict.group.name}» يوم ${dayName}${timePart}. برجاء اختيار موعد مختلف.`;
}
