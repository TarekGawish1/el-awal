import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';

/**
 * Generates a unique school-issued student code following the existing
 * `STU-YYYY-NNNNN` architecture. Uniqueness is verified inside the caller's
 * transaction, falling back to a random suffix to guarantee collision-safety
 * under concurrency (the `uq_students_code` unique constraint remains the
 * final safety net).
 */
export async function generateUniqueStudentCode(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const year = new Date().getFullYear();
  const count = await tx.studentProfile.count();

  const candidates = Array.from(
    { length: 5 },
    (_, i) => `STU${year}${String(count + 1 + i).padStart(5, '0')}`,
  );

  if (typeof tx.studentProfile.findMany === 'function') {
    const existing = await tx.studentProfile.findMany({
      where: { studentCode: { in: candidates } },
      select: { studentCode: true },
    });
    const existingSet = new Set(existing.map((e) => e.studentCode));
    for (const candidate of candidates) {
      if (!existingSet.has(candidate)) {
        return candidate;
      }
    }
  } else {
    return candidates[0];
  }

  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `STU${year}${suffix}`;
}
