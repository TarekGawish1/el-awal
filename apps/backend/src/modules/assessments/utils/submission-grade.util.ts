import { SubmissionStatus } from '@prisma/client';

/**
 * Resolves the single "official" submission out of a student's attempt history.
 *
 * Grade policy = HIGHEST score: among graded attempts, the one with the maximum
 * `scoreObtained` wins (ties broken by the later attempt). If no attempt has been
 * graded yet (e.g. essays awaiting the teacher), the latest attempt is returned so
 * callers can still surface the pending state.
 *
 * Kept as a standalone pure function so every consumer (assessments read path,
 * course/lesson viewers, teacher & parent aggregates) resolves the official grade
 * identically.
 */
export function resolveOfficialSubmission<
  T extends {
    status: SubmissionStatus;
    scoreObtained: unknown;
    attemptNumber: number;
  },
>(submissions: T[]): T | null {
  if (!submissions || submissions.length === 0) return null;

  const graded = submissions.filter(
    (s) => s.status === SubmissionStatus.GRADED && s.scoreObtained != null,
  );

  if (graded.length > 0) {
    return graded.reduce((best, cur) => {
      const bestScore = Number(best.scoreObtained);
      const curScore = Number(cur.scoreObtained);
      if (curScore > bestScore) return cur;
      if (curScore === bestScore && cur.attemptNumber > best.attemptNumber)
        return cur;
      return best;
    });
  }

  return submissions.reduce((latest, cur) =>
    cur.attemptNumber > latest.attemptNumber ? cur : latest,
  );
}

/**
 * Groups a flat list of submissions (spanning many assessments) by `assessmentId`.
 *
 * Aggregate consumers (parent academic average, teacher gradebook) receive every
 * attempt row now that retakes are allowed. Grouping first, then applying
 * {@link resolveOfficialSubmission} per group, yields exactly one official (highest)
 * attempt per assessment — so a student who retook a quiz is counted once, at their
 * best score, instead of being summed across attempts.
 */
export function groupSubmissionsByAssessment<
  T extends { assessmentId: string },
>(submissions: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const s of submissions) {
    const existing = map.get(s.assessmentId);
    if (existing) existing.push(s);
    else map.set(s.assessmentId, [s]);
  }
  return map;
}
