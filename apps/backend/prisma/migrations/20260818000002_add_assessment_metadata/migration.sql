-- AlterTable: Add academic_stage, grade_level, and start_date to assessments
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "academic_stage" VARCHAR(50);
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "grade_level" VARCHAR(50);
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMPTZ(6);
