-- Add logical assessment naming and the canonical deadline used by alert jobs.
ALTER TYPE "assessment_type" ADD VALUE IF NOT EXISTS 'HOMEWORK';
ALTER TYPE "assessment_type" ADD VALUE IF NOT EXISTS 'QUIZ';

ALTER TABLE "assessments"
  ADD COLUMN IF NOT EXISTS "assessment_type" "assessment_type" NOT NULL DEFAULT 'ASSIGNMENT',
  ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMPTZ(6);

UPDATE "assessments"
SET "deadline" = "due_date"
WHERE "deadline" IS NULL AND "due_date" IS NOT NULL;

ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'NEW_HOMEWORK_ASSIGNED';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'NEW_EXAM_PUBLISHED';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'HOMEWORK_DEADLINE_REMINDER';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'EXAM_DEADLINE_REMINDER';
