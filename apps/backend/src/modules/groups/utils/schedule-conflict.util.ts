/**
 * Pure helpers for detecting scheduling conflicts between academic groups.
 *
 * A conflict happens when two schedule slots fall on the SAME day of week AND
 * their [start, end) time intervals overlap — regardless of location.
 *
 * This mirrors the frontend logic in
 * `apps/web/src/features/schedules/utils/time.utils.ts` so both layers agree.
 */

export interface ScheduleLike {
  dayOfWeek: number;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
}

export interface GroupWithSchedulesLike {
  id: string;
  name: string;
  schedules?: ScheduleLike[] | null;
}

export interface ScheduleConflictResult {
  group: GroupWithSchedulesLike;
  dayOfWeek: number;
  existingSlot: ScheduleLike;
  candidateSlot: ScheduleLike;
}

export const DAY_NAMES_AR = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

/**
 * Parses a time string to minutes from midnight.
 * Supports 24h "HH:MM" (what the group form sends), 12h "HH:MM AM/PM", and
 * Arabic "HH:MM ص/م". Returns null when unparseable.
 */
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();

  // Arabic format (e.g. "05:00 م")
  if (clean.includes('م') || clean.includes('ص')) {
    const match = clean.match(/(\d{1,2}):(\d{2})\s*(م|ص)?/);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const isPM = match[3] === 'م';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return h * 60 + m;
  }

  // 24h or AM/PM format
  const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
  if (!match) return null;

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();

  if (meridian === 'PM' && h < 12) h += 12;
  if (meridian === 'AM' && h === 12) h = 0;

  return h * 60 + m;
}

/**
 * Whether two intervals [startA, endA) and [startB, endB) overlap in time.
 * When an end time is missing/invalid, falls back to a 1-minute slot so two
 * slots only clash if they start at the exact same minute.
 */
export function doTimeIntervalsOverlap(
  startA?: string | null,
  endA?: string | null,
  startB?: string | null,
  endB?: string | null,
): boolean {
  const sA = parseTimeToMinutes(startA);
  const sB = parseTimeToMinutes(startB);
  if (sA === null || sB === null) return false;

  const eA = parseTimeToMinutes(endA);
  const eB = parseTimeToMinutes(endB);

  // If BOTH slots have no usable endTime, they only clash on identical start
  if ((eA === null || eA <= sA) && (eB === null || eB <= sB)) {
    return sA === sB;
  }

  const resolvedEA = eA !== null && eA > sA ? eA : sA + 1;
  const resolvedEB = eB !== null && eB > sB ? eB : sB + 1;

  return sA < resolvedEB && sB < resolvedEA;
}

/**
 * Formats a "HH:MM"-ish string to Arabic 12-hour (e.g. "05:00 م"). Best-effort:
 * returns the original string when it can't be parsed.
 */
export function formatArabicTime12H(timeStr?: string | null): string {
  const minutes = parseTimeToMinutes(timeStr);
  if (minutes === null) return timeStr?.trim() || '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Finds the first schedule slot in `candidateSchedules` that conflicts with any
 * slot of any group in `existingGroups`. Returns null when there is no conflict.
 *
 * Callers are responsible for pre-filtering `existingGroups` by teacher,
 * academic year/term, active status, and excluding the group being edited.
 */
export function findScheduleConflict(
  existingGroups: GroupWithSchedulesLike[],
  candidateSchedules: ScheduleLike[] | null | undefined,
): ScheduleConflictResult | null {
  if (!candidateSchedules?.length) return null;

  for (const group of existingGroups || []) {
    const existingSchedules = group.schedules || [];
    for (const existingSlot of existingSchedules) {
      for (const candidateSlot of candidateSchedules) {
        if (existingSlot.dayOfWeek !== candidateSlot.dayOfWeek) continue;
        if (
          doTimeIntervalsOverlap(
            candidateSlot.startTime,
            candidateSlot.endTime,
            existingSlot.startTime,
            existingSlot.endTime,
          )
        ) {
          return {
            group,
            dayOfWeek: existingSlot.dayOfWeek,
            existingSlot,
            candidateSlot,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Builds a user-facing Arabic message describing a detected schedule conflict.
 */
export function buildConflictMessage(conflict: ScheduleConflictResult): string {
  const dayName = DAY_NAMES_AR[conflict.dayOfWeek] ?? '';
  const start = formatArabicTime12H(conflict.existingSlot.startTime);
  const end = formatArabicTime12H(conflict.existingSlot.endTime);
  const range = start && end ? `${start} - ${end}` : start || end || '';
  const timePart = range ? ` (${range})` : '';
  return `⛔ فيه تعارض في المواعيد مع مجموعة «${conflict.group.name}» يوم ${dayName}${timePart}. برجاء اختيار موعد مختلف.`;
}
