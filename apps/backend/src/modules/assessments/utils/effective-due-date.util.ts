/**
 * Effective deadline resolution for session-linked homework (ASSIGNMENT type).
 *
 * The teacher creates a session homework from a lesson-session card; for legacy
 * records the stored `dueDate` may still point at the session's own day instead
 * of the next session, which makes the homework appear expired immediately.
 * Rule: when the raw `dueDate` is earlier than the start time of the session it
 * is attached to (matched by date), the effective deadline becomes the start
 * time of the NEXT session of the same group; otherwise the raw value stands.
 */
export interface SessionForDeadline {
  sessionDate: Date;
  startTime?: string | null;
  endTime?: string | null;
  isCancelled?: boolean;
}

export function getSessionStartMillis(session: SessionForDeadline): number {
  const base = new Date(session.sessionDate);
  const time = session.startTime || session.endTime;
  if (time) {
    const [h, m] = time.split(':').map(Number);
    if (!isNaN(h)) base.setHours(h, m, 0, 0);
  }
  return base.getTime();
}

export function computeEffectiveDueDate(
  assessmentType: string,
  rawDueDate: Date | null,
  groupSessions: SessionForDeadline[],
): Date | null {
  if (assessmentType !== 'ASSIGNMENT' || !rawDueDate) return rawDueDate;

  const dateKey = (d: Date) => d.toISOString().slice(0, 10);
  const rawKey = dateKey(rawDueDate);

  const attached = groupSessions.find(
    (s) => dateKey(new Date(s.sessionDate)) === rawKey,
  );
  if (!attached) return rawDueDate;

  const attachedStart = getSessionStartMillis(attached);

  // If rawDueDate is already set to the start time of a future session, keep it
  const isFutureSessionStart =
    rawDueDate.getTime() === attachedStart &&
    groupSessions.some((s) => getSessionStartMillis(s) < attachedStart);
  if (isFutureSessionStart) {
    return rawDueDate;
  }

  const next = groupSessions
    .filter((s) => !s.isCancelled && getSessionStartMillis(s) > attachedStart)
    .sort((a, b) => getSessionStartMillis(a) - getSessionStartMillis(b))[0];

  if (next) {
    return new Date(getSessionStartMillis(next));
  }

  if (rawDueDate.getTime() > attachedStart) {
    return rawDueDate;
  }

  // If no future session exists in the schedule, default to 7 days after the attached session
  const fallbackDate = new Date(attachedStart);
  fallbackDate.setDate(fallbackDate.getDate() + 7);
  return fallbackDate;
}
