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

  for (let attempt = 0; attempt < 5; attempt++) {
    const sequenceNumber = count + 1 + attempt;
    const candidate = `STU${year}${String(sequenceNumber).padStart(5, '0')}`;
    const existing = await tx.studentProfile.findUnique({
      where: { studentCode: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }

  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `STU${year}${suffix}`;
}
