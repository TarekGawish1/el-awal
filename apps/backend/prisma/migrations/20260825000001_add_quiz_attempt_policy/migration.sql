-- AlterTable: per-quiz attempt policy (single vs. multiple attempts)
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "allow_multiple_attempts" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: track the attempt number per submission (full attempt history)
ALTER TABLE "assessment_submissions" ADD COLUMN IF NOT EXISTS "attempt_number" INTEGER NOT NULL DEFAULT 1;

-- Swap the single-submission unique constraint for one scoped by attempt number.
-- Existing rows keep attempt_number = 1, so they remain valid under the new constraint.
ALTER TABLE "assessment_submissions" DROP CONSTRAINT IF EXISTS "uq_assessment_student";
ALTER TABLE "assessment_submissions" ADD CONSTRAINT "uq_assessment_student_attempt" UNIQUE ("assessment_id", "student_id", "attempt_number");
